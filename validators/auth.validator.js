const Joi = require('joi');

const registerSchema = Joi.object({
    role: Joi.string().valid('Admin', 'Student').required(),
    name: Joi.string().required(),
    studentNumber: Joi.alternatives().conditional('role', {
        is: 'Student',
        then: Joi.string().pattern(/^25\d{5,6}$/).required(),
        otherwise: Joi.string().optional()
    }),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    captchaToken: Joi.string().optional()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    captchaToken: Joi.string().optional()
});

module.exports = {
    registerSchema,
    loginSchema
};
