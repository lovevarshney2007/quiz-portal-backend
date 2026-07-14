const express = require('express');
const questionController = require('../controllers/question.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { 
    createQuestionSchema, 
    updateQuestionSchema, 
    reorderQuestionsSchema, 
    moveQuestionSchema, 
    bulkDeleteSchema,
    confirmImportSchema
} = require('../validators/question.validator');
const upload = require('../middlewares/upload.middleware');
const ROLES = require('../constants/roles');

const router = express.Router();

router.use(protect);
router.use(authorize(ROLES.ADMIN));

router.get('/exam/:examId', questionController.getExamQuestions);
router.get('/:id', questionController.getQuestion);
router.post('/', validate(createQuestionSchema), questionController.createQuestion);
router.patch('/:id', validate(updateQuestionSchema), questionController.updateQuestion);
router.delete('/:id', questionController.deleteQuestion);

// Advanced Management
router.post('/duplicate/:id', questionController.duplicateQuestion);
router.patch('/reorder/batch', validate(reorderQuestionsSchema), questionController.reorderQuestions);
router.patch('/move/:id', validate(moveQuestionSchema), questionController.moveQuestion);
router.delete('/bulk/batch', validate(bulkDeleteSchema), questionController.bulkDeleteQuestions);

// Bulk Import
router.post('/import-preview', upload.single('file'), questionController.importPreview);
router.post('/confirm-import', validate(confirmImportSchema), questionController.confirmImport);

module.exports = router;
