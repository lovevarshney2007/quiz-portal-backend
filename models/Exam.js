const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    order: { type: Number, required: true },
    optionalTime: { type: Number }, // in minutes, if specific time allocated per section
    marks: { type: Number, required: true }
}, { _id: true });

const examSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    instructions: {
        type: String
    },
    duration: {
        type: Number, // in minutes
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Draft', 'Published', 'Started', 'Paused', 'Completed', 'Archived'],
        default: 'Draft'
    },
    totalMarks: {
        type: Number,
        required: true,
        default: 0
    },
    passingMarks: {
        type: Number,
        required: true
    },
    sections: [sectionSchema],
    totalQuestions: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);
