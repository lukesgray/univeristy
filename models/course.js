const mongoose = require('mongoose');
const { Schema } = mongoose;

const CourseSchema = new Schema({
    subject: String,
    teacher: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher'
    },
    students: [
        {
            type: Schema.Types.ObjectId,
            ref: "Student"
        }
    ]
})

const Course = mongoose.model('Course', CourseSchema);

module.exports = Course;