const express = require('express');
const attemptController = require('../controllers/attempt.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/start', attemptController.startExam);
router.post('/save', attemptController.autoSave);
router.post('/submit', attemptController.submitExam);

module.exports = router;
