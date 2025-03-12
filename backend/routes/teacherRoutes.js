const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Teacher = require('../models/teacher');
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

        const existingTeacher = await Teacher.findOne({ username });
        if (existingTeacher) return res.status(403).json({ message: 'Teacher already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newTeacher = new Teacher({ username, password: hashedPassword });
        await newTeacher.save();

        const token = jwt.sign({ id: newTeacher._id, role: 'teacher' }, SECRET, { expiresIn: '1h' });
        res.json({
            message: 'Teacher created successfully',
            token,
            role: 'teacher'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/login', async (req, res, next) => {
    passport.authenticate('teacher-local', { session: false }, async (err, teacher, info) => {
        if (err) return next(err);
        if (!teacher) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: teacher._id, role: 'teacher' }, SECRET, { expiresIn: '1h' });
        res.json({ message: 'Logged in successfully', token, role: 'teacher' });
    })(req, res, next);
});

router.get('/me', authenticateJwt, async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.user.id);
        if (!teacher) return res.status(404).json({ message: "Teacher not found" });

        res.json({ username: teacher.username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post('/addcourse', authenticateJwt, async (req, res) => {
    try {
        const { title, description, price, imageLink, published } = req.body;
        if (!title || !description || !price) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const newCourse = new Course({
            title,
            description,
            price,
            imageLink,
            published: published || false,
            createdBy: req.user.id
        });

        await newCourse.save();
        res.json({ message: "Course created successfully", course: newCourse });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get('/courses', authenticateJwt, async (req, res) => {
    try {
        const courses = await Course.find({ createdBy: req.user.id });
        res.json({ courses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.put('/course/:id', authenticateJwt, async (req, res) => {
    try {

        const { id } = req.params;
        const { title, description, price, imageLink, published } = req.body;

        const updatedCourse = await Course.findOneAndUpdate(
            { _id: id, createdBy: req.user.id },
            { title, description, price, imageLink, published },
            { new: true }  
        );

        if (!updatedCourse) {
            console.log("Course not found or unauthorized");
            return res.status(404).json({ message: "Course not found or unauthorized" });
        }

        console.log("Updated Course:", updatedCourse);
        res.json({ message: "Course updated successfully", course: updatedCourse });

    } catch (error) {
        console.error("Error updating course:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.delete('/course/:id', authenticateJwt, async (req, res) => {
    try {
        const { id } = req.params;

        const deletedCourse = await Course.findOneAndDelete({ _id: id, createdBy: req.user.id });

        if (!deletedCourse) {
            console.log("Course not found or unauthorized");
            return res.status(404).json({ message: "Course not found or unauthorized" });
        }

        console.log("Deleted Course:", deletedCourse);
        res.json({ message: "Course deleted successfully" });

    } catch (error) {
        console.error("Error deleting course:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


module.exports = router;
