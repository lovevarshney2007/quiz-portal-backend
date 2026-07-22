const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const checkBlockedIp = require('./middlewares/ipBlocker.middleware');

const { globalErrorHandler } = require('./middlewares/error.middleware');

// Routes Import
const authRoutes = require('./routes/auth.routes');
const examRoutes = require('./routes/exam.routes');
const questionRoutes = require('./routes/question.routes');
const attemptRoutes = require('./routes/attempt.routes');
const resultRoutes = require('./routes/result.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const violationRoutes = require('./routes/violation.routes');

const app = express();

// IP Blocker
app.use(checkBlockedIp);

// Security Middleware
app.use(helmet());

const allowedOrigins = [
    process.env.FRONTEND_URL, 
    'https://quiz-neon-three.vercel.app', // Your deployed Vercel frontend
    'http://localhost:3000', 
    'http://localhost:5173',
    'https://quiz-phi-snowy.vercel.app/'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
}));

// Rate Limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes.'
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after a minute.'
});

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
// app.use(mongoSanitize());

// Prevent parameter pollution
app.use(hpp());

app.get('/', (req, res) => {                                                        
        res.send(`                                                                      
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                <h1 style="color: #4CAF50;">Quiz Portal Backend is Live! 🚀</h1>        
                <p>Please use Postman or the Frontend application to interact with the  
  API.</p>                                                                              
            </div>                                                                      
        `);                                                                             
    });  
// Mount Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/exams', apiLimiter, examRoutes);
app.use('/api/v1/questions', apiLimiter, questionRoutes);
app.use('/api/v1/attempts', apiLimiter, attemptRoutes);
app.use('/api/v1/results', apiLimiter, resultRoutes);
app.use('/api/v1/leaderboard', apiLimiter, leaderboardRoutes);
app.use('/api/v1/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/v1/violations', apiLimiter, violationRoutes);

// Health Check
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Server is healthy' });
});

// Unhandled Routes
app.use((req, res, next) => {
    res.status(404).json({
        status: 'fail',
        message: `Can't find ${req.originalUrl} on this server!`
    });
});

// Global Error Handler
app.use(globalErrorHandler);

module.exports = app;
