const { parseExcel } = require('../utils/excelParser');
const questionRepository = require('../repositories/question.repository');
const examRepository = require('../repositories/exam.repository');
const CustomError = require('../utils/customError');
const { catchAsync } = require('../middlewares/error.middleware');

const importQuestions = catchAsync(async (req, res) => {
    const { examId } = req.body;

    if (!req.file) {
        throw new CustomError('Please upload an Excel/CSV file', 400);
    }
    if (!examId) {
        throw new CustomError('Exam ID is required', 400);
    }

    const exam = await examRepository.findById(examId);
    if (!exam) {
        throw new CustomError('Exam not found', 404);
    }

    const rawData = parseExcel(req.file.path);
    const questionsToInsert = [];
    const errors = [];
    let totalMarksAdded = 0;

    rawData.forEach((row, index) => {
        try {
            // Mapping columns: Question, Option A, Option B, Option C, Option D, Correct Answer, Marks, Negative Marks, Explanation, Difficulty, Subject, Topic, Chapter
            if (!row['Question'] || !row['Option A'] || !row['Option B'] || !row['Correct Answer'] || !row['Subject']) {
                throw new Error('Missing required fields (Question, Options, Correct Answer, or Subject)');
            }

            const options = [
                { id: 'A', text: String(row['Option A']) },
                { id: 'B', text: String(row['Option B']) }
            ];
            if (row['Option C']) options.push({ id: 'C', text: String(row['Option C']) });
            if (row['Option D']) options.push({ id: 'D', text: String(row['Option D']) });

            // Correct Answer can be comma-separated like A,B
            const correctAnswers = String(row['Correct Answer']).split(',').map(ans => ans.trim());

            // Determine type automatically based on correct answers
            const type = correctAnswers.length > 1 ? 'MultipleCorrect' : 'SingleCorrect';

            const question = {
                examId,
                type,
                questionText: row['Question'],
                options,
                correctAnswers,
                explanation: row['Explanation'] || '',
                difficulty: row['Difficulty'] || 'Medium',
                subject: row['Subject'],
                topic: row['Topic'] || '',
                chapter: row['Chapter'] || '',
                marks: Number(row['Marks']) || 4,
                negativeMarks: Number(row['Negative Marks']) || -1
            };

            questionsToInsert.push(question);
            totalMarksAdded += question.marks;
        } catch (err) {
            errors.push({ row: index + 2, error: err.message }); // index + 2 accounts for header and 0-indexing
        }
    });

    if (questionsToInsert.length > 0) {
        await questionRepository.insertMany(questionsToInsert);
        exam.totalQuestions += questionsToInsert.length;
        exam.maximumMarks += totalMarksAdded;
        await exam.save();
    }

    res.status(200).json({
        status: 'success',
        message: `Imported ${questionsToInsert.length} questions.`,
        errors: errors.length > 0 ? errors : undefined
    });
});

module.exports = { importQuestions };
