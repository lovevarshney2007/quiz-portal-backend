const examService = require('../services/examService');
const { catchAsync } = require('../utils/catchAsync');

exports.createExam = catchAsync(async (req, res) => {
    const examData = { ...req.body, createdBy: req.user._id };
    const exam = await examService.createExam(examData);
    res.status(201).json({ status: 'success', data: exam });
});

exports.getExam = catchAsync(async (req, res) => {
    const exam = await examService.getExamDetails(req.params.id);
    res.status(200).json({ status: 'success', data: exam });
});

exports.publishExam = catchAsync(async (req, res) => {
    const exam = await examService.publishExam(req.params.id);
    res.status(200).json({ status: 'success', data: exam });
});

exports.startExam = catchAsync(async (req, res) => {
    const exam = await examService.startExam(req.params.id);
    res.status(200).json({ status: 'success', data: exam });
});

exports.pauseExam = catchAsync(async (req, res) => {
    const exam = await examService.pauseExam(req.params.id);
    res.status(200).json({ status: 'success', data: exam });
});

exports.completeExam = catchAsync(async (req, res) => {
    const exam = await examService.completeExam(req.params.id);
    res.status(200).json({ status: 'success', data: exam });
});

exports.syncStudentResponse = catchAsync(async (req, res) => {
    const { responses, violationCount } = req.body;
    await examService.saveStudentResponse(req.params.id, req.user._id, responses, violationCount);
    res.status(200).json({ status: 'success', message: 'Response auto-saved' });
});
