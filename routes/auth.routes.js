const express = require('express');
const authController = require('../controllers/auth.controller');
const { registerValidation, loginValidation, validate } = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);

module.exports = router;
