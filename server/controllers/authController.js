import User from "../models/User.js";
import Profile from "../models/Profile.js";
import OTP from "../models/OTP.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendEmail, otpMailgenContent } from "../utils/mail.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 2 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};

const generateAccessToken = (id) =>
  jwt.sign({ _id: id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });

const generateRefreshToken = (id) =>
  jwt.sign({ _id: id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

const hashOTP = (otp) => bcrypt.hash(otp, 10);

const sendAuthCookies = (res, accessToken, refreshToken) => {
  return res
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

const createAndSendOTP = async (user) => {
  const otpCode = generateOTP();
  const hashedOTP = await hashOTP(otpCode);

  // Only one active OTP per email
  await OTP.deleteMany({ email: user.email });

  await OTP.create({
    email: user.email,
    otp: hashedOTP,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
  });

  await sendEmail({
    email: user.email,
    subject: "Verify your DevConnect email",
    mailgenContent: otpMailgenContent(user.fullName, otpCode),
  });
};


const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    throw new ApiError(400, "First name, last name, email, and password are required");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const userExists = await User.findOne({ email: normalizedEmail });
  if (userExists) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    password,
    provider: "local",
    isEmailVerified: false,
  });

  await Profile.create({ user: user._id });

  await createAndSendOTP(user);

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        email: user.email,
        requiresVerification: true,
        expiresIn: "10 minutes",
      },
      "Account created. Please verify your email using the OTP sent to your inbox."
    )
  );
});

// if the user registered but did not receive the first OTP.

const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, "Email is already verified");
  }

  const recentOTP = await OTP.findOne({
    email: normalizedEmail,
    createdAt: { $gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_MS) },
  });

  if (recentOTP) {
    throw new ApiError(429, "Please wait 2 minutes before requesting another OTP");
  }

  await createAndSendOTP(user);

  return res.status(200).json(
    new ApiResponse(
      200,
      { email: user.email, expiresIn: "10 minutes" },
      "OTP sent successfully"
    )
  );
});

const resendOTP = sendOTP;


const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  if (!/^\d{6}$/.test(String(otp))) {
    throw new ApiError(400, "OTP must contain exactly 6 digits");
  }

  const normalizedEmail = email.toLowerCase().trim();

  // "+otp" is required because otp should have select: false in OTP.js
  const otpRecord = await OTP.findOne({ email: normalizedEmail }).select("+otp");

  if (!otpRecord) {
    throw new ApiError(400, "OTP not found. Please request a new OTP.");
  }

  if (otpRecord.expiresAt.getTime() < Date.now()) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new ApiError(400, "OTP has expired. Please request a new OTP.");
  }

  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new ApiError(400, "Too many failed attempts. Please request a new OTP.");
  }

  const isValid = await bcrypt.compare(String(otp), otpRecord.otp);

  if (!isValid) {
    otpRecord.attempts += 1;
    await otpRecord.save();

    const attemptsRemaining = MAX_OTP_ATTEMPTS - otpRecord.attempts;

    if (attemptsRemaining <= 0) {
      await OTP.deleteOne({ _id: otpRecord._id });
      throw new ApiError(400, "Too many failed attempts. Please request a new OTP.");
    }

    throw new ApiError(
      400,
      `Invalid OTP. ${attemptsRemaining} attempt(s) remaining.`
    );
  }

  const user = await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await OTP.deleteOne({ _id: otpRecord._id });

  // Automatically log in after successful verification
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  await User.findByIdAndUpdate(user._id, { refreshToken });

  return sendAuthCookies(res, accessToken, refreshToken)
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          user,
          token: accessToken,
          isEmailVerified: true,
        },
        "Email verified successfully"
      )
    );
});


const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(403, "This account has been deactivated");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in");
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return sendAuthCookies(res, accessToken, refreshToken)
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          token: accessToken,
        },
        "Login successful"
      )
    );
});


const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new ApiError(400, "Google ID token is required");
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.email || !payload.email_verified) {
    throw new ApiError(401, "Google did not verify this email address");
  }

  const email = payload.email.toLowerCase().trim();
  let isNewUser = false;
  let user = await User.findOne({ email });

  if (!user) {
    isNewUser = true;

    const nameParts = (payload.name || "User User").trim().split(/\s+/);
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.slice(1).join(" ") || "User";

    user = await User.create({
      firstName,
      lastName,
      email,
      password: crypto.randomBytes(32).toString("hex"),
      provider: "google",
      googleId: payload.sub,
      profilePicture: payload.picture || null,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });

    await Profile.create({ user: user._id });
  }

  if (!user.isActive) {
    throw new ApiError(403, "This account has been deactivated");
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return sendAuthCookies(res, accessToken, refreshToken)
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          token: accessToken,
          isNewUser,
        },
        isNewUser ? "Google account created successfully" : "Google login successful"
      )
    );
});


const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "No refresh token provided");
  }

  try {
    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // "+refreshToken" is required because refreshToken has select: false
    const user = await User.findById(decoded._id).select("+refreshToken");

    if (!user || user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (!user.isActive) {
      throw new ApiError(403, "This account has been deactivated");
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    return sendAuthCookies(res, newAccessToken, newRefreshToken)
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
          "Tokens refreshed"
        )
      );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Invalid or expired refresh token");
  }
});


const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// ============ Get Current User ============

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select(
      "-password -refreshToken -passwordResetToken -passwordResetExpires"
    )
    .populate("profile");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(new ApiResponse(200, user, "User fetched"));
});

export {
  registerUser,
  sendOTP,
  verifyOTP,
  resendOTP,
  loginUser,
  googleLogin,
  refreshAccessToken,
  logoutUser,
  getCurrentUser,
};