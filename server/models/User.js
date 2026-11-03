import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import validator from "validator";

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        minlength: [2, 'First name must be at least 2 characters'],
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        minlength: [2, 'Last name must be at least 2 characters'],
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate:{
            validator: validator.isEmail,
            message:" Please provide a valid email ",
        },
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    googleId: {
      type: String,
      default: null,
      select: false,
    },

    role: {
        type: String,
        enum: ['user', 'moderator', 'admin'],
        default: 'user'
    },

    isActive: {
        type: Boolean,
        default: true
    },

    isEmailVerified: {
        type: Boolean,
        default: false
    },

    emailVerifiedAt: {
      type: Date,
    },

    profilePicture: {
        type: String,
        default: null,
        alias: "avatar"
    },

    profilePicturePublicId: {
      type: String,
      default: null,
      select: false,
    },

    coverPhoto: {
      type: String,
      default: "",
    },

    coverPhotoPublicId: {
      type: String,
      default: null,
      select: false,
    },

    refreshToken: {
      type: String,
      select: false,
    },

    passwordChangedAt: Date,

    passwordResetToken: {
      type: String,
      select: false,
    },

    passwordResetExpires: Date,

    emailVerificationToken: {
      type: String,
      select: false,
    },

    emailVerificationExpires: Date,

    lastLogin: Date,


    connections: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    pendingRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    sentRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],


    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: Date,

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Ensure one Google identity can belong to only one user
userSchema.index(
  { googleId: 1 },
  {
    unique: true,
    name: "googleId_unique_non_null",
    partialFilterExpression: {
      googleId: { $type: "string" },
    },
  }
);

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for profile
userSchema.virtual('profile', {
    ref: 'Profile',
    localField: '_id',
    foreignField: 'user',
    justOne: true
});

// Virtual for posts count
userSchema.virtual('postsCount', {
    ref: 'Post',
    localField: '_id',
    foreignField: 'user',
    count: true
});

userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    if (!this.isNew) {
        this.passwordChangedAt = Date.now() - 1000;
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Check if password changed after JWT issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};


// userSchema.index({ email: 1 });


const User = mongoose.model("User", userSchema);

export default User;
