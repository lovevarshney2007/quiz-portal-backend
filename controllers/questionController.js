const questionService = require('../services/questionService');
const { catchAsync } = require('../utils/catchAsync');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

exports.uploadExcel = upload.single('file');

exports.importPreview = catchAsync(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const { examId, sectionId } = req.body;
    if (!examId || !sectionId) {
        return res.status(400).json({ status: 'error', message: 'examId and sectionId are required' });
    }

    const result = await questionService.parseBulkImportFile(req.file.buffer, examId, sectionId);
    if (!result.success) {
        return res.status(400).json({
            status: 'error',
            message: 'Validation failed for some questions',
            errors: result.errors
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'File parsed successfully. Review preview before confirming.',
        data: result.preview
    });
});

exports.confirmImport = catchAsync(async (req, res) => {
    const { questions } = req.body;
    if (!questions || !Array.isArray(questions)) {
        return res.status(400).json({ status: 'error', message: 'Questions array is required' });
    }

    const inserted = await questionService.bulkImportQuestions(questions);
    res.status(201).json({
        status: 'success',
        message: `${inserted.length} questions imported successfully`
    });
});
