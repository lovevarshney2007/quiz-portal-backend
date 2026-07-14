const express = require('express');
const questionController = require('../controllers/question.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createQuestionSchema, updateQuestionSchema } = require('../validators/question.validator');
const upload = require('../middlewares/upload.middleware');
const ROLES = require('../constants/roles');

const router = express.Router();

router.use(protect);
router.use(authorize(ROLES.ADMIN));

router.post('/', validate(createQuestionSchema), questionController.createQuestion);
router.get('/exam/:examId', questionController.getExamQuestions);
router.get('/:id', questionController.getQuestion);
router.patch('/:id', validate(updateQuestionSchema), questionController.updateQuestion);
router.delete('/:id', questionController.deleteQuestion);

// Bulk Import
router.post('/import-preview', upload.single('file'), questionController.importPreview);
router.post('/confirm-import', questionController.confirmImport);

module.exports = router;
