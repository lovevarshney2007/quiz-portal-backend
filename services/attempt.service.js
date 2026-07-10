const attemptRepository = require('../repositories/attempt.repository');
const examRepository = require('../repositories/exam.repository');
const CustomError = require('../utils/customError');

class AttemptService {
    async startExam(userId, examId) {
        const exam = await examRepository.findById(examId);
        if (!exam) {
            throw new CustomError('Exam not found', 404);
        }

        const now = new Date();
        if (now < exam.startTime || now > exam.endTime) {
            throw new CustomError('Exam is not currently active', 403);
        }

        let attempt = await attemptRepository.findAttemptByUserAndExam(userId, examId);
        
        if (attempt) {
            if (attempt.status !== 'InProgress') {
                throw new CustomError('Exam already submitted', 400);
            }
            // Resume session
            return { attempt, isResume: true };
        }

        attempt = await attemptRepository.createAttempt({ userId, examId });
        return { attempt, isResume: false };
    }

    async autoSave(userId, examId, questionData) {
        const attempt = await attemptRepository.findAttemptByUserAndExam(userId, examId);
        if (!attempt || attempt.status !== 'InProgress') {
            throw new CustomError('Active exam attempt not found', 400);
        }

        const { questionId, status, givenAnswer, timeSpent } = questionData;

        const updatedStatus = await attemptRepository.updateQuestionStatus(attempt._id, questionId, {
            status,
            givenAnswer,
            $inc: { timeSpent: timeSpent || 0, visitedCount: 1 }
        });

        return updatedStatus;
    }

    async submitExam(userId, examId, isAutoSubmit = false) {
        const attempt = await attemptRepository.findAttemptByUserAndExam(userId, examId);
        if (!attempt || attempt.status !== 'InProgress') {
            throw new CustomError('Active exam attempt not found', 400);
        }

        attempt.status = isAutoSubmit ? 'AutoSubmitted' : 'Submitted';
        attempt.endTime = new Date();
        await attempt.save();

        return attempt;
    }
}

module.exports = new AttemptService();
