const Joi = require('joi');

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    studentNumber: Joi.string().pattern(/^25\d{5,6}$/).required(),
    captchaToken: Joi.string().optional()
});

module.exports = {
    loginSchema
};
