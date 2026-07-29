const Joi = require('joi');

// BUG-008 FIX: studentNumber is optional to allow admin accounts that may not match the
// ^25\d{5,6}$ pattern. The backend auth.service.js skips the student number check for Admins.
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    studentNumber: Joi.string().optional().allow('', null),
    captchaToken: Joi.string().optional().allow('', null)
});

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

// BUG-010 FIX: Added 'answers' array field. Without it, Joi silently stripped the full
// answers payload on submit, making the explicit Redis-to-Mongo flush a no-op.
const submitExamSchema = Joi.object({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    answers: Joi.array().items(Joi.object()).optional()
});

module.exports = {
    loginSchema,
    startExamSchema,
    autoSaveSchema,
    submitExamSchema
};
