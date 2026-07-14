const express = require('express');
const leaderboardController = require('../controllers/leaderboard.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const ROLES = require('../constants/roles');

const router = express.Router();

router.use(protect);
router.use(authorize(ROLES.ADMIN));

router.get('/:examId', leaderboardController.getLeaderboard);

module.exports = router;
