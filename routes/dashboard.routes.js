const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const ROLES = require('../constants/roles');

const router = express.Router();

router.use(protect);

router.get('/admin', authorize(ROLES.ADMIN), dashboardController.getAdminDashboardStats);
router.get('/student', authorize(ROLES.STUDENT), dashboardController.getStudentDashboardStats);

module.exports = router;
