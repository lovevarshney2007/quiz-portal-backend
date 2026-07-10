const express = require('express');
const leaderboardController = require('../controllers/leaderboard.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/:examId', leaderboardController.getLeaderboard);

module.exports = router;
