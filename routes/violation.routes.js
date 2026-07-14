const express = require('express');
const violationController = require('../controllers/violation.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { reportViolationSchema } = require('../validators/violation.validator');
const ROLES = require('../constants/roles');

const router = express.Router();

router.use(protect);

router.post('/', authorize(ROLES.STUDENT), validate(reportViolationSchema), violationController.reportViolation);
router.get('/:examId', authorize(ROLES.ADMIN), violationController.getExamViolations);

module.exports = router;
