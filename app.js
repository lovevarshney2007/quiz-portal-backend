const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');

const { globalErrorHandler } = require('./middlewares/error.middleware');

// Routes Import
const authRoutes = require('./routes/auth.routes');
const examRoutes = require('./routes/exam.routes');
const questionRoutes = require('./routes/question.routes');
const attemptRoutes = require('./routes/attempt.routes');
const resultRoutes = require('./routes/result.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: '*', // To be updated in production
    credentials: true
}));

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent parameter pollution
app.use(hpp());

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/attempts', attemptRoutes);
app.use('/api/v1/results', resultRoutes);
app.use('/api/v1/leaderboard', leaderboardRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Unhandled Routes
app.all('*', (req, res, next) => {
    res.status(404).json({
        status: 'fail',
        message: `Can't find ${req.originalUrl} on this server!`
    });
});

// Global Error Handler
app.use(globalErrorHandler);

module.exports = app;
