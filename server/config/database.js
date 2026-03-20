const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            autoIndex: process.env.NODE_ENV === 'development',
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            logger.error('MongoDB connection error', { error: err });
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
            logger.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
            logger.info('MongoDB reconnected');
        });

    } catch (error) {
        console.error(`Error: ${error.message}`);
        logger.error('Database connection error', { error });
        process.exit(1);
    }
};

module.exports = connectDB;