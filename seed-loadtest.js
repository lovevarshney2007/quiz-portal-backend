const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

const User = require('./models/User');
const Exam = require('./models/Exam');
const Question = require('./models/Question');

const NUM_STUDENTS = 700;

async function seedLoadTest() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for Load Test Seeding...");

        // 1. Create 700 Users
        console.log(`Generating ${NUM_STUDENTS} students...`);
        const usersToInsert = [];
        for (let i = 1; i <= NUM_STUDENTS; i++) {
            const studentNum = `25${String(i).padStart(5, '0')}`;
            usersToInsert.push({
                name: `Load Test Student ${i}`,
                email: `loadtest_${studentNum}@akgec.ac.in`,
                studentNumber: studentNum,
                role: 'Student'
            });
        }

        // Delete previous load test users
        await User.deleteMany({ email: { $regex: '^loadtest_' } });
        const insertedUsers = await User.insertMany(usersToInsert);
        console.log(`Successfully inserted ${insertedUsers.length} students.`);

        // 2. Generate JWTs and export to JSON
        console.log("Generating JWTs for k6...");
        const k6Users = insertedUsers.map(user => {
            const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
            return {
                userId: user._id.toString(),
                email: user.email,
                studentNumber: user.studentNumber,
                token: accessToken
            };
        });

        fs.writeFileSync('./k6-users.json', JSON.stringify(k6Users, null, 2));
        console.log("Exported users to k6-users.json");

        // 3. Delete previous Load Test Exam & Questions
        await Exam.deleteMany({ title: "Load Test Stress Exam" });
        await Question.deleteMany({ text: { $regex: '^Load Test Q' } });

        // 4. Create Exam
        console.log("Creating Load Test Exam...");
        const adminUser = await User.findOne({ role: 'Admin' }) || usersToInsert[0];
        
        const now = new Date();
        const exam = await Exam.create({
            title: "Load Test Stress Exam",
            description: "Stress Testing Exam for 700 VUs",
            duration: 90,
            totalMarks: 100,
            passingMarks: 33,
            startTime: new Date(now.getTime() - 10 * 60 * 1000), // Started 10 mins ago
            endTime: new Date(now.getTime() + 120 * 60 * 1000), // Ends in 2 hours
            status: 'Started',
            totalQuestions: 100,
            createdBy: adminUser._id || adminUser.id,
            sections: [
                { title: 'Aptitude', order: 1, marks: 20 },
                { title: 'HTML', order: 2, marks: 20 },
                { title: 'CSS', order: 3, marks: 20 },
                { title: 'C Programming', order: 4, marks: 20 },
                { title: 'SQL', order: 5, marks: 20 }
            ]
        });

        // 5. Create 100 Questions (20 per section)
        console.log("Creating 100 Questions...");
        const questionsToInsert = [];
        
        for (let i = 1; i <= 100; i++) {
            const sectionIndex = Math.floor((i - 1) / 20);
            const sec = exam.sections[sectionIndex];
            
            questionsToInsert.push({
                exam: exam._id,
                questionText: `Load Test Question ${i} for ${sec.title}`,
                type: 'Single Correct',
                difficulty: 'Medium',
                marks: 1,
                section: sec._id,
                order: i,
                options: [
                    { id: 'a', text: 'Option A' },
                    { id: 'b', text: 'Option B' },
                    { id: 'c', text: 'Option C' },
                    { id: 'd', text: 'Option D' }
                ],
                correctAnswer: 'b'
            });
        }

        const insertedQuestions = await Question.insertMany(questionsToInsert);
        
        // Output exam id for k6 scripts
        const examData = {
            examId: exam._id.toString()
        };
        fs.writeFileSync('./k6-exam.json', JSON.stringify(examData, null, 2));
        console.log(`Created Exam ${exam._id} with ${insertedQuestions.length} questions.`);
        
        console.log("✅ Seed complete.");
    } catch (err) {
        console.error("Seeding failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

seedLoadTest();
