const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/auth.routes');
const examRoutes = require('./routes/exam.routes');
const questionRoutes = require('./routes/question.routes');
const importRoutes = require('./routes/import.routes');
const attemptRoutes = require('./routes/attempt.routes');
const resultRoutes = require('./routes/result.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const { globalErrorHandler } = require('./middlewares/error.middleware');

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({ origin: '*' })); // Should be restricted in production

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'API is healthy' });
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/import', importRoutes);
app.use('/api/v1/attempts', attemptRoutes);
app.use('/api/v1/results', resultRoutes);
app.use('/api/v1/leaderboard', leaderboardRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// 404 Route Handler
app.use((req, res, next) => {
    res.status(404).json({
        status: 'error',
        message: `Route not found: ${req.originalUrl}`
    });
});

// Global Error Handler
app.use(globalErrorHandler);

module.exports = app;
