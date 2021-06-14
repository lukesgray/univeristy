const mongoose = require('mongoose');
const { Schema } = mongoose;

const TeacherSchema = new Schema({
    name: String,
    age: Number,
    courses: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Course'
        }
    ]
})

const Teacher = mongoose.model('Teacher', TeacherSchema);

module.exports = Teacher;