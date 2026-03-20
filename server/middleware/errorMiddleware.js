const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error(`${err.name}: ${err.message}`, { 
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user?._id
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found with id of ${err.value}`;
        error = ApiError.notFound(message);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `Duplicate field value: ${field}. Please use another value`;
        error = ApiError.conflict(message);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = ApiError.badRequest(message);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = ApiError.unauthorized('Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
        error = ApiError.unauthorized('Token expired');
    }

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        error = ApiError.badRequest('File too large. Maximum size is 5MB');
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        error = ApiError.badRequest('Unexpected file field');
    }

    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Server Error',
        errors: error.errors || [],
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = { errorHandler };