const mongoose = require('mongoose');

const connectDB = async () => {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: 30,    // 30 connections to stay safely under Mongo Atlas M0 500 limit
        minPoolSize: 10,    // Keep 10 connections warm to avoid cold-start latency
        serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB is unreachable
        socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
};

module.exports = connectDB;
