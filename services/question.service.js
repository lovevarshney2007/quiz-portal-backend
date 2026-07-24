const questionRepository = require('../repositories/question.repository');
const examRepository = require('../repositories/exam.repository');
const CustomError = require('../utils/customError');
const xlsx = require('xlsx');
const mongoose = require('mongoose');

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
        const exam = await examRepository.findById(examId);
        if (!exam) return { success: false, errors: ['Exam not found'] };

        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const errors = [];
        const questions = [];
        const seenTexts = new Set();
        let examModified = false;
        
        // Get existing questions to check for duplicates and find max order
        const existingQuestions = await questionRepository.findByExamId(examId);
        existingQuestions.forEach(q => seenTexts.add(q.questionText.trim().toLowerCase()));
        
        const maxOrders = {};
        existingQuestions.forEach(q => {
            const sid = q.section.toString();
            if (maxOrders[sid] === undefined || q.order > maxOrders[sid]) {
                maxOrders[sid] = q.order;
            }
        });

        const validTypes = ['Single Correct', 'Multiple Correct', 'True/False', 'Integer', 'Numerical'];
        const validDifficulties = ['Easy', 'Medium', 'Hard'];

        rows.forEach((rawRow, index) => {
            const row = {};
            Object.keys(rawRow).forEach(key => {
                row[key.trim()] = rawRow[key];
            });

            const rowNumber = index + 2; // +1 for 0-index, +1 for header row

            const sectionTitle = row['Section'] ? String(row['Section']).trim() : null;
            let currentSectionId = sectionId;

            if (sectionTitle) {
                let matchedSection = exam.sections.find(s => s.title.toLowerCase() === sectionTitle.toLowerCase());
                if (!matchedSection) {
                    matchedSection = {
                        _id: new mongoose.Types.ObjectId(),
                        title: sectionTitle,
                        order: exam.sections.length + 1,
                        marks: 0
                    };
                    exam.sections.push(matchedSection);
                    examModified = true;
                }
                currentSectionId = matchedSection._id;
            }

            if (!currentSectionId) {
                errors.push(`Row ${rowNumber}: No section provided in file and no default section specified`);
                return;
            }

            const qText = (row['Question Text'] || row['Question']) ? String(row['Question Text'] || row['Question']).trim() : '';
            
            if (!qText) {
                errors.push(`Row ${rowNumber}: Question is required`);
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
                const optionKeys = ['Option A', 'Option B', 'Option C', 'Option D', 'Option 1', 'Option 2', 'Option 3', 'Option 4'];
                // We map 'A' -> option 1, 'B' -> option 2, etc. if needed, but let's just collect the ones that exist.
                // Assuming it's exactly 4 options.
                const possibleKeys = [['Option A', 'Option 1'], ['Option B', 'Option 2'], ['Option C', 'Option 3'], ['Option D', 'Option 4']];
                
                const optionIds = ['A', 'B', 'C', 'D'];
                for (let i = 0; i < 4; i++) {
                    const val = row[possibleKeys[i][0]] || row[possibleKeys[i][1]];
                    if (val) {
                        options.push({ id: optionIds[options.length], text: String(val).trim() });
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

                const optionMap = {
                    'A': 0, '1': 0,
                    'B': 1, '2': 1,
                    'C': 2, '3': 2,
                    'D': 3, '4': 3
                };

                const mapAnswerToText = (ans) => {
                    const upperAns = ans.toUpperCase();
                    if (optionMap[upperAns] !== undefined && options[optionMap[upperAns]]) {
                        return options[optionMap[upperAns]].text;
                    }
                    return ans; // fallback to the text itself if they provided the full text
                };
                
                // For Multiple Correct, correctAnswer might be comma-separated
                if (qType === 'Multiple Correct') {
                    correctAns = correctAns.split(',').map(s => mapAnswerToText(s.trim()));
                    const allOptionsText = options.map(o => o.text);
                    const missingOption = correctAns.find(ans => !allOptionsText.includes(ans));
                    if (missingOption) {
                        errors.push(`Row ${rowNumber}: Correct answer '${missingOption}' does not match any provided option`);
                        return;
                    }
                    // The DB probably expects an array or comma-separated string depending on the model,
                    // Assuming string for now based on what was there, or array. Wait, previous code didn't join it back.
                    // If the schema expects a string, maybe it should be joined. The old code left it as an array if it was multiple correct, wait! 
                    // No, the old code actually left it as an array? Let's check `questions.push` at the end... it just passes `correctAns`. 
                    // Let's keep it as is (array).
                } else {
                    correctAns = mapAnswerToText(correctAns);
                    const allOptionsText = options.map(o => o.text);
                    if (!allOptionsText.includes(correctAns)) {
                        errors.push(`Row ${rowNumber}: Correct answer '${correctAns}' does not match any provided option`);
                        return;
                    }
                }
            } else if (qType === 'True/False') {
                options.push({ id: 'A', text: 'True' }, { id: 'B', text: 'False' });
                if (correctAns !== 'True' && correctAns !== 'False') {
                    errors.push(`Row ${rowNumber}: True/False questions must have correct answer as 'True' or 'False'`);
                    return;
                }
            } else if (!correctAns) {
                 errors.push(`Row ${rowNumber}: Correct Answer is required`);
                 return;
            }

            const sid = currentSectionId.toString();
            if (maxOrders[sid] === undefined) {
                maxOrders[sid] = 0;
            }
            maxOrders[sid]++;
            
            questions.push({
                exam: examId,
                section: currentSectionId,
                type: qType,
                questionText: qText,
                options,
                correctAnswer: correctAns,
                marks,
                explanation: row['Explanation'] || '',
                difficulty,
                order: maxOrders[sid]
            });
        });
        
        if (errors.length > 0) {
            return { success: false, errors };
        }
        
        if (examModified) {
            await exam.save();
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
