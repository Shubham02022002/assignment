const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const { passport } = require('./config/passport');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(passport.initialize());


if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing in .env file!");
    process.exit(1);
}

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useUnifiedTopology: true,
    dbName: "OpenLogic"
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    });

app.use('/teacher', teacherRoutes);
app.use('/student', studentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`))
