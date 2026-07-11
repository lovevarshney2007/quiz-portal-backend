const questionRepository = require('../repositories/questionRepository');
const xlsx = require('xlsx');

class QuestionService {
    async addQuestion(questionData) {
        return await questionRepository.createQuestion(questionData);
    }

    async getQuestionsByExam(examId) {
        return await questionRepository.findByExamId(examId);
    }

    async deleteQuestion(questionId) {
        return await questionRepository.deleteQuestion(questionId);
    }

    // Process Excel file for bulk upload
    async parseBulkImportFile(buffer, examId, sectionId) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        const questionsToInsert = [];
        const errors = [];

        data.forEach((row, index) => {
            try {
                // Basic Validation
                if (!row.Question) throw new Error('Missing Question');
                if (!row.Type) throw new Error('Missing Type');
                if (!row.CorrectAnswer) throw new Error('Missing CorrectAnswer');
                if (!row.Marks) throw new Error('Missing Marks');

                const question = {
                    exam: examId,
                    section: sectionId,
                    type: row.Type,
                    questionText: row.Question,
                    correctAnswer: row.CorrectAnswer,
                    marks: Number(row.Marks),
                    explanation: row.Explanation || '',
                    difficulty: row.Difficulty || 'Medium',
                    order: Number(row.Order || index + 1)
                };

                // Handle Options for types that need them
                if (['Single Correct', 'Multiple Correct'].includes(row.Type)) {
                    question.options = [];
                    ['A', 'B', 'C', 'D'].forEach(opt => {
                        if (row[`Option${opt}`]) {
                            question.options.push({ id: opt, text: row[`Option${opt}`] });
                        }
                    });
                    if (question.options.length < 2) {
                        throw new Error('Not enough options provided');
                    }
                } else if (row.Type === 'True/False') {
                    question.options = [
                        { id: 'T', text: 'True' },
                        { id: 'F', text: 'False' }
                    ];
                }

                questionsToInsert.push(question);
            } catch (err) {
                errors.push({ row: index + 2, error: err.message });
            }
        });

        if (errors.length > 0) {
            return { success: false, errors };
        }

        return { success: true, preview: questionsToInsert };
    }

    async bulkImportQuestions(questionsArray) {
        return await questionRepository.insertMany(questionsArray);
    }
}

module.exports = new QuestionService();
