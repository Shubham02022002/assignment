const express = require('express');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const app = express();
app.use(express.json());
app.use(bodyParser.json());
const SECRET = process.env.JWT_SECRET;

const studentSchema = new mongoose.Schema({
    username: { type: String },
    password: String,
    purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
});

const teacherSchema = new mongoose.Schema({
    username: String,
    password: String
});

const courseSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    imageLink: String,
    published: Boolean
});

const Student = mongoose.model('Student', studentSchema);
const Teacher = mongoose.model('Teacher', teacherSchema);
const Course = mongoose.model('Course', courseSchema);

const authenticateJwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.student = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, dbName: "OpenLogic" })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB', err));

app.post('/teacher/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    const teacher = await Teacher.findOne({ username });
    if (teacher) {
        res.status(403).json({ message: 'Teacher already exists' });
    } else {
        const newTeacher = new Teacher({ username, password });
        await newTeacher.save();
        const token = jwt.sign({ username, role: 'teacher' }, SECRET, { expiresIn: '1h' });
        res.json({ message: 'Teacher created successfully', token });
    }
});

app.post('/teacher/login', async (req, res) => {
    const { username, password } = req.headers;
    const teacher = await Teacher.findOne({ username, password });
    if (teacher) {
        const token = jwt.sign({ username, role: 'teacher' }, SECRET, { expiresIn: '1h' });
        res.json({ message: 'Logged in successfully', token });
    } else {
        res.status(403).json({ message: 'Invalid username or password' });
    }
});

app.post('/teacher/courses', authenticateJwt, async (req, res) => {
    const course = new Course(req.body);
    await course.save();
    res.json({ message: 'Course created successfully', courseId: course.id });
});

app.put('/teacher/courses/:courseId', authenticateJwt, async (req, res) => {
    const course = await Course.findByIdAndUpdate(req.params.courseId, req.body, { new: true });
    if (course) {
        res.json({ message: 'Course updated successfully' });
    } else {
        res.status(404).json({ message: 'Course not found' });
    }
});

app.get('/teacher/courses', authenticateJwt, async (req, res) => {
    const courses = await Course.find({});
    res.json({ courses });
});

app.post('/student/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    const student = await Student.findOne({ username });
    if (student) {
        res.status(403).json({ message: 'Student already exists' });
    } else {
        const newStudent = new Student({ username, password });
        await newStudent.save();
        const token = jwt.sign({ username, role: 'student' }, SECRET, { expiresIn: '1h' });
        res.json({ message: 'Student created successfully', token });
    }
});

app.post('/student/login', async (req, res) => {
    const { username, password } = req.headers;
    const student = await Student.findOne({ username, password });
    if (student) {
        const token = jwt.sign({ username, role: 'student' }, SECRET, { expiresIn: '1h' });
        res.json({ message: 'Logged in successfully', token });
    } else {
        res.status(403).json({ message: 'Invalid username or password' });
    }
});

app.get('/student/courses', authenticateJwt, async (req, res) => {
    const courses = await Course.find({ published: true });
    res.json({ courses });
});

app.post('/student/courses/:courseId', authenticateJwt, async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (course) {
        const student = await Student.findOne({ username: req.student.username });
        if (student) {
            student.purchasedCourses.push(course);
            await student.save();
            res.json({ message: 'Course purchased successfully' });
        } else {
            res.status(403).json({ message: 'User not found' });
        }
    } else {
        res.status(404).json({ message: 'Course not found' });
    }
});

app.get('/student/purchasedCourses', authenticateJwt, async (req, res) => {
    const student = await Student.findOne({ username: req.student.username }).populate('purchasedCourses');
    if (student) {
        res.json({ purchasedCourses: student.purchasedCourses || [] });
    } else {
        res.status(403).json({ message: 'User not found' });
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(404).json({ message: 'Invalid route!' });
});

app.listen(3000, () => console.log('Server running on port 3000'));