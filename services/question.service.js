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

    async duplicateQuestion(id) {
        const question = await this.getQuestionById(id);
        const questionData = question.toObject();
        delete questionData._id;
        delete questionData.createdAt;
        delete questionData.updatedAt;
        
        questionData.questionText = `${questionData.questionText} (Copy)`;
        
        // Find highest order in the same section to place it at the end
        const existingQuestions = await questionRepository.findByExamId(questionData.exam);
        const sectionQuestions = existingQuestions.filter(q => q.section.toString() === questionData.section.toString());
        const maxOrder = sectionQuestions.length > 0 ? Math.max(...sectionQuestions.map(q => q.order)) : 0;
        
        questionData.order = maxOrder + 1;
        
        return await this.createQuestion(questionData);
    }

    async reorderQuestions(updates) {
        // updates is an array of { id, order }
        const promises = updates.map(update => 
            questionRepository.update(update.id, { order: update.order })
        );
        await Promise.all(promises);
        return { success: true };
    }

    async moveQuestion(id, newSectionId) {
        const question = await this.getQuestionById(id);
        question.section = newSectionId;
        
        // Get questions in new section to assign correct order
        const existingQuestions = await questionRepository.findByExamId(question.exam);
        const sectionQuestions = existingQuestions.filter(q => q.section.toString() === newSectionId.toString());
        const maxOrder = sectionQuestions.length > 0 ? Math.max(...sectionQuestions.map(q => q.order)) : 0;
        
        question.order = maxOrder + 1;
        
        return await questionRepository.update(id, { section: newSectionId, order: question.order });
    }

    async bulkDeleteQuestions(ids) {
        let deletedCount = 0;
        for (const id of ids) {
            await this.deleteQuestion(id);
            deletedCount++;
        }
        return deletedCount;
    }

    async parseBulkImportFile(buffer, examId, sectionId) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const errors = [];
        const questions = [];
        const seenTexts = new Set();
        
        // Get existing questions to check for duplicates and find max order
        const existingQuestions = await questionRepository.findByExamId(examId);
        existingQuestions.forEach(q => seenTexts.add(q.questionText.trim().toLowerCase()));
        
        const sectionQuestions = existingQuestions.filter(q => q.section.toString() === sectionId.toString());
        let currentOrder = sectionQuestions.length > 0 ? Math.max(...sectionQuestions.map(q => q.order)) : 0;

        const validTypes = ['Single Correct', 'Multiple Correct', 'True/False', 'Integer', 'Numerical'];
        const validDifficulties = ['Easy', 'Medium', 'Hard'];

        rows.forEach((row, index) => {
            const rowNumber = index + 2; // +1 for 0-index, +1 for header row
            const qText = row['Question Text'] ? String(row['Question Text']).trim() : '';
            
            if (!qText) {
                errors.push(`Row ${rowNumber}: Question Text is required`);
                return;
            }

            const normalizedText = qText.toLowerCase();
            if (seenTexts.has(normalizedText)) {
                errors.push(`Row ${rowNumber}: Duplicate question text found`);
                return;
            }
            seenTexts.add(normalizedText);

            const qType = row['Question Type'] || 'Single Correct';
            if (!validTypes.includes(qType)) {
                errors.push(`Row ${rowNumber}: Invalid Question Type '${qType}'`);
                return;
            }

            const marks = Number(row['Marks']) || 1;
            if (marks <= 0) {
                errors.push(`Row ${rowNumber}: Marks must be greater than 0`);
                return;
            }

            const difficulty = row['Difficulty'] || 'Medium';
            if (!validDifficulties.includes(difficulty)) {
                errors.push(`Row ${rowNumber}: Invalid Difficulty '${difficulty}'`);
                return;
            }

            const options = [];
            let correctAns = row['Correct Answer'] ? String(row['Correct Answer']).trim() : null;

            if (qType === 'Single Correct' || qType === 'Multiple Correct') {
                for (let i = 1; i <= 4; i++) {
                    if (row[`Option ${i}`]) {
                        options.push({ text: String(row[`Option ${i}`]).trim() });
                    }
                }
                
                if (options.length < 2) {
                    errors.push(`Row ${rowNumber}: Objective questions require at least 2 options`);
                    return;
                }
                
                if (!correctAns) {
                    errors.push(`Row ${rowNumber}: Correct Answer is required`);
                    return;
                }
                
                // For Multiple Correct, correctAnswer might be comma-separated
                if (qType === 'Multiple Correct') {
                    correctAns = correctAns.split(',').map(s => s.trim());
                    const allOptionsText = options.map(o => o.text);
                    const missingOption = correctAns.find(ans => !allOptionsText.includes(ans));
                    if (missingOption) {
                        errors.push(`Row ${rowNumber}: Correct answer '${missingOption}' does not match any provided option`);
                        return;
                    }
                } else {
                    const allOptionsText = options.map(o => o.text);
                    if (!allOptionsText.includes(correctAns)) {
                        errors.push(`Row ${rowNumber}: Correct answer '${correctAns}' does not match any provided option`);
                        return;
                    }
                }
            } else if (qType === 'True/False') {
                options.push({ text: 'True' }, { text: 'False' });
                if (correctAns !== 'True' && correctAns !== 'False') {
                    errors.push(`Row ${rowNumber}: True/False questions must have correct answer as 'True' or 'False'`);
                    return;
                }
            } else if (!correctAns) {
                 errors.push(`Row ${rowNumber}: Correct Answer is required`);
                 return;
            }

            currentOrder++;
            
            questions.push({
                exam: examId,
                section: sectionId,
                type: qType,
                questionText: qText,
                options,
                correctAnswer: correctAns,
                marks,
                explanation: row['Explanation'] || '',
                difficulty,
                order: currentOrder
            });
        });
        
        if (errors.length > 0) {
            return { success: false, errors };
        }
        
        return { success: true, preview: questions };
    }

    async bulkImportQuestions(examId, questionsArray) {
        const questions = await questionRepository.insertMany(questionsArray);
        
        const exam = await examRepository.findById(examId);
        if (exam) {
            exam.totalQuestions += questions.length;
            exam.maximumMarks = (exam.maximumMarks || 0) + questions.reduce((sum, q) => sum + q.marks, 0);
            await exam.save();
        }
        
        return questions;
    }
}

module.exports = new QuestionService();
