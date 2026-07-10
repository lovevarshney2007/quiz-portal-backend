const attemptService = require('../services/attempt.service');
const { catchAsync } = require('../middlewares/error.middleware');

const startExam = catchAsync(async (req, res) => {
    const { examId } = req.body;
    const result = await attemptService.startExam(req.user._id, examId);
    
    res.status(200).json({
        status: 'success',
        data: result
    });
});

const autoSave = catchAsync(async (req, res) => {
    const { examId, ...questionData } = req.body;
    const status = await attemptService.autoSave(req.user._id, examId, questionData);
    
    res.status(200).json({
        status: 'success',
        data: { status }
    });
});

const submitExam = catchAsync(async (req, res) => {
    const { examId } = req.body;
    const attempt = await attemptService.submitExam(req.user._id, examId, false);
    
    res.status(200).json({
        status: 'success',
        data: { attempt }
    });
});

module.exports = {
    startExam,
    autoSave,
    submitExam
};
