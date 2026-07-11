const { Server } = require('socket.io');
const logger = require('../config/logger');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        logger.info(`New socket connection: ${socket.id}`);

        socket.on('student_online', (data) => {
            logger.info(`Student online: ${data.studentId}`);
            // Logic to track student status in Redis
            // We can emit back or join rooms if needed
        });

        socket.on('exam_started', (data) => {
            logger.info(`Exam started by student: ${data.studentId} for exam: ${data.examId}`);
        });

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
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
