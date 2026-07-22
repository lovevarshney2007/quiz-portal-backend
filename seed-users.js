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
    // You can add an Admin user as well if needed:
    {
        name: "Super Admin",
        email: "admin@akgec.ac.in",
        role: "Admin",
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
