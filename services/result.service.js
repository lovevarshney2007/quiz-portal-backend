const resultRepository = require('../repositories/result.repository');
const attemptRepository = require('../repositories/attempt.repository');
const examRepository = require('../repositories/exam.repository');
const questionRepository = require('../repositories/question.repository');
const CustomError = require('../utils/customError');

class ResultService {
    async calculateResult(attemptId) {
        const attempt = await attemptRepository.findAttemptById(attemptId);
        if (!attempt) throw new CustomError('Attempt not found', 404);

        const existingResult = await resultRepository.findByAttemptId(attemptId);
        if (existingResult) return existingResult;

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

            let isCorrect = false;

            if (status.status === 'NotVisited' || status.status === 'Visited' || status.status === 'MarkedForReview' || status.status === 'Skipped') {
                skippedQuestions++;
                sec.skipped++;
            } else if (status.status === 'Answered' || status.status === 'AnsweredMarkedForReview') {
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

        const resultData = {
            student: attempt.userId,
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

        const result = await resultRepository.create(resultData);
        
        // Add to Redis Leaderboard
        const redisClient = require('../config/redis');
        await redisClient.zadd(`leaderboard:${attempt.examId}`, totalScore, attempt.userId.toString());
        
        return result;
    }

    checkAnswer(question, givenAnswer) {
        if (!givenAnswer || givenAnswer.length === 0) return false;

        // Ensure correctAnswer exists (Mixed type in schema)
        if (question.correctAnswer === null || question.correctAnswer === undefined) return false;

        // If options were given as an array
        if (Array.isArray(question.correctAnswer)) {
            const correctAns = [...question.correctAnswer].sort();
            const givenAns = [...givenAnswer].sort();

            if (correctAns.length !== givenAns.length) return false;

            for (let i = 0; i < correctAns.length; i++) {
                if (correctAns[i] !== givenAns[i]) return false;
            }
            return true;
        }

        // Single value comparison
        return String(question.correctAnswer) === String(givenAnswer);
    }
}

module.exports = new ResultService();
