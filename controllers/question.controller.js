const questionService = require('../services/question.service');
const { catchAsync } = require('../middlewares/error.middleware');
const CustomError = require('../utils/customError');

const createQuestion = catchAsync(async (req, res) => {
    const question = await questionService.createQuestion(req.body);
    res.status(201).json({ status: 'success', data: { question } });
});

const getExamQuestions = catchAsync(async (req, res) => {
    const questions = await questionService.getQuestionsByExamId(req.params.examId);
    res.status(200).json({ status: 'success', data: { questions } });
});

const getQuestion = catchAsync(async (req, res) => {
    const question = await questionService.getQuestionById(req.params.id);
    res.status(200).json({ status: 'success', data: { question } });
});

const updateQuestion = catchAsync(async (req, res) => {
    const question = await questionService.updateQuestion(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { question } });
});

const deleteQuestion = catchAsync(async (req, res) => {
    await questionService.deleteQuestion(req.params.id);
    res.status(204).json({ status: 'success', data: null });
});

const importPreview = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new CustomError('Please upload an excel or csv file', 400);
    }
    const { examId, sectionId } = req.body;
    if (!examId || !sectionId) {
        throw new CustomError('examId and sectionId are required', 400);
    }

    const result = await questionService.parseBulkImportFile(req.file.buffer, examId, sectionId);
    res.status(200).json({ status: 'success', data: result.preview });
});

const confirmImport = catchAsync(async (req, res) => {
    const { questions } = req.body;
    if (!questions || !Array.isArray(questions)) {
        throw new CustomError('Questions array is required', 400);
    }

    const result = await questionService.bulkImportQuestions(questions);
    res.status(201).json({ status: 'success', data: { importedCount: result.length } });
});

module.exports = {
    createQuestion,
    getExamQuestions,
    getQuestion,
    updateQuestion,
    deleteQuestion,
    importPreview,
    confirmImport
};
