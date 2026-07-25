const examService = require('../services/exam.service');
const attemptService = require('../services/attempt.service');
const { catchAsync } = require('../middlewares/error.middleware');

const createExam = catchAsync(async (req, res) => {
    const exam = await examService.createExam(req.body, req.user._id);
    res.status(201).json({ status: 'success', data: { exam } });
});

const getExam = catchAsync(async (req, res) => {
    const exam = await examService.getExamById(req.params.id);
    res.status(200).json({ status: 'success', data: { exam } });
});

const getAllExams = catchAsync(async (req, res) => {
    const exams = await examService.getAllExams(req.query, req.user.role);
    res.status(200).json({ status: 'success', data: { exams } });
});

const updateExam = catchAsync(async (req, res) => {
    const exam = await examService.updateExam(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { exam } });
});

const deleteExam = catchAsync(async (req, res) => {
    await examService.deleteExam(req.params.id);
    res.status(204).json({ status: 'success', data: null });
});

const publishExam = catchAsync(async (req, res) => {
    const exam = await examService.publishExam(req.params.id);
    res.status(200).json({ status: 'success', data: { exam } });
});

const startExam = catchAsync(async (req, res) => {
    const exam = await examService.startExam(req.params.id);
    res.status(200).json({ status: 'success', data: { exam } });
});

const { getIO } = require('../socket');

const pauseExam = catchAsync(async (req, res) => {
    const exam = await examService.pauseExam(req.params.id);
    getIO().to(`exam:${req.params.id}`).emit('exam_paused', { examId: req.params.id });
    res.status(200).json({ status: 'success', data: { exam } });
});

const resumeExam = catchAsync(async (req, res) => {
    const exam = await examService.resumeExam(req.params.id);
    getIO().to(`exam:${req.params.id}`).emit('exam_resumed', { examId: req.params.id });
    res.status(200).json({ status: 'success', data: { exam } });
});

const completeExam = catchAsync(async (req, res) => {
    const exam = await examService.completeExam(req.params.id);
    getIO().to(`exam:${req.params.id}`).emit('exam_completed', { examId: req.params.id });
    res.status(200).json({ status: 'success', data: { exam } });
});

const archiveExam = catchAsync(async (req, res) => {
    const exam = await examService.archiveExam(req.params.id);
    res.status(200).json({ status: 'success', data: { exam } });
});

const extendExam = catchAsync(async (req, res) => {
    const exam = await examService.extendExam(req.params.id, req.body.extraMinutes);
    getIO().to(`exam:${req.params.id}`).emit('exam_extended', { 
        examId: req.params.id, 
        extraMinutes: req.body.extraMinutes,
        newEndTime: exam.endTime
    });
    res.status(200).json({ status: 'success', data: { exam } });
});

const duplicateExam = catchAsync(async (req, res) => {
    const exam = await examService.duplicateExam(req.params.id, req.user._id);
    res.status(201).json({ status: 'success', data: { exam } });
});

const forceSubmit = catchAsync(async (req, res) => {
    const attempt = await examService.forceSubmit(req.params.id, req.params.studentId);
    getIO().to(`exam:${req.params.id}`).emit('force_submit', { studentId: req.params.studentId });
    res.status(200).json({ status: 'success', data: { attempt } });
});

const syncStudentResponse = catchAsync(async (req, res) => {
    const { responses, violationCount } = req.body;
    await examService.saveStudentResponse(req.params.id, req.user._id, responses, violationCount);
    res.status(200).json({ status: 'success', message: 'Responses saved successfully' });
});

const getLiveStudents = catchAsync(async (req, res) => {
    const liveStudents = await examService.getLiveStudents(req.params.id || req.query.examId);
    res.status(200).json({ status: 'success', data: { liveStudents } });
});

module.exports = {
    createExam,
    getExam,
    getAllExams,
    updateExam,
    deleteExam,
    publishExam,
    startExam,
    pauseExam,
    resumeExam,
    completeExam,
    archiveExam,
    extendExam,
    duplicateExam,
    forceSubmit,
    syncStudentResponse,
    getLiveStudents
};
