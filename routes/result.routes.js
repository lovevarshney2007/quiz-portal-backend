const express = require('express');
const resultController = require('../controllers/result.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/generate', resultController.generateResult);

module.exports = router;
