const express = require('express');
const attemptController = require('../controllers/attempt.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { startExamSchema, autoSaveSchema, submitExamSchema } = require('../validators/attempt.validator');

const router = express.Router();

router.use(protect);

router.post('/start', validate(startExamSchema), attemptController.startExam);
router.post('/save', validate(autoSaveSchema), attemptController.autoSave);
router.post('/submit', validate(submitExamSchema), attemptController.submitExam);

module.exports = router;
