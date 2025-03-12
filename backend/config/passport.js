const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const Teacher = require('../models/teacher.js');
const Student = require('../models/student.js');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
    console.error(" JWT_SECRET is missing in .env file!");
    process.exit(1);
}

passport.use('teacher-local', new LocalStrategy(
    { usernameField: 'username', passwordField: 'password' }, 
    async (username, password, done) => {
        try {
            const teacher = await Teacher.findOne({ username });
            if (!teacher) return done(null, false);

            const isMatch = await bcrypt.compare(password, teacher.password);
            if (!isMatch) return done(null, false);

            return done(null, teacher);
        } catch (err) {
            return done(err);
        }
    }
));

passport.use('student-local', new LocalStrategy(
    { usernameField: 'username', passwordField: 'password' },
    async (username, password, done) => {
        try {
            const student = await Student.findOne({ username });
            if (!student) return done(null, false);

            const isMatch = await bcrypt.compare(password, student.password);
            if (!isMatch) return done(null, false);

            return done(null, student);
        } catch (err) {
            return done(err);
        }
    }
));

const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: SECRET,
};

passport.use(new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
        const user = jwtPayload.role === 'teacher'
            ? await Teacher.findById(jwtPayload.id)
            : await Student.findById(jwtPayload.id);

        if (!user) return done(null, false);
        return done(null, user);
    } catch (err) {
        return done(err, false);
    }
}));

const authenticateJwt = passport.authenticate('jwt', { session: false });

module.exports = {
    authenticateJwt,
    passport
};
