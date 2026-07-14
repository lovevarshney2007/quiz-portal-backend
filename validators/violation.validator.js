const Joi = require('joi');

const reportViolationSchema = Joi.object({
    examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    type: Joi.string().valid('TabSwitch', 'FullscreenExit', 'CopyPaste', 'MultipleFaces', 'NoFace', 'Other').required(),
    browser: Joi.string().optional(),
    device: Joi.string().optional()
});

module.exports = {
    reportViolationSchema
};
