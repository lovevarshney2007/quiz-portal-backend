const express = require('express');
const examController = require('../controllers/exam.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createExamSchema, updateExamSchema, extendExamSchema } = require('../validators/exam.validator');
const auditLog = require('../middlewares/audit.middleware');
const ROLES = require('../constants/roles');

const router = express.Router();

router.use(protect);

router.get('/', examController.getAllExams);
router.get('/:id', examController.getExam);
router.post('/:id/autosave', authorize(ROLES.STUDENT), examController.syncStudentResponse);

// Admin only routes
router.use(authorize(ROLES.ADMIN));

router.post('/', validate(createExamSchema), auditLog('CREATE_EXAM'), examController.createExam);
router.patch('/:id', validate(updateExamSchema), auditLog('UPDATE_EXAM'), examController.updateExam);
router.delete('/:id', auditLog('DELETE_EXAM'), examController.deleteExam);
router.patch('/:id/publish', auditLog('PUBLISH_EXAM'), examController.publishExam);
router.patch('/:id/start', auditLog('START_EXAM'), examController.startExam);
router.patch('/:id/pause', auditLog('PAUSE_EXAM'), examController.pauseExam);
router.patch('/:id/resume', auditLog('RESUME_EXAM'), examController.resumeExam);
router.patch('/:id/complete', auditLog('COMPLETE_EXAM'), examController.completeExam);
router.patch('/:id/archive', auditLog('ARCHIVE_EXAM'), examController.archiveExam);
router.patch('/:id/extend', validate(extendExamSchema), auditLog('EXTEND_EXAM'), examController.extendExam);
router.post('/:id/duplicate', auditLog('DUPLICATE_EXAM'), examController.duplicateExam);
router.post('/:id/force-submit/:studentId', auditLog('FORCE_SUBMIT'), examController.forceSubmit);
router.get('/live-students', examController.getLiveStudents);
router.get('/:id/live-students', examController.getLiveStudents);

module.exports = router;
