const Joi = require('joi');

// BUG-008 FIX: studentNumber is optional to allow admin accounts that may not use the
// ^25\d{5,6}$ student number format. Auth service skips student number check for Admin role.
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    studentNumber: Joi.string().optional().allow('', null),
    captchaToken: Joi.string().optional()
});

module.exports = {
    loginSchema
};
