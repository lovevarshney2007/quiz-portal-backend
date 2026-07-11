const mongoose = require('mongoose');

const sectionResultSchema = new mongoose.Schema({
    sectionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String },
    score: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 } // Percentage
}, { _id: false });

const resultSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    totalQuestions: { type: Number, required: true },
    correctAnswers: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    skippedQuestions: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, required: true },
    accuracy: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    averageTimePerQuestion: { type: Number, default: 0 }, // in seconds
    completionTime: { type: Number, required: true }, // in seconds
    isSuspicious: { type: Boolean, default: false },
    violationCount: { type: Number, default: 0 },
    sectionWisePerformance: [sectionResultSchema],
    responses: [{
        question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
        markedAnswer: mongoose.Schema.Types.Mixed,
        isCorrect: Boolean,
        timeTaken: Number // in seconds
    }]
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
