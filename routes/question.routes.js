const express = require('express');
const questionController = require('../controllers/question.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const ROLES = require('../constants/roles');

const router = express.Router();

router.use(protect);

router.route('/')
    .post(authorize(ROLES.ADMIN, ROLES.EXAM_COORDINATOR), questionController.createQuestion);

router.route('/exam/:examId')
    .get(questionController.getExamQuestions);

router.route('/:id')
    .get(questionController.getQuestion)
    .patch(authorize(ROLES.ADMIN, ROLES.EXAM_COORDINATOR), questionController.updateQuestion)
    .delete(authorize(ROLES.ADMIN, ROLES.EXAM_COORDINATOR), questionController.deleteQuestion);

module.exports = router;
