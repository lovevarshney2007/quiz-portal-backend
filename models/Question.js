const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
    id: { type: String, required: true }, // e.g. A, B, C, D
    text: { type: String, required: true }
}, { _id: false });

const questionSchema = new mongoose.Schema({
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    section: {
        type: mongoose.Schema.Types.ObjectId,
        required: true // references a specific section _id inside the Exam document
    },
    type: {
        type: String,
        enum: ['Single Correct', 'Multiple Correct', 'True/False', 'Integer', 'Numerical'],
        required: true
    },
    questionText: {
        type: String,
        required: true
    },
    options: [optionSchema], // Used for Single, Multiple, True/False
    correctAnswer: {
        type: mongoose.Schema.Types.Mixed, // Could be array of strings, single string, or number
        required: true
    },
    marks: {
        type: Number,
        required: true,
        default: 1
    },
    explanation: {
        type: String
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Medium'
    },
    order: {
        type: Number,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
