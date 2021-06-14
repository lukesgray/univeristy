const mongoose = require('mongoose');
const { Schema } = mongoose;

const StudentSchema = new Schema({
    name: String,
    age: Number,
    courses: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Course'
        }
    ],
})

const Student = mongoose.model('Student', StudentSchema);

module.exports = Student;