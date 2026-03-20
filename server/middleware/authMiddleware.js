const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Check cookie
    else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        throw ApiError.unauthorized('Not authorized to access this route');
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        const user = await User.findById(decoded.id)
            .select('-password')
            .populate('profile');

        if (!user) {
            throw ApiError.unauthorized('User not found');
        }

        // Check if user is active
        if (!user.isActive) {
            throw ApiError.unauthorized('Account is deactivated');
        }

        // Add user to request
        req.user = user;
        req.userId = user._id;

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            throw ApiError.unauthorized('Invalid token');
        }
        if (error.name === 'TokenExpiredError') {
            throw ApiError.unauthorized('Token expired');
        }
        throw error;
    }
});

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw ApiError.unauthorized('Not authorized');
        }

        if (!roles.includes(req.user.role)) {
            throw ApiError.forbidden(`User role ${req.user.role} is not authorized to access this route`);
        }

        next();
    };
};

module.exports = { protect, authorize };