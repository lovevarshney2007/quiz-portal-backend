const Violation = require('../models/Violation');
const attemptRepository = require('../repositories/attempt.repository');
const redisClient = require('../config/redis');
const CustomError = require('../utils/customError');

class ViolationService {
    async reportViolation(studentId, examId, violationData) {
        const attempt = await attemptRepository.findAttemptByUserAndExam(studentId, examId);
        if (!attempt || attempt.status !== 'InProgress') {
            throw new CustomError('Active exam attempt not found', 400);
        }

        const violation = await Violation.create({
            student: studentId,
            exam: examId,
            attempt: attempt._id,
            type: violationData.type,
            ip: violationData.ip,
            browser: violationData.browser,
            device: violationData.device
        });

        const key = `exam_attempt:${examId}:${studentId}`;
        const existingDataStr = await redisClient.get(key);
        
        let state = existingDataStr ? JSON.parse(existingDataStr) : {
            questions: {},
            tabSwitchCount: attempt.tabSwitchCount,
            fullscreenExits: attempt.fullscreenExits
        };

        if (violationData.type === 'TabSwitch') {
            state.tabSwitchCount += 1;
        } else if (violationData.type === 'FullscreenExit') {
            state.fullscreenExits += 1;
        }

        await redisClient.set(key, JSON.stringify(state), 'EX', 86400);

        // Auto-logout threshold check (e.g., 5+ tab switches)
        if (state.tabSwitchCount >= 5) {
            attempt.isSuspicious = true;
            attempt.status = 'AutoSubmitted';
            attempt.endTime = new Date();
            await attempt.save();

            // Clear Redis cache and sync partial data
            await require('./attempt.service').submitExam(studentId, examId, true);
            
            return { action: 'force_logout', message: 'Exam forcefully submitted due to multiple violations.' };
        }

        return { action: 'logged', state };
    }
    
    async getExamViolations(examId) {
        return await Violation.find({ exam: examId }).populate('student', 'name studentNumber');
    }
}

module.exports = new ViolationService();
