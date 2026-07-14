const Joi = require('joi');

const startExamSchema = Joi.object({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
});

const autoSaveSchema = Joi.object({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    questionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    status: Joi.string().valid('NotVisited', 'Visited', 'Answered', 'MarkedForReview', 'AnsweredMarkedForReview', 'Skipped').required(),
    givenAnswer: Joi.any().optional(),
    timeSpent: Joi.number().optional()
});

const submitExamSchema = Joi.object({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
});

module.exports = {
    startExamSchema,
    autoSaveSchema,
    submitExamSchema
};
