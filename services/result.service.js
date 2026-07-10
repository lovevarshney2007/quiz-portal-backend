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

        let score = 0;
        let totalCorrect = 0;
        let totalWrong = 0;
        let totalSkipped = 0;

        const questionMap = new Map();
        questions.forEach(q => questionMap.set(q._id.toString(), q));

        for (const status of questionStatuses) {
            const question = questionMap.get(status.questionId.toString());
            if (!question) continue;

            if (status.status === 'NotVisited' || status.status === 'Visited' || status.status === 'MarkedForReview' || status.status === 'Skipped') {
                totalSkipped++;
            } else if (status.status === 'Answered' || status.status === 'AnsweredMarkedForReview') {
                const isCorrect = this.checkAnswer(question, status.givenAnswer);
                if (isCorrect) {
                    totalCorrect++;
                    score += question.marks;
                } else {
                    totalWrong++;
                    score -= Math.abs(question.negativeMarks);
                }
            }
        }

        // Account for unvisited questions
        totalSkipped += (exam.totalQuestions - questionStatuses.length);

        const accuracy = totalCorrect + totalWrong > 0 ? (totalCorrect / (totalCorrect + totalWrong)) * 100 : 0;

        const resultData = {
            userId: attempt.userId,
            examId: attempt.examId,
            attemptId: attempt._id,
            score,
            totalCorrect,
            totalWrong,
            totalSkipped,
            totalQuestions: exam.totalQuestions,
            accuracy: Number(accuracy.toFixed(2)),
            timeTaken: attempt.timeSpent || 0
        };

        return await resultRepository.create(resultData);
    }

    checkAnswer(question, givenAnswer) {
        if (!givenAnswer || givenAnswer.length === 0) return false;

        const correctAns = [...question.correctAnswers].sort();
        const givenAns = [...givenAnswer].sort();

        if (correctAns.length !== givenAns.length) return false;

        for (let i = 0; i < correctAns.length; i++) {
            if (correctAns[i] !== givenAns[i]) return false;
        }

        return true;
    }
}

module.exports = new ResultService();
