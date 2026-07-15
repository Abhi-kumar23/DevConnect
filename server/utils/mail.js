import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import Mailgen from 'mailgen';
import "../config/env.js";

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const createTransporter = async () => {
  const { token: accessToken } = await oAuth2Client.getAccessToken();

  if (!accessToken) {
    throw new Error("Could not obtain Gmail OAuth access token");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GOOGLE_USER_EMAIL,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      accessToken,
    },
  });
};

const hasEmailConfiguration = () => [
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REFRESH_TOKEN,
  process.env.GOOGLE_USER_EMAIL,
].every(Boolean);

const mailGenerator = new Mailgen({
  theme: 'default',
  product: {
    name: 'DevConnect',
    link: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
});

const otpMailgenContent = (username, otpCode) => ({
  body: {
    name: username,

    intro: [
      "Welcome to DevConnect!",
      "To complete your email verification, please use the following One-Time Password (OTP):"
    ],

    action: {
      instructions: "Your verification code",
      button: {
        color: "#2563EB",
        text: otpCode,
        link: "#"
      }
    },

    outro: [
      "This OTP is valid for 10 minutes.",
      "If you didn't create a DevConnect account, you can safely ignore this email."
    ]
  }
});

const forgotPasswordMailgenContent = (username, resetUrl) => ({
  body: {
    greeting: 'Password Reset Request',
    name: username,
    intro: 'Click the button below to reset your password:',
    action: {
      instructions: 'Reset your password:',
      button: {
        color: '#DC4D2F',
        text: 'Reset Password',
        link: resetUrl
      }
    },
    outro: 'This link expires in 10 minutes.'
  }
});

const passwordChangedMailgenContent = (username) => ({
  body: {
    greeting: 'Password Updated',
    name: username,
    intro: 'Your password has been changed successfully.',
    outro: 'If you didn\'t make this change, please contact support.'
  }
});

const sendEmail = async ({ email, subject, mailgenContent }) => {
  if (!email || !subject || !mailgenContent) {
    throw new Error('Missing required email parameters');
  }

  if (!hasEmailConfiguration()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email delivery is not configured');
    }
    const otp = mailgenContent.body?.action?.button?.text;
    console.warn(`Email delivery is not configured. Development ${otp ? `OTP for ${email}: ${otp}` : `message for ${email}`} `);
    return { messageId: 'development-console' };
  }

  try {
    const html = mailGenerator.generate(mailgenContent);
    const text = mailGenerator.generatePlaintext(mailgenContent);

    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: `"DevConnect" <${process.env.GOOGLE_USER_EMAIL}>`,
      to: email,
      subject,
      html,
      text,
    });

    console.log(`✅ Email sent to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};


const testEmailConnection = async () => {
  if (!hasEmailConfiguration()) {
    console.warn('Email delivery is not configured; verification OTPs will be printed in the development server log.');
    return false;
  }
  try {
    const transporter = await createTransporter();
    await transporter.verify();

    console.log("✅ Gmail connection verified");
    return true;
  } catch (error) {
    console.error("❌ Gmail connection failed:", error);
    return false;
  }
};

export {
  otpMailgenContent,
  forgotPasswordMailgenContent,
  passwordChangedMailgenContent,
  sendEmail,
  testEmailConnection,
}
