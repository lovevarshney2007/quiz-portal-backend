const express = require('express');
const importController = require('../controllers/import.controller');
const upload = require('../middlewares/upload.middleware');
const { protect, authorize } = require('../middlewares/auth.middleware');
const ROLES = require('../constants/roles');

const router = express.Router();

router.use(protect);
router.use(authorize(ROLES.ADMIN, ROLES.EXAM_COORDINATOR));

router.post('/questions', upload.single('file'), importController.importQuestions);

module.exports = router;
