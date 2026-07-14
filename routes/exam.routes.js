const express = require('express');
const examController = require('../controllers/exam.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createExamSchema, updateExamSchema } = require('../validators/exam.validator');
const ROLES = require('../constants/roles');

const router = express.Router();

router.use(protect);

router.get('/', examController.getAllExams);
router.get('/:id', examController.getExam);
router.post('/:id/autosave', authorize(ROLES.STUDENT), examController.syncStudentResponse);

// Admin only routes
router.use(authorize(ROLES.ADMIN));

router.post('/', validate(createExamSchema), examController.createExam);
router.patch('/:id', validate(updateExamSchema), examController.updateExam);
router.delete('/:id', examController.deleteExam);
router.patch('/:id/publish', examController.publishExam);
router.patch('/:id/start', examController.startExam);
router.patch('/:id/pause', examController.pauseExam);
router.patch('/:id/resume', examController.resumeExam);
router.patch('/:id/complete', examController.completeExam);
router.patch('/:id/archive', examController.archiveExam);

module.exports = router;
