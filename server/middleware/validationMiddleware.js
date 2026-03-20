const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        const extractedErrors = errors.array().map(err => ({
            field: err.path,
            message: err.msg
        }));

        throw ApiError.badRequest('Validation failed', extractedErrors);
    };
};

// Validation rules
const authValidation = {
    register: [
        body('firstName')
            .notEmpty().withMessage('First name is required')
            .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
            .matches(/^[a-zA-Z\s]+$/).withMessage('First name can only contain letters and spaces'),
        
        body('lastName')
            .notEmpty().withMessage('Last name is required')
            .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
            .matches(/^[a-zA-Z\s]+$/).withMessage('Last name can only contain letters and spaces'),
        
        body('email')
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Please provide a valid email')
            .normalizeEmail(),
        
        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
            .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number')
    ],

    login: [
        body('email')
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Please provide a valid email')
            .normalizeEmail(),
        
        body('password')
            .notEmpty().withMessage('Password is required')
    ],

    updatePassword: [
        body('currentPassword')
            .notEmpty().withMessage('Current password is required'),
        
        body('newPassword')
            .notEmpty().withMessage('New password is required')
            .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
            .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number')
    ]
};

const profileValidation = {
    createOrUpdate: [
        body('bio')
            .optional()
            .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
        
        body('skills')
            .optional()
            .isArray().withMessage('Skills must be an array'),
        
        body('skills.*')
            .optional()
            .isString().withMessage('Each skill must be a string')
            .isLength({ max: 50 }).withMessage('Skill cannot exceed 50 characters'),
        
        body('github')
            .optional()
            .isURL().withMessage('Please provide a valid GitHub URL'),
        
        body('linkedin')
            .optional()
            .isURL().withMessage('Please provide a valid LinkedIn URL')
    ]
};

const postValidation = {
    create: [
        body('text')
            .notEmpty().withMessage('Post text is required')
            .isLength({ max: 5000 }).withMessage('Post cannot exceed 5000 characters'),
        
        body('image')
            .optional()
            .isURL().withMessage('Please provide a valid image URL')
    ],

    comment: [
        body('text')
            .notEmpty().withMessage('Comment text is required')
            .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters')
    ]
};

const commentValidation = {
    add: [
        body('content')
            .notEmpty().withMessage('Comment content is required')
            .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters')
    ],

    update: [
        body('content')
            .notEmpty().withMessage('Comment content is required')
            .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters')
    ]
};

const connectionValidation = {
    sendRequest: [
        param('id')
            .isMongoId().withMessage('Invalid user ID')
    ],

    acceptRequest: [
        param('id')
            .isMongoId().withMessage('Invalid user ID')
    ],

    rejectRequest: [
        param('id')
            .isMongoId().withMessage('Invalid user ID')
    ]
};

const chatValidation = {
    createChat: [
        body('receiverId')
            .isMongoId().withMessage('Invalid receiver ID')
    ],

    sendMessage: [
        body('chatId')
            .isMongoId().withMessage('Invalid chat ID'),
        
        body('text')
            .notEmpty().withMessage('Message text is required')
            .isLength({ max: 1000 }).withMessage('Message cannot exceed 1000 characters')
    ]
};

const idValidation = {
    paramId: [
        param('id')
            .isMongoId().withMessage('Invalid ID format')
    ],

    videoId: [
        param('videoId')
            .isMongoId().withMessage('Invalid video ID format')
    ],

    commentId: [
        param('commentId')
            .isMongoId().withMessage('Invalid comment ID format')
    ],

    tweetId: [
        param('tweetId')
            .isMongoId().withMessage('Invalid tweet ID format')
    ]
};

const paginationValidation = {
    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        
        query('sort')
            .optional()
            .isIn(['asc', 'desc']).withMessage('Sort must be either asc or desc')
    ]
};

module.exports = {
    validate,
    authValidation,
    profileValidation,
    postValidation,
    commentValidation,
    connectionValidation,
    chatValidation,
    idValidation,
    paginationValidation
};