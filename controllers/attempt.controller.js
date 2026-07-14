const attemptService = require('../services/attempt.service');
const { catchAsync } = require('../middlewares/error.middleware');

const startExam = catchAsync(async (req, res) => {
    const { examId } = req.body;
    const result = await attemptService.startExam(req.user._id, examId);
    res.status(200).json({ status: 'success', data: result });
});

const autoSave = catchAsync(async (req, res) => {
    const { examId, questionId, status, givenAnswer, timeSpent } = req.body;
    const updatedStatus = await attemptService.autoSave(req.user._id, examId, {
        questionId, status, givenAnswer, timeSpent
    });
    res.status(200).json({ status: 'success', data: { status: updatedStatus } });
});

const submitExam = catchAsync(async (req, res) => {
    const { examId } = req.body;
    const attempt = await attemptService.submitExam(req.user._id, examId, false);
    res.status(200).json({ status: 'success', data: { attempt } });
});

module.exports = {
    startExam,
    autoSave,
    submitExam
};
