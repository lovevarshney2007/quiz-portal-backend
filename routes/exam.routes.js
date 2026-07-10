const express = require('express');
const examController = require('../controllers/exam.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const ROLES = require('../constants/roles');

const router = express.Router();

router.use(protect);

router.route('/')
    .get(examController.getAllExams)
    .post(authorize(ROLES.ADMIN, ROLES.EXAM_COORDINATOR), examController.createExam);

router.route('/:id')
    .get(examController.getExam)
    .patch(authorize(ROLES.ADMIN, ROLES.EXAM_COORDINATOR), examController.updateExam)
    .delete(authorize(ROLES.ADMIN, ROLES.EXAM_COORDINATOR), examController.deleteExam);

module.exports = router;
