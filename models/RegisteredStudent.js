const mongoose = require('mongoose');

const registeredStudentSchema = new mongoose.Schema({
    studentNumber: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                return /^25\d{5,6}$/.test(v);
            },
            message: props => `${props.value} is not a valid 2nd year student number!`
        }
    },
    isRegistered: {
        type: Boolean,
        default: false // Becomes true when they successfully sign up
    }
}, { timestamps: true });

module.exports = mongoose.model('RegisteredStudent', registeredStudentSchema);
