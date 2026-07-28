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
    'http://localhost:5173/',
    'http://192.168.56.1:5173',
    'http://192.168.56.1:5173/',
    'http://192.168.1.4:5173',
    'http://192.168.1.4:5173/',
    'https://quiz-phi-snowy.vercel.app',
    'https://quiz-phi-snowy.vercel.app/'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const cleanOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
        const isAllowed = allowedOrigins.some(allowed => {
            if (!allowed) return false;
            const cleanAllowed = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
            return cleanAllowed === cleanOrigin;
        });

        if (isAllowed) {
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
    max: 50, // Limit each IP to 10 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes.'
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50000, // Very high limit to prevent NAT blackout on college Wi-Fi
    message: 'Too many requests from this IP, please try again after a minute.'
});

// Global Body parser with strict limits to prevent Payload DoS attacks
app.use(express.json({ limit: '100kb' })); 
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

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
// Allow larger payloads ONLY for bulk question imports (e.g. confirm-import)
app.use('/api/v1/questions', apiLimiter, express.json({ limit: '10mb' }), questionRoutes);
app.use('/api/v1/attempts', apiLimiter, attemptRoutes);
app.use('/api/v1/results', apiLimiter, resultRoutes);
app.use('/api/v1/leaderboard', apiLimiter, leaderboardRoutes);
app.use('/api/v1/leaderboards', apiLimiter, leaderboardRoutes);
app.use('/api/v1/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/v1/violation', apiLimiter, violationRoutes);
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
