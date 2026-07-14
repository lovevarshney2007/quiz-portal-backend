const Joi = require('joi');

const startExamSchema = Joi.object({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
});

const autoSaveSchema = Joi.object({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    questionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    status: Joi.string().valid('NotVisited', 'Visited', 'Answered', 'MarkedForReview', 'AnsweredMarkedForReview', 'Skipped').optional(),
    givenAnswer: Joi.any().optional(),
    timeSpent: Joi.number().optional(),
    tabSwitchCount: Joi.number().optional(),
    fullscreenExits: Joi.number().optional()
});

const submitExamSchema = Joi.object({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
});

module.exports = {
    startExamSchema,
    autoSaveSchema,
    submitExamSchema
};
