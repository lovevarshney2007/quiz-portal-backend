const express = require('express');
const examController = require('../controllers/examController');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

// Student actions
router.post('/:id/autosave', restrictTo('Student'), examController.syncStudentResponse);
router.get('/:id', examController.getExam);

// Admin actions
router.use(restrictTo('Admin'));
router.post('/', examController.createExam);
router.patch('/:id/publish', examController.publishExam);
router.patch('/:id/start', examController.startExam);
router.patch('/:id/pause', examController.pauseExam);
router.patch('/:id/complete', examController.completeExam);

module.exports = router;
