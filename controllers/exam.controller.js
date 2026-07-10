const examService = require('../services/exam.service');
const { catchAsync } = require('../middlewares/error.middleware');

const createExam = catchAsync(async (req, res) => {
    const exam = await examService.createExam(req.body, req.user._id);
    res.status(201).json({
        status: 'success',
        data: { exam }
    });
});

const getExam = catchAsync(async (req, res) => {
    const exam = await examService.getExamById(req.params.id);
    res.status(200).json({
        status: 'success',
        data: { exam }
    });
});

const getAllExams = catchAsync(async (req, res) => {
    const exams = await examService.getAllExams(req.query);
    res.status(200).json({
        status: 'success',
        results: exams.length,
        data: { exams }
    });
});

const updateExam = catchAsync(async (req, res) => {
    const exam = await examService.updateExam(req.params.id, req.body);
    res.status(200).json({
        status: 'success',
        data: { exam }
    });
});

const deleteExam = catchAsync(async (req, res) => {
    await examService.deleteExam(req.params.id);
    res.status(204).json({
        status: 'success',
        data: null
    });
});

module.exports = {
    createExam,
    getExam,
    getAllExams,
    updateExam,
    deleteExam
};
