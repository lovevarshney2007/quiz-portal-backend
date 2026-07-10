const questionRepository = require('../repositories/question.repository');
const examRepository = require('../repositories/exam.repository');
const CustomError = require('../utils/customError');

class QuestionService {
    async createQuestion(questionData) {
        const exam = await examRepository.findById(questionData.examId);
        if (!exam) {
            throw new CustomError('Exam not found', 404);
        }

        const question = await questionRepository.create(questionData);
        
        // Update exam total questions & max marks
        exam.totalQuestions += 1;
        exam.maximumMarks += question.marks;
        await exam.save();

        return question;
    }

    async getQuestionsByExamId(examId) {
        const exam = await examRepository.findById(examId);
        if (!exam) {
            throw new CustomError('Exam not found', 404);
        }
        return await questionRepository.findByExamId(examId);
    }

    async getQuestionById(id) {
        const question = await questionRepository.findById(id);
        if (!question) {
            throw new CustomError('Question not found', 404);
        }
        return question;
    }

    async updateQuestion(id, updateData) {
        const question = await questionRepository.update(id, updateData);
        if (!question) {
            throw new CustomError('Question not found', 404);
        }
        return question;
    }

    async deleteQuestion(id) {
        const question = await questionRepository.findById(id);
        if (!question) {
            throw new CustomError('Question not found', 404);
        }

        await questionRepository.delete(id);

        // Update exam stats
        const exam = await examRepository.findById(question.examId);
        if (exam) {
            exam.totalQuestions -= 1;
            exam.maximumMarks -= question.marks;
            await exam.save();
        }

        return true;
    }
}

module.exports = new QuestionService();
