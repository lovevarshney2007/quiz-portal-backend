const Joi = require('joi');

const createExamSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    instructions: Joi.string().optional(),
    duration: Joi.number().min(1).required(),
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
    passingMarks: Joi.number().min(0).required(),
    sections: Joi.array().items(
        Joi.object({
            title: Joi.string().required(),
            order: Joi.number().required(),
            marks: Joi.number().required(),
            optionalTime: Joi.number().optional()
        })
    ).optional()
});

const updateExamSchema = Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    instructions: Joi.string().optional(),
    duration: Joi.number().min(1).optional(),
    startTime: Joi.date().iso().optional(),
    endTime: Joi.date().iso().optional(),
    passingMarks: Joi.number().min(0).optional(),
    sections: Joi.array().items(
        Joi.object({
            title: Joi.string().required(),
            order: Joi.number().required(),
            marks: Joi.number().required(),
            optionalTime: Joi.number().optional()
        })
    ).optional()
});

const extendExamSchema = Joi.object({
    extraMinutes: Joi.number().min(1).required()
});

module.exports = {
    createExamSchema,
    updateExamSchema,
    extendExamSchema
};
