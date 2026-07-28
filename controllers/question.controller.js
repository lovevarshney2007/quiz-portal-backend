const questionService = require('../services/question.service');
const { catchAsync } = require('../middlewares/error.middleware');
const CustomError = require('../utils/customError');
const fs = require('fs');

const createQuestion = catchAsync(async (req, res) => {
    const question = await questionService.createQuestion(req.body);
    res.status(201).json({ status: 'success', data: { question } });
});

const attemptRepository = require('../repositories/attempt.repository');

const getExamQuestions = catchAsync(async (req, res) => {
    const questions = await questionService.getQuestionsByExamId(req.params.examId);
    const isAdmin = req.user && req.user.role === 'Admin';
    
    let sanitized = isAdmin
        ? questions
        : questions.map((q) => {
              const obj = typeof q.toObject === 'function' ? q.toObject() : { ...q };
              delete obj.correctAnswer;
              delete obj.explanation; // explanation can directly reveal the answer
              return obj;
          });

    // Anti-Cheating: If student has an active attempt, strictly enforce their randomized mapping
    if (!isAdmin && req.user) {
        const attempt = await attemptRepository.findAttemptByUserAndExam(req.user._id, req.params.examId);
        if (attempt && attempt.questionMapping && attempt.questionMapping.length > 0) {
            const mappedQuestions = [];
            for (const mapItem of attempt.questionMapping) {
                const q = sanitized.find(sq => sq._id.toString() === mapItem.questionId.toString());
                if (q) {
                    const clonedQ = { ...q };
                    // Shuffle the options according to the mapping
                    if (clonedQ.options && mapItem.optionsOrder && mapItem.optionsOrder.length === clonedQ.options.length) {
                        const newOptions = [];
                        for (const idx of mapItem.optionsOrder) {
                            newOptions.push(clonedQ.options[idx]);
                        }
                        clonedQ.options = newOptions;
                    }
                    mappedQuestions.push(clonedQ);
                }
            }
            // Fallback: If map is smaller than questions (e.g. new questions added after start), append the unmapped ones
            for (const q of sanitized) {
                if (!mappedQuestions.find(mq => mq._id.toString() === q._id.toString())) {
                    mappedQuestions.push(q);
                }
            }
            sanitized = mappedQuestions;
        }
    }

    res.status(200).json({ status: 'success', data: { questions: sanitized } });
});

const getQuestion = catchAsync(async (req, res) => {
    const question = await questionService.getQuestionById(req.params.id);

    // Strip answer data for non-admin callers (same policy as getExamQuestions)
    const isAdmin = req.user && req.user.role === 'Admin';
    const data = isAdmin ? question : (() => {
        const obj = typeof question.toObject === 'function' ? question.toObject() : { ...question };
        delete obj.correctAnswer;
        delete obj.explanation;
        return obj;
    })();

    res.status(200).json({ status: 'success', data: { question: data } });
});

const updateQuestion = catchAsync(async (req, res) => {
    const question = await questionService.updateQuestion(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { question } });
});

const deleteQuestion = catchAsync(async (req, res) => {
    await questionService.deleteQuestion(req.params.id);
    res.status(204).json({ status: 'success', data: null });
});

const duplicateQuestion = catchAsync(async (req, res) => {
    const question = await questionService.duplicateQuestion(req.params.id);
    res.status(201).json({ status: 'success', data: { question } });
});

const reorderQuestions = catchAsync(async (req, res) => {
    await questionService.reorderQuestions(req.body.updates);
    res.status(200).json({ status: 'success', message: 'Questions reordered successfully' });
});

const moveQuestion = catchAsync(async (req, res) => {
    const question = await questionService.moveQuestion(req.params.id, req.body.sectionId);
    res.status(200).json({ status: 'success', data: { question } });
});

const bulkDeleteQuestions = catchAsync(async (req, res) => {
    const count = await questionService.bulkDeleteQuestions(req.body.ids);
    res.status(200).json({ status: 'success', message: `${count} questions deleted successfully` });
});

const importPreview = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new CustomError('Please upload an excel or csv file', 400);
    }
    const { examId, sectionId } = req.body;
    if (!examId) {
        throw new CustomError('examId is required', 400);
    }

    const fileBuffer = req.file.buffer || fs.readFileSync(req.file.path);
    const result = await questionService.parseBulkImportFile(fileBuffer, examId, sectionId);
    
    // Optional: Clean up the file from disk after reading it since we don't need it permanently
    if (req.file.path) {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Failed to delete temp file', err);
        });
    }

    if (!result.success) {
        return res.status(400).json({ 
            status: 'fail', 
            message: `Spreadsheet format error: ${result.errors.join(' | ')}`,
            errors: result.errors 
        });
    }
    
    res.status(200).json({ status: 'success', data: result.preview });
});

const confirmImport = catchAsync(async (req, res) => {
    const { examId, questions } = req.body;
    if (!examId || !questions || !Array.isArray(questions)) {
        throw new CustomError('examId and questions array are required', 400);
    }

    const result = await questionService.bulkImportQuestions(examId, questions);
    res.status(201).json({ status: 'success', data: { importedCount: result.length } });
});

module.exports = {
    createQuestion,
    getExamQuestions,
    getQuestion,
    updateQuestion,
    deleteQuestion,
    duplicateQuestion,
    reorderQuestions,
    moveQuestion,
    bulkDeleteQuestions,
    importPreview,
    confirmImport
};
