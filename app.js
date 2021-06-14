// Imported Libraries
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const path = require('path');
const methodOverride = require('method-override');

// Imported Models
const Teacher = require('./models/teacher');
const Course = require('./models/course');
const Student = require('./models/student');

// Mongoose method to connect locally to MongoDb
mongoose.connect('mongodb://localhost:27017/school', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("MONGO CONNECTION OPEN!!!");
    })
    .catch(err => {
        console.log("OH NO MONGO CONNECTION ERROR!!!");
        console.log(err);
    })



//--------Express Methods--------//

// These methods destruture "/views" and ".ejs" out of the render routes 
// so that you don't have to include them every time
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));

// This method allows "_method" to be added to the end of routes 
// so that HTML can pretend to send more requests that just GET and POST
app.use(methodOverride('_method'));

// app.use(express.static(path.join(__dirname, 'public')));

//--------Routes--------//

app.get('/grayuniversity', async (req, res) => {
    res.render('home');
})

app.get('/register', async (req, res) => {
    res.render('users/register');
})

app.get('/login', async (req, res) => {
    res.render('users/login');
})




app.get('/main', async (req, res) => {
    res.render('main');
})



//--------Teachers--------//

app.get('/teachers/index', async (req, res) => {
    const teachers = await Teacher.find({});
    res.render('teachers/index', { teachers });
})



// New Teacher Route

app.get('/teachers/new', async (req, res) => {
    res.render('teachers/new');
})
app.post('/teachers/new', async (req, res) => {
    const teacher = new Teacher(req.body);
    await teacher.save();
    res.redirect('/teachers/index');
})



// Teacher Id Routes

app.get('/teachers/view/:id', async (req, res) => {

    // finds the teacher with the id passed through in params
    const teacher = await Teacher.findById(req.params.id);

    // finds all courses in teacher's courses array
    const courses = await Course.find({ _id: { $in: teacher.courses } });

    // finds all courses with no instructor
    const emptyCourses = await Course.find({ teacher: { $exists: false } })
    // finds all students that are in classes taught by this teacher
    // populates just the "subject" field of common classes between each student and this teacher
    const students = await Student.find({ courses: { $in: teacher.courses } }).populate({
        path: 'courses',
        match: { "_id": { $in: teacher.courses } },
        select: 'subject -_id'
    });
    res.render('teachers/view', { teacher, students, courses, emptyCourses });
})

app.get('/teachers/edit/:id', async (req, res) => {
    const teacher = await Teacher.findById(req.params.id);
    res.render('teachers/edit', { teacher });
})
app.put('/teachers/edit/:id', async (req, res) => {
    const { id } = req.params;
    const teacher = await Teacher.findByIdAndUpdate(id, { ...req.body });
    await teacher.save();
    res.redirect(`/teachers/view/${id}`);
})

app.put('/teachers/addcourse/:id', async (req, res) => {
    const { id } = req.params;

    const teacher = await Teacher.findById(id);

    const course = await Course.findOneAndUpdate({ "_id": req.body.course }, { $set: { teacher: teacher.id } });
    await course.save();

    teacher.courses.push(course);
    await teacher.save();

    res.redirect(`/teachers/view/${id}`);
})

app.put('/teachers/removecourse/:id', async (req, res) => {
    const { id } = req.params;

    const teacher = await Teacher.findById(id);

    const course = await Course.findOneAndUpdate({ "_id": req.body.course }, { $unset: { teacher: teacher.id } });
    await course.save();

    teacher.courses.pull(course);
    await teacher.save();

    res.redirect(`/teachers/view/${id}`);
})

app.delete('/teachers/delete/:id', async (req, res) => {
    const { id } = req.params;
    await Teacher.findByIdAndDelete(id);
    await Course.updateMany({ teacher: id }, { $unset: { teacher: "" } });
    res.redirect(`/teachers/index`);
})



//--------Courses--------//

app.get('/courses/index', async (req, res) => {
    const courses = await Course.find({});
    res.render('courses/index', { courses });
})



// New Courses Route
app.get('/courses/new', async (req, res) => {
    const teachers = await Teacher.find({});
    res.render('courses/new', { teachers });
})

app.post('/courses/new', async (req, res) => {
    console.log(req.body);
    let course;
    if (req.body.teacher) {
        course = new Course(req.body);
        // finds teacher using id form select menu
        const teacher = await Teacher.findById(req.body.teacher);
        teacher.courses.push(course);
        await teacher.save();
    } else {
        course = new Course({ subject: req.body.subject });
    }
    await course.save();
    res.redirect('/courses/index');
})



// Course Id Routes

app.get('/courses/view/:id', async (req, res) => {
    const course = await Course.findById(req.params.id).populate('teacher').populate('students');
    res.render('courses/view', { course });
})

app.get('/courses/edit/:id', async (req, res) => {
    const teachers = await Teacher.find({});
    const course = await Course.findById(req.params.id).populate('teacher');
    res.render('courses/edit', { course, teachers });
})

app.put('/courses/edit/:id', async (req, res) => {
    console.log(req.body.subject);
    const { id } = req.params;
    let course;
    let newTeacher;
    let oldTeacher;
    if (req.body.oldTeacher && !req.body.teacher) {
        // Remove oldTeacher from course
        course = await Course.findByIdAndUpdate(id, { $unset: { teacher: "" } });
        // Remove course from oldTeacher array
        oldTeacher = await Teacher.findByIdAndUpdate(req.body.oldTeacher, { $pull: { courses: id } });
        await oldTeacher.save();
        await course.save();
    } else if (req.body.oldTeacher && req.body.teacher && req.body.oldTeacher !== req.body.teacher) {
        // Replace oldTeacher with newTeacher on course
        newTeacher = await Teacher.findById(req.body.teacher);
        course = await Course.findByIdAndUpdate(id, { $set: { teacher: newTeacher._id } });
        // Add course to newTeacher's courses array
        newTeacher.courses.push(course);
        // Remove course from oldTeacher's courses array
        oldTeacher = await Teacher.findByIdAndUpdate(req.body.oldTeacher, { $pull: { courses: id } });
        await oldTeacher.save();
        await newTeacher.save();
        await course.save();
    } else if (!req.body.oldTeacher && req.body.teacher) {
        // Add newTeacher to course
        newTeacher = await Teacher.findById(req.body.teacher);
        course = await Course.findByIdAndUpdate(id, { $set: { teacher: newTeacher._id } });
        // Add course to newTeacher course array
        newTeacher.courses.push(course);
        await newTeacher.save();
        await course.save();
    }
    course = await Course.findByIdAndUpdate(id, { $set: { subject: req.body.subject } });
    await course.save();
    res.redirect(`/courses/view/${id}`);
})

app.delete('/courses/delete/:id', async (req, res) => {
    // finds course Id in req.params and deletes the associated course
    const { id } = req.params;
    await Course.findByIdAndDelete(id);
    // finds which teacher has the course's id and removes the course from that teacher's courses array
    await Teacher.findOneAndUpdate({ courses: id }, { $pull: { courses: id } });
    // finds all students that have the course's id and removes the course from each student's courses array
    const students = await Student.updateMany({ courses: id }, { $pull: { courses: id } });
    // special variable for "updateMany()" meiddleware that counts how many students had the course's id in their courses array
    console.log(`course had ${students.n} students`);
    res.redirect(`/courses/index`);
})

//--------Students--------//

app.get('/students/index', async (req, res) => {
    const students = await Student.find({});
    res.render('students/index', { students });
})

app.get('/students/new', async (req, res) => {
    res.render('students/new');
})

app.post('/students/new', async (req, res) => {
    const student = new Student(req.body);
    await student.save();
    res.redirect('/students/index');
})

app.get('/students/view/:id', async (req, res) => {

    // finds the student with the id passed through in params
    const student = await Student.findById(req.params.id);

    // finds all courses that student is not enrolled in
    const leftCourses = await Course.find({ _id: { $nin: student.courses } });

    // finds all courses in student's courses array
    const courses = await Course.find({ _id: { $in: student.courses } });

    // finds all teachers that teach classes this student is enrolled in
    // populates just the "subject" field of common classes between each teacher and their students
    const teachers = await Teacher.find({ courses: { $in: student.courses } }).populate({
        path: 'courses',
        match: { "_id": { $in: student.courses } },
        select: 'subject -_id'
    })
    res.render('students/view', { teachers, student, courses, leftCourses });
})


app.get('/students/edit/:id', async (req, res) => {
    const student = await Student.findById(req.params.id);
    res.render('students/edit', { student });
})


app.put('/students/edit/:id', async (req, res) => {
    const { id } = req.params;
    const student = await Student.findByIdAndUpdate(id, { ...req.body });
    await student.save();
    res.redirect(`/students/view/${id}`);
})

app.put('/students/addcourse/:id', async (req, res) => {
    const { id } = req.params;
    const course = await Course.findById(req.body.course);
    const student = await Student.findById(id);
    student.courses.push(course);
    student.save();
    course.students.push(student);
    course.save();
    res.redirect(`/students/view/${id}`);
})

app.put('/students/removecourse/:id', async (req, res) => {
    const { id } = req.params;
    const course = await Course.findById(req.body.course);
    const student = await Student.findById(id);

    student.courses.pull(course);
    student.save();
    course.students.pull(student);
    course.save();

    res.redirect(`/students/view/${id}`);
})


app.delete('/students/delete/:id', async (req, res) => {
    const { id } = req.params;
    await Student.findByIdAndDelete(id);
    await Course.updateMany({ students: id }, { $pull: { students: id } });
    res.redirect(`/students/index`);
})

app.listen(1000, () => {
    console.log("App is listening on port 1000");
})
