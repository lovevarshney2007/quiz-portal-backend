const questionRepository = require('../repositories/question.repository');
const examRepository = require('../repositories/exam.repository');
const CustomError = require('../utils/customError');
const xlsx = require('xlsx');

class QuestionService {
    async createQuestion(questionData) {
        const exam = await examRepository.findById(questionData.exam);
        if (!exam) throw new CustomError('Exam not found', 404);

        const question = await questionRepository.create(questionData);
        
        exam.totalQuestions += 1;
        exam.maximumMarks = (exam.maximumMarks || 0) + question.marks;
        await exam.save();

        return question;
    }

    async getQuestionsByExamId(examId) {
        const exam = await examRepository.findById(examId);
        if (!exam) throw new CustomError('Exam not found', 404);
        return await questionRepository.findByExamId(examId);
    }

    async getQuestionById(id) {
        const question = await questionRepository.findById(id);
        if (!question) throw new CustomError('Question not found', 404);
        return question;
    }

    async updateQuestion(id, updateData) {
        const question = await questionRepository.update(id, updateData);
        if (!question) throw new CustomError('Question not found', 404);
        return question;
    }

    async deleteQuestion(id) {
        const question = await questionRepository.findById(id);
        if (!question) throw new CustomError('Question not found', 404);

        await questionRepository.delete(id);

        const exam = await examRepository.findById(question.exam);
        if (exam) {
            exam.totalQuestions = Math.max(0, exam.totalQuestions - 1);
            exam.maximumMarks = Math.max(0, (exam.maximumMarks || 0) - question.marks);
            await exam.save();
        }
        return true;
    }

    async parseBulkImportFile(buffer, examId, sectionId) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const questions = rows.map((row, index) => {
            const options = [];
            for (let i = 1; i <= 4; i++) {
                if (row[`Option ${i}`]) {
                    options.push({ text: String(row[`Option ${i}`]) });
                }
            }

            return {
                exam: examId,
                section: sectionId,
                type: row['Question Type'] || 'Single Correct',
                questionText: row['Question Text'],
                options,
                correctAnswer: row['Correct Answer'] ? String(row['Correct Answer']).trim() : null,
                marks: Number(row['Marks']) || 1,
                explanation: row['Explanation'] || '',
                difficulty: row['Difficulty'] || 'Medium',
                order: index + 1
            };
        });
        
        return { success: true, preview: questions };
    }

    async bulkImportQuestions(questionsArray) {
        return await questionRepository.insertMany(questionsArray);
    }
}

module.exports = new QuestionService();
