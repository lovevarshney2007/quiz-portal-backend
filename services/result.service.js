const resultRepository = require('../repositories/result.repository');
const attemptRepository = require('../repositories/attempt.repository');
const examRepository = require('../repositories/exam.repository');
const questionRepository = require('../repositories/question.repository');
const CustomError = require('../utils/customError');

class ResultService {
    async calculateResult(attemptId) {
        const attempt = await attemptRepository.findAttemptById(attemptId);
        if (!attempt) throw new CustomError('Attempt not found', 404);

        const exam = await examRepository.findById(attempt.examId);
        const questions = await questionRepository.findByExamId(attempt.examId);
        const questionStatuses = await attemptRepository.getQuestionStatuses(attemptId);

        let totalScore = 0;
        let correctAnswers = 0;
        let wrongAnswers = 0;
        let skippedQuestions = 0;
        let totalTimeSpent = 0;
        let maxScore = exam.totalMarks || exam.totalQuestions * 1; // Or calculate from questions

        const sectionStats = {};
        const responses = [];
        
        // Ensure questionMap is a map
        const questionMap = new Map();
        questions.forEach(q => {
            questionMap.set(q._id.toString(), q);
            if (q.section) {
                if (!sectionStats[q.section]) {
                    sectionStats[q.section] = {
                        sectionId: q.section,
                        title: `Section ${q.section}`, // Ideally populated from Section model
                        score: 0, correct: 0, wrong: 0, skipped: 0
                    };
                }
            }
        });

        for (const status of questionStatuses) {
            const question = questionMap.get(status.questionId.toString());
            if (!question) continue;
            
            const timeTaken = status.timeSpent || 0;
            totalTimeSpent += timeTaken;
            const secId = question.section ? question.section.toString() : 'default';
            if (!sectionStats[secId]) sectionStats[secId] = { sectionId: secId, title: 'Default', score: 0, correct: 0, wrong: 0, skipped: 0 };
            const sec = sectionStats[secId];

            let isCorrect = null;

            const hasGivenAnswer = status.givenAnswer && (
                Array.isArray(status.givenAnswer)
                    ? status.givenAnswer.length > 0 && status.givenAnswer.some(a => String(a).trim() !== '')
                    : String(status.givenAnswer).trim() !== ''
            );
            const isAnswered = hasGivenAnswer;

            if (isAnswered) {
                isCorrect = this.checkAnswer(question, status.givenAnswer);
                if (isCorrect) {
                    correctAnswers++;
                    totalScore += question.marks;
                    sec.correct++;
                    sec.score += question.marks;
                } else {
                    wrongAnswers++;
                    const negativeMark = Math.abs(question.negativeMarks || 0);
                    totalScore -= negativeMark;
                    sec.wrong++;
                    sec.score -= negativeMark;
                }
            } else {
                skippedQuestions++;
                sec.skipped++;
            }

            
            responses.push({
                question: question._id,
                markedAnswer: status.givenAnswer,
                isCorrect,
                timeTaken
            });
        }

        skippedQuestions += (exam.totalQuestions - questionStatuses.length);
        const totalVisited = correctAnswers + wrongAnswers;
        const accuracy = totalVisited > 0 ? (correctAnswers / totalVisited) * 100 : 0;
        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
        const averageTimePerQuestion = questionStatuses.length > 0 ? (totalTimeSpent / questionStatuses.length) : 0;
        const completionTime = attempt.endTime ? (attempt.endTime.getTime() - attempt.startTime.getTime()) / 1000 : 0;

        // Calculate accuracy per section
        const sectionWisePerformance = Object.values(sectionStats).map(sec => {
            const secTotal = sec.correct + sec.wrong;
            sec.accuracy = secTotal > 0 ? (sec.correct / secTotal) * 100 : 0;
            return sec;
        });

        const userRepository = require('../repositories/user.repository');
        const studentUser = await userRepository.findById(attempt.userId).catch(() => null);

        const resultData = {
            student: attempt.userId,
            studentName: studentUser?.name || studentUser?.studentName || "Candidate",
            studentEmail: studentUser?.email || "",
            studentNumber: String(studentUser?.studentNumber || studentUser?.rollNumber || ""),
            exam: attempt.examId,
            totalQuestions: exam.totalQuestions,
            correctAnswers,
            wrongAnswers,
            skippedQuestions,
            totalScore,
            maxScore,
            accuracy: Number(accuracy.toFixed(2)),
            percentage: Number(percentage.toFixed(2)),
            averageTimePerQuestion: Number(averageTimePerQuestion.toFixed(2)),
            completionTime,
            isSuspicious: attempt.isSuspicious || false,
            violationCount: (attempt.tabSwitchCount || 0) + (attempt.fullscreenExits || 0),
            sectionWisePerformance,
            responses
        };

        const result = await resultRepository.createOrUpdate(resultData);
        
        // Add to Redis Leaderboard
        const redisClient = require('../config/redis');
        await redisClient.zadd(`leaderboard:${attempt.examId}`, totalScore, attempt.userId.toString());
        
        return result;
    }

    normalizeToOptionIds(question, answerVal) {
        if (answerVal === null || answerVal === undefined) return [];
        let arr = [];
        if (Array.isArray(answerVal)) {
            arr = answerVal;
        } else if (typeof answerVal === 'string' && answerVal.includes(',') && question && question.type === 'Multiple Correct') {
            arr = answerVal.split(',').map(s => s.trim());
        } else {
            arr = [answerVal];
        }

        const normalizedIds = [];

        for (const item of arr) {
            if (item === null || item === undefined) continue;
            let val = '';
            if (typeof item === 'object') {
                val = String(item.id || item.text || '').trim();
            } else {
                val = String(item).trim();
            }
            if (!val) continue;

            // Check if val matches an option ID or option text
            if (question && question.options && Array.isArray(question.options) && question.options.length > 0) {
                const matchedOpt = question.options.find(opt => 
                    String(opt.id || '').trim().toLowerCase() === val.toLowerCase() ||
                    String(opt.text || '').trim().toLowerCase() === val.toLowerCase()
                );
                if (matchedOpt) {
                    normalizedIds.push(String(matchedOpt.id).trim().toUpperCase());
                    continue;
                }
            }
            // Fallback for non-option questions (integer/numerical/true-false without options)
            normalizedIds.push(val.toLowerCase());
        }
        return Array.from(new Set(normalizedIds)).sort();
    }

    checkAnswer(question, givenAnswer) {
        if (!givenAnswer || (Array.isArray(givenAnswer) && givenAnswer.length === 0)) return false;
        if (!question || question.correctAnswer === null || question.correctAnswer === undefined) return false;

        const correctIds = this.normalizeToOptionIds(question, question.correctAnswer);
        const givenIds = this.normalizeToOptionIds(question, givenAnswer);

        if (correctIds.length === 0 || correctIds.length !== givenIds.length) return false;

        for (let i = 0; i < correctIds.length; i++) {
            if (correctIds[i] !== givenIds[i]) return false;
        }
        return true;
    }
}

module.exports = new ResultService();
