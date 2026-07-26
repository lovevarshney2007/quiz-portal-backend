const mongoose = require('mongoose');
require('dotenv').config();

// Load the User model
const User = require('./models/User');

// --- CONFIGURATION ---
// IMPORTANT: Put your production MongoDB URI here before running this script if you don't have it in your local .env
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://<username>:<password>@cluster.mongodb.net/database_name?retryWrites=true&w=majority';

// Add the users you want to inject into the production database here
const usersToSeed = [
    {
        name: "Love Varshney",
        email: "love2510084@akgec.ac.in",
        studentNumber: "2510084",
        role: "Student",
        isVerified: true
    },
    {
        name: "Super Admin",
        email: "admin@akgec.ac.in",
        role: "Admin",
        isVerified: true
    },
    // --- TEST STUDENT ACCOUNTS FOR EXAM PORTAL ---
    {
        name: "Aarav Sharma",
        email: "aarav2510001@akgec.ac.in",
        studentNumber: "2510001",
        role: "Student",
        isVerified: true
    },
    {
        name: "Ananya Verma",
        email: "ananya2510002@akgec.ac.in",
        studentNumber: "2510002",
        role: "Student",
        isVerified: true
    },
    {
        name: "Rohan Gupta",
        email: "rohan2510003@akgec.ac.in",
        studentNumber: "2510003",
        role: "Student",
        isVerified: true
    },
    {
        name: "Ishita Singh",
        email: "ishita2510004@akgec.ac.in",
        studentNumber: "2510004",
        role: "Student",
        isVerified: true
    },
    {
        name: "Kabir Mehta",
        email: "kabir2510005@akgec.ac.in",
        studentNumber: "2510005",
        role: "Student",
        isVerified: true
    },
    {
        name: "Suhani Patel",
        email: "suhani2510006@akgec.ac.in",
        studentNumber: "2510006",
        role: "Student",
        isVerified: true
    },
    {
        name: "Devvrat Kumar",
        email: "devvrat2510007@akgec.ac.in",
        studentNumber: "2510007",
        role: "Student",
        isVerified: true
    },
    {
        name: "Meera Joshi",
        email: "meera2510008@akgec.ac.in",
        studentNumber: "2510008",
        role: "Student",
        isVerified: true
    },
    {
        name: "Yashvardhan Singh",
        email: "yash2510009@akgec.ac.in",
        studentNumber: "2510009",
        role: "Student",
        isVerified: true
    },
    {
        name: "Tanya Nair",
        email: "tanya2510010@akgec.ac.in",
        studentNumber: "2510010",
        role: "Student",
        isVerified: true
    }
];
// ---------------------

async function seedUsers() {
    console.log(`Connecting to database...`);
    
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Successfully connected to MongoDB.');

        for (const userData of usersToSeed) {
            try {
                // Check if user already exists
                const existingUser = await User.findOne({ email: userData.email });
                if (existingUser) {
                    console.log(`⚠️ User with email ${userData.email} already exists. Skipping.`);
                    continue;
                }

                // Create the user
                const user = await User.create(userData);
                console.log(`✅ Successfully inserted: ${user.name} (${user.email})`);
            } catch (err) {
                console.error(`❌ Failed to insert ${userData.email}:`, err.message);
            }
        }

    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('Database disconnected. Script finished.');
        process.exit(0);
    }
}

seedUsers();
