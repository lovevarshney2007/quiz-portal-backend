const Joi = require('joi');

const createQuestionSchema = Joi.object({
    exam: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    section: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    type: Joi.string().valid('Single Correct', 'Multiple Correct', 'True/False', 'Integer', 'Numerical').required(),
    questionText: Joi.string().required(),
    options: Joi.array().items(
        Joi.object({
            text: Joi.string().required()
        }).unknown(true)
    ).optional(),
    correctAnswer: Joi.any().required(),
    marks: Joi.number().min(0).required(),
    negativeMarks: Joi.number().min(0).optional(),
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
    negativeMarks: Joi.number().min(0).optional(),
    explanation: Joi.string().optional(),
    difficulty: Joi.string().valid('Easy', 'Medium', 'Hard').optional(),
    order: Joi.number().optional()
});

const reorderQuestionsSchema = Joi.object({
    updates: Joi.array().items(
        Joi.object({
            id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
            order: Joi.number().required()
        })
    ).required()
});

const moveQuestionSchema = Joi.object({
    sectionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
});

const bulkDeleteSchema = Joi.object({
    ids: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).required()
});

const confirmImportSchema = Joi.object({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    questions: Joi.array().items(createQuestionSchema).required()
});

module.exports = {
    createQuestionSchema,
    updateQuestionSchema,
    reorderQuestionsSchema,
    moveQuestionSchema,
    bulkDeleteSchema,
    confirmImportSchema
};
