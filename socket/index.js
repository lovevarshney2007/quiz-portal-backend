const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');
const redisClient = require('../config/redis');

let io;

const initSocket = (server) => {
    const allowedOrigins = [
        process.env.FRONTEND_URL, 
        'https://quiz-phi-snowy.vercel.app',
        'http://localhost:3000', 
        'http://localhost:5173',
        'http://192.168.56.1:5173',
        'http://192.168.1.4:5173'
        // BUG-029 FIX: Removed duplicate entry for quiz-phi-snowy.vercel.app
    ];

    io = new Server(server, {
        cors: {
            origin: function (origin, callback) {
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
            methods: ['GET', 'POST']
        }
    });

    // Authentication Middleware
    // BUG-012 FIX: Check Redis token blacklist (same as HTTP auth middleware).
    // Without this, a logged-out student's socket connection would persist.
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
        if (!token) {
            return next(new Error('Authentication error'));
        }

        try {
            const cleanToken = token.replace('Bearer ', '');
            // Check blacklist first
            const isBlacklisted = await redisClient.get(`blacklist_${cleanToken}`).catch(() => null);
            if (isBlacklisted) {
                return next(new Error('Authentication error: token revoked'));
            }
            const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', async (socket) => {
        logger.info(`New socket connection: ${socket.id} by user: ${socket.user.id}`);

        // Students can join specific exam rooms
        socket.on('join_exam', async ({ examId }) => {
            const roomName = `exam:${examId}`;
            socket.join(roomName);
            logger.info(`User ${socket.user.id} joined room ${roomName}`);
            
            if (socket.user.role === 'Student') {
                const redisKey = `online_students:${examId}`;
                await redisClient.sadd(redisKey, socket.user.id);
                // Emit to the room that student is online (admins can listen to this)
                io.to(roomName).emit('student_online', { studentId: socket.user.id });
                
                // Keep track of which exam this socket belongs to for disconnect logic
                socket.examId = examId;
            }
        });

        socket.on('disconnect', async () => {
            logger.info(`Socket disconnected: ${socket.id}`);
            if (socket.user.role === 'Student' && socket.examId) {
                const roomName = `exam:${socket.examId}`;
                const redisKey = `online_students:${socket.examId}`;
                await redisClient.srem(redisKey, socket.user.id);
                io.to(roomName).emit('student_offline', { studentId: socket.user.id });
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = {
    initSocket,
    getIO
};
