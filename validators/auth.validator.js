const { body, validationResult } = require('express-validator');
const CustomError = require('../utils/customError');

const registerValidation = [
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('studentNumber')
        .notEmpty().withMessage('Student number is required')
        .matches(/^25\d+$/).withMessage('Student number must start with 25 and contain only digits'),
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .matches(/@akgec\.ac\.in$/).withMessage('Email must end with @akgec.ac.in'),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character'),
    body('branch').notEmpty().withMessage('Branch is required'),
    body('section').notEmpty().withMessage('Section is required'),
    body('year').notEmpty().withMessage('Year is required')
];

const loginValidation = [
    body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format'),
    body('password').notEmpty().withMessage('Password is required')
];

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        return next(new CustomError(`Validation Error: ${errorMessages.join(', ')}`, 400));
    }
    next();
};

module.exports = {
    registerValidation,
    loginValidation,
    validate
};
