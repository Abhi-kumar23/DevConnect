// controllers/authController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import crypto from 'crypto'

// Access Token 
const generateAccessToken = (id) => {
    return jwt.sign({ _id: id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
    });
};

// Refresh Token
const generateRefreshToken = (id) => {
    return jwt.sign({ _id: id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    });
};

// Register User
const registerUser = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    console.log("register controller hit");

    if (!firstName || !lastName || !email || !password) {
        throw new ApiError(400, "All fields are required");
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new ApiError(409, "User already exists");
    }

    const user = await User.create({
        firstName,
        lastName,
        email,
        password
    });

    // Auto-create profile for new user
    await Profile.create({
        user: user._id,
        bio: "",
        headline: "",
        skills: [],
        location: "",
        social: {
            github: "",
            linkedin: "",
            twitter: "",
            portfolio: ""
        }
    });

    const createdUser = await User.findById(user._id).select("-password");

    // generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    return res
        .status(201)
        .cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        })
        .cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        })
        .json(
            new ApiResponse(201, {
                _id: createdUser._id,
                firstName: createdUser.firstName,
                lastName: createdUser.lastName,
                email: createdUser.email,
                token: accessToken,
            }, "User registered successfully")
        );
});

// Google Login
const googleLogin = asyncHandler(async (req, res) => {
    const { accessToken } = req.body;
    
    if (!accessToken) {
        throw new ApiError(400, "Access token required");
    }
    
    // Verify Google token and get user info
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
    const userInfo = await response.json();
    
    if (!userInfo.email) {
        throw new ApiError(401, "Invalid Google token");
    }
    
    // Check if user exists
    let user = await User.findOne({ email: userInfo.email });
    
    if (!user) {
        // Create new user
        const nameParts = userInfo.name?.split(' ') || ['User', 'User'];
        user = await User.create({
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(' ') || 'User',
            email: userInfo.email,
            password: crypto.randomBytes(32).toString('hex'), // Random password
            isEmailVerified: true
        });
        
        // Auto-create profile
        await Profile.create({
            user: user._id,
            bio: "",
            headline: "",
            skills: [],
            location: "",
            social: {
                github: "",
                linkedin: "",
                twitter: "",
                portfolio: ""
            }
        });
    }
    
    // Generate tokens
    const accessTokenJWT = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    user.refreshToken = refreshToken;
    await user.save();
    
    return res
        .status(200)
        .cookie("accessToken", accessTokenJWT, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        })
        .cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        })
        .json(
            new ApiResponse(200, {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                token: accessTokenJWT,
            }, "Google login successful")
        );
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
        throw new ApiError(401, "Invalid credentials");
    }

    // generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    return res
        .status(200)
        .cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        })
        .cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        })
        .json(
            new ApiResponse(200, {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profilePicture: user.profilePicture,
                token: accessToken,
            }, "Login successful")
        );
});

// Get Current User
const getCurrentUser = asyncHandler(async (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const user = await User.findById(req.user._id).select("-password -refreshToken");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    res.status(200).json(
        new ApiResponse(200, user, "User fetched successfully")
    );
});

// Refresh Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "No refresh token");
    }

    const decoded = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decoded._id);

    if (!user || user.refreshToken !== incomingRefreshToken) {
        throw new ApiError(401, "Invalid refresh token");
    }

    const newAccessToken = generateAccessToken(user._id);

    return res
        .cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        })
        .json(
            new ApiResponse(200, { accessToken: newAccessToken }, "Token refreshed")
        );
});

// Logout
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        refreshToken: null,
    });

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res
        .status(200)
        .json(new ApiResponse(200, {}, "Logged out successfully"));
});

export {
    registerUser,
    loginUser,
    getCurrentUser,
    refreshAccessToken,
    logoutUser,
    googleLogin,
};

// // controllers/authController.js
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiError } from "../utils/ApiError.js";
// import User from "../models/User.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import jwt from "jsonwebtoken";

// // Access Token 
// const generateAccessToken = (id) => {
//     return jwt.sign({ _id: id }, process.env.ACCESS_TOKEN_SECRET, {
//         expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
//     });
// };

// //  Refresh Token
// const generateRefreshToken = (id) => {
//     return jwt.sign({ _id: id }, process.env.REFRESH_TOKEN_SECRET, {
//         expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
//     });
// };


// // Register User
// const registerUser = asyncHandler(async (req, res, next) => {
//     const { firstName, lastName, email, password } = req.body;
//     console.log("register controller hit");

//     if (!firstName || !lastName || !email || !password) {
//         throw new ApiError(400, "All fields are required");
//     }

//     const userExists = await User.findOne({ email });
//     if (userExists) {
//         throw new ApiError(409, "User already exists");
//     }

//     const user = await User.create({
//         firstName,
//         lastName,
//         email,
//         password
//     });

//     const createdUser = await User.findById(user._id).select("-password");
//     // Auto-create profile for new user
//     await Profile.create({
//         user: user._id,
//         bio: "",
//         headline: "",
//         skills: [],
//         location: "",
//         social: {
//             github: "",
//             linkedin: "",
//             twitter: "",
//             portfolio: ""
//         }
//     });

//     // generate tokens
//     const accessToken = generateAccessToken(user._id);
//     const refreshToken = generateRefreshToken(user._id);

//     // save refresh token in DB
//     user.refreshToken = refreshToken;
//     await user.save();

//     return res
//         .status(201)
//         .cookie("accessToken", accessToken, {
//             httpOnly: true,
//             secure: false,
//         })
//         .cookie("refreshToken", refreshToken, {
//             httpOnly: true,
//             secure: false,
//         })
//         .json(
//             new ApiResponse(201, {
//                 _id: createdUser._id,
//                 firstName: createdUser.firstName,
//                 lastName: createdUser.lastName,
//                 email: createdUser.email,
//                 token: accessToken,
//             }, "User registered successfully")
//         );
//     next(err);
// });

// // Login User
// const loginUser = asyncHandler(async (req, res) => {
//     const { email, password } = req.body;

//     if (!email || !password) {
//         throw new ApiError(400, "Email and password are required");
//     }

//     const user = await User.findOne({ email }).select("+password");

//     if (!user || !(await user.comparePassword(password))) {
//         throw new ApiError(401, "Invalid credentials");
//     }

//     // generate tokens
//     const accessToken = generateAccessToken(user._id);
//     const refreshToken = generateRefreshToken(user._id);

//     //  save refresh token
//     user.refreshToken = refreshToken;
//     await user.save();


//     return res
//         .status(200)
//         .cookie("accessToken", accessToken, {
//             httpOnly: true,
//             secure: false,
//         })
//         .cookie("refreshToken", refreshToken, {
//             httpOnly: true,
//             secure: false,
//         })
//         .json(
//             new ApiResponse(200, {
//                 _id: user._id,
//                 firstName: user.firstName,
//                 lastName: user.lastName,
//                 email: user.email,
//                 profilePicture: user.profilePicture,
//                 token: accessToken,
//             }, "Login successful")
//         );
// });

// // Get Current User
// const getCurrentUser = asyncHandler(async (req, res) => {
//     if (!req.user || !req.user.id) {
//         return res.status(401).json({
//             message: "Unauthorized"
//         });
//     }

//     const user = await User.findById(req.user.id).select("-password");

//     if (!user) {
//         throw new ApiError(404, "User not found");
//     }

//     res.status(200).json(
//         new ApiResponse(200, user, "User fetched successfully")
//     );
// });

// //
// const refreshAccessToken = asyncHandler(async (req, res) => {
//     const incomingRefreshToken = req.cookies?.refreshToken;

//     if (!incomingRefreshToken) {
//         throw new ApiError(401, "No refresh token");
//     }

//     const decoded = jwt.verify(
//         incomingRefreshToken,
//         process.env.REFRESH_TOKEN_SECRET
//     );

//     const user = await User.findById(decoded._id);

//     if (!user || user.refreshToken !== incomingRefreshToken) {
//         throw new ApiError(401, "Invalid refresh token");
//     }

//     const newAccessToken = generateAccessToken(user._id);

//     return res
//         .cookie("accessToken", newAccessToken, {
//             httpOnly: true,
//             secure: false,
//         })
//         .json(
//             new ApiResponse(200, { accessToken: newAccessToken }, "Token refreshed")
//         );
// });


// // Logout
// const logoutUser = asyncHandler(async (req, res) => {
//     await User.findByIdAndUpdate(req.user._id, {
//         refreshToken: null,
//     });

//     res.clearCookie("accessToken");
//     res.clearCookie("refreshToken");

//     res
//         .status(200)
//         .json(new ApiResponse(200, {}, "Logged out successfully"));
// });

// export {
//     registerUser,
//     loginUser,
//     getCurrentUser,
//     refreshAccessToken,
//     logoutUser,
// };
