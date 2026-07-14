const Joi = require('joi');

const createQuestionSchema = Joi.object({
    exam: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    section: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    type: Joi.string().valid('Single Correct', 'Multiple Correct', 'True/False', 'Integer', 'Numerical').required(),
    questionText: Joi.string().required(),
    options: Joi.array().items(
        Joi.object({
            text: Joi.string().required()
        })
    ).optional(),
    correctAnswer: Joi.any().required(),
    marks: Joi.number().min(0).required(),
    explanation: Joi.string().optional(),
    difficulty: Joi.string().valid('Easy', 'Medium', 'Hard').optional(),
    order: Joi.number().required()
});

const updateQuestionSchema = Joi.object({
    exam: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    section: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    type: Joi.string().valid('Single Correct', 'Multiple Correct', 'True/False', 'Integer', 'Numerical').optional(),
    questionText: Joi.string().optional(),
    options: Joi.array().items(
        Joi.object({
            text: Joi.string().required()
        })
    ).optional(),
    correctAnswer: Joi.any().optional(),
    marks: Joi.number().min(0).optional(),
    explanation: Joi.string().optional(),
    difficulty: Joi.string().valid('Easy', 'Medium', 'Hard').optional(),
    order: Joi.number().optional()
});

module.exports = {
    createQuestionSchema,
    updateQuestionSchema
};
