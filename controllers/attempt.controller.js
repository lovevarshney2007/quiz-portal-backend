const attemptService = require('../services/attempt.service');
const { catchAsync } = require('../middlewares/error.middleware');

const startExam = catchAsync(async (req, res) => {
    const { examId } = req.body;
    const result = await attemptService.startExam(req.user._id, examId);
    res.status(200).json({ status: 'success', data: result });
});

const autoSave = catchAsync(async (req, res) => {
    const { examId, ...payload } = req.body;
    const state = await attemptService.autoSave(req.user._id, examId, payload);
    res.status(200).json({ status: 'success', data: { state } });
});

const getState = catchAsync(async (req, res) => {
    const { examId } = req.params;
    const state = await attemptService.getState(req.user._id, examId);
    res.status(200).json({ status: 'success', data: { state } });
});

const getSummary = catchAsync(async (req, res) => {
    const { examId } = req.params;
    const summary = await attemptService.getSummary(req.user._id, examId);
    res.status(200).json({ status: 'success', data: { summary } });
});

const submitExam = catchAsync(async (req, res) => {
    const { examId } = req.body;
    const attempt = await attemptService.submitExam(req.user._id, examId, false);
    res.status(200).json({ status: 'success', data: { attempt } });
});

const resetAttempt = catchAsync(async (req, res) => {
    const { examId } = req.body;
    await attemptService.resetAttempt(req.user._id, examId);
    res.status(200).json({ status: 'success', message: 'Attempt reset successfully for testing' });
});

module.exports = {
    startExam,
    autoSave,
    getState,
    getSummary,
    submitExam,
    resetAttempt
};
