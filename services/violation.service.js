const Violation = require('../models/Violation');
const ExamAttempt = require('../models/ExamAttempt');
const attemptRepository = require('../repositories/attempt.repository');
const redisClient = require('../config/redis');
const CustomError = require('../utils/customError');

class ViolationService {
    async reportViolation(studentId, examId, violationData) {
        let attempt = await attemptRepository.findAttemptByUserAndExam(studentId, examId);
        if (!attempt) {
            attempt = await ExamAttempt.findOne({ userId: studentId }).sort({ createdAt: -1 });
        }

        const violation = await Violation.create({
            student: studentId,
            exam: examId || attempt?.examId,
            attempt: attempt?._id,
            type: violationData.type || 'TabSwitch',
            ip: violationData.ip,
            browser: violationData.browser,
            device: violationData.device
        });

        if (attempt) {
            if (violationData.type === 'TabSwitch') {
                attempt.tabSwitchCount = (attempt.tabSwitchCount || 0) + 1;
            } else if (violationData.type === 'FullscreenExit') {
                attempt.fullscreenExits = (attempt.fullscreenExits || 0) + 1;
            }
            await attempt.save().catch(e => console.warn("Failed to save attempt violation count:", e.message));

            // Redis state sync
            if (examId) {
                const key = `exam_attempt:${examId}:${studentId}`;
                const existingDataStr = await redisClient.get(key).catch(() => null);
                let state = existingDataStr ? JSON.parse(existingDataStr) : {
                    questions: {},
                    tabSwitchCount: attempt.tabSwitchCount,
                    fullscreenExits: attempt.fullscreenExits
                };
                state.tabSwitchCount = attempt.tabSwitchCount;
                await redisClient.set(key, JSON.stringify(state), 'EX', 86400).catch(() => null);

                if (attempt.tabSwitchCount >= 5) {
                    attempt.isSuspicious = true;
                    attempt.status = 'AutoSubmitted';
                    attempt.endTime = new Date();
                    await attempt.save().catch(() => null);
                    await require('./attempt.service').submitExam(studentId, examId, true).catch(() => null);
                    return { action: 'force_logout', message: 'Exam forcefully submitted due to multiple violations.' };
                }
            }
        }

        return { action: 'logged', violation };
    }
    
    async getExamViolations(examId) {
        let query = {};
        if (examId && examId !== 'all') {
            query.exam = examId;
        }

        const violations = await Violation.find(query)
            .populate('student', 'name studentNumber rollNumber email applicationNumber')
            .sort({ createdAt: -1 });

        // Also merge with ExamAttempts having tabSwitchCount > 0
        let attemptQuery = { tabSwitchCount: { $gt: 0 } };
        if (examId && examId !== 'all') {
            attemptQuery.examId = examId;
        }

        const attemptsWithSwitches = await ExamAttempt.find(attemptQuery)
            .populate('userId', 'name studentNumber rollNumber email applicationNumber');

        const combinedList = violations.map(v => ({
            _id: v._id,
            student: v.student,
            exam: v.exam,
            type: v.type,
            count: 1,
            createdAt: v.createdAt
        }));

        attemptsWithSwitches.forEach(att => {
            const studentObj = att.userId;
            if (studentObj) {
                const sNum = studentObj.studentNumber || studentObj.rollNumber || studentObj.applicationNumber || "N/A";
                const sName = studentObj.name || "Student Candidate";
                const existingIndex = combinedList.findIndex(item => {
                    const iNum = item.student?.studentNumber || item.student?.rollNumber || item.student?.applicationNumber;
                    return (iNum && iNum === sNum) || item.student?.name === sName;
                });

                if (existingIndex !== -1) {
                    combinedList[existingIndex].count = Math.max(combinedList[existingIndex].count || 1, att.tabSwitchCount || 1);
                } else {
                    combinedList.push({
                        _id: att._id,
                        student: studentObj,
                        exam: att.examId,
                        type: 'TabSwitch',
                        count: att.tabSwitchCount || 1,
                        createdAt: att.updatedAt || att.createdAt
                    });
                }
            }
        });

        return combinedList;
    }
}

module.exports = new ViolationService();
