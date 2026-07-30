const express = require('express');
const rateLimit = require('express-rate-limit');
const attemptController = require('../controllers/attempt.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { startExamSchema, autoSaveSchema, submitExamSchema } = require('../validators/attempt.validator');

// Strict rate limiter: 5 req/min per IP for critical exam-state-mutating endpoints
// (same college NAT IP is fine — each student submits at most once)
const criticalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator: (req, res) => {
        if (req.user) return req.user.id;
        // express-rate-limit throws ERR_ERL_KEY_GEN_IPV6 if a custom keygen returns raw IPv6
        return req.ip.replace(/:/g, '_'); 
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many requests. Please wait before trying again.' }
});

const router = express.Router();

router.use(protect);

router.post('/start', validate(startExamSchema), attemptController.startExam);
router.post('/save', validate(autoSaveSchema), attemptController.autoSave);
router.get('/state/:examId', attemptController.getState);
router.get('/summary/:examId', attemptController.getSummary);
router.post('/submit', criticalLimiter, validate(submitExamSchema), attemptController.submitExam);
// BUG-002 FIX: /reset is admin-only. Students must NOT be able to reset their own attempt.
router.post('/reset', criticalLimiter, restrictTo('Admin'), attemptController.resetAttempt);

module.exports = router;
