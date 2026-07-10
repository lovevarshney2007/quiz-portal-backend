const mongoose = require('mongoose');
const { QUESTION_TYPE, DIFFICULTY } = require('../constants/exam');

const optionSchema = new mongoose.Schema({
    id: { type: String, required: true }, // e.g., 'A', 'B', 'C', 'D'
    text: { type: String, required: true }
}, { _id: false });

const questionSchema = new mongoose.Schema({
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: Object.values(QUESTION_TYPE),
        required: true
    },
    questionText: {
        type: String,
        required: [true, 'Question text is required']
    },
    images: [{
        type: String // URLs from Cloudinary or local paths
    }],
    options: [optionSchema],
    correctAnswers: [{
        type: String, // Array of option IDs or exact answer for Numerical/Integer
        required: true
    }],
    explanation: String,
    difficulty: {
        type: String,
        enum: Object.values(DIFFICULTY),
        default: DIFFICULTY.MEDIUM
    },
    subject: { type: String, required: true },
    topic: String,
    chapter: String,
    marks: {
        type: Number,
        required: true,
        default: 4
    },
    negativeMarks: {
        type: Number,
        required: true,
        default: -1
    },
    language: {
        type: String,
        default: 'English'
    },
    tags: [String]
}, {
    timestamps: true
});

const Question = mongoose.model('Question', questionSchema);
module.exports = Question;
