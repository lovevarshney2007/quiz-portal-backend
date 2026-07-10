const questionService = require('../services/question.service');
const { catchAsync } = require('../middlewares/error.middleware');

const createQuestion = catchAsync(async (req, res) => {
    const question = await questionService.createQuestion(req.body);
    res.status(201).json({
        status: 'success',
        data: { question }
    });
});

const getExamQuestions = catchAsync(async (req, res) => {
    const questions = await questionService.getQuestionsByExamId(req.params.examId);
    res.status(200).json({
        status: 'success',
        results: questions.length,
        data: { questions }
    });
});

const getQuestion = catchAsync(async (req, res) => {
    const question = await questionService.getQuestionById(req.params.id);
    res.status(200).json({
        status: 'success',
        data: { question }
    });
});

const updateQuestion = catchAsync(async (req, res) => {
    const question = await questionService.updateQuestion(req.params.id, req.body);
    res.status(200).json({
        status: 'success',
        data: { question }
    });
});

const deleteQuestion = catchAsync(async (req, res) => {
    await questionService.deleteQuestion(req.params.id);
    res.status(204).json({
        status: 'success',
        data: null
    });
});

module.exports = {
    createQuestion,
    getExamQuestions,
    getQuestion,
    updateQuestion,
    deleteQuestion
};
