const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
        index: true
    },
    attemptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamAttempt',
        required: true,
        unique: true
    },
    score: { type: Number, required: true },
    totalCorrect: { type: Number, required: true },
    totalWrong: { type: Number, required: true },
    totalSkipped: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    accuracy: { type: Number, required: true }, // Percentage
    timeTaken: { type: Number, required: true }, // Seconds
    rank: { type: Number },
    percentile: { type: Number }
}, {
    timestamps: true
});

resultSchema.index({ examId: 1, score: -1 }); // Useful for ranking

const Result = mongoose.model('Result', resultSchema);
module.exports = Result;
