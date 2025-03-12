const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Student = require('../models/student');
const Course = require('../models/course');
const { authenticateJwt } = require('../config/passport');

const router = express.Router();
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
    console.error("JWT_SECRET is missing in .env file!");
    process.exit(1);
}

router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Username and password are required' });

        const existingStudent = await Student.findOne({ username });
        if (existingStudent) return res.status(403).json({ message: 'Student already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newStudent = new Student({ username, password: hashedPassword });
        await newStudent.save();

        const token = jwt.sign({ id: newStudent._id, role: 'student' }, SECRET, { expiresIn: '1h' });
        res.json({ message: 'Student created successfully', token, role: 'student' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/login', async (req, res, next) => {
    passport.authenticate('student-local', { session: false }, async (err, student, info) => {
        if (err) return next(err);
        if (!student) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: student._id, role: 'student' }, SECRET, { expiresIn: '1h' });
        res.json({ message: 'Logged in successfully', token, role: 'student' });
    })(req, res, next);
});

router.get('/me', authenticateJwt, async (req, res) => {
    try {
        const student = await Student.findById(req.user.id);
        if (!student) return res.status(404).json({ message: "Student not found" });

        res.json({ username: student.username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post('/purchase/:courseId', authenticateJwt, async (req, res) => {
    try {
        const student = await Student.findById(req.user.id);
        if (!student) return res.status(404).json({ message: "Student not found" });

        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        if (student.purchasedCourses.some(courseId => courseId.toString() === course._id.toString())) {
            return res.status(400).json({ message: "Course already purchased" });
        }

        student.purchasedCourses.push(course._id);
        await student.save();

        res.json({ message: "Course purchased successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get('/purchasedCourses', authenticateJwt, async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).populate('purchasedCourses');
        if (!student) return res.status(404).json({ message: "Student not found" });

        res.json({ courses: student.purchasedCourses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get('/courses', async (req, res) => {
    try {
        const courses = await Course.find({ published: true }); 
        res.json({ courses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
