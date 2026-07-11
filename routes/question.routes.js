const express = require('express');
const questionController = require('../controllers/questionController');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.use(restrictTo('Admin')); // Only admins manage questions

router.post('/import-preview', questionController.uploadExcel, questionController.importPreview);
router.post('/confirm-import', questionController.confirmImport);

module.exports = router;
