const express = require('express');
const resultController = require('../controllers/result.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const ROLES = require('../constants/roles');

const router = express.Router();

router.use(protect);
router.use(authorize(ROLES.ADMIN));

router.post('/generate', resultController.generateResult);
router.get('/exam/:examId', resultController.getExamResults);

module.exports = router;
