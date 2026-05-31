import mongoose from 'mongoose';

export const createIndexes = async () => {
    try {
        // User indexes
        await mongoose.connection.collection('users').createIndex({ email: 1 });
        await mongoose.connection.collection('users').createIndex({ firstName: 'text', lastName: 'text' });
        
        // Post indexes
        await mongoose.connection.collection('posts').createIndex({ user: 1, createdAt: -1 });
        await mongoose.connection.collection('posts').createIndex({ likes: 1 });
        
        // Chat indexes
        await mongoose.connection.collection('chats').createIndex({ participants: 1, updatedAt: -1 });
        await mongoose.connection.collection('messages').createIndex({ chat: 1, createdAt: 1 });
        
        // Notification indexes
        await mongoose.connection.collection('notifications').createIndex({ recipient: 1, createdAt: -1 });
        await mongoose.connection.collection('notifications').createIndex({ recipient: 1, isRead: 1 });
        
        // Project indexes
        await mongoose.connection.collection('projects').createIndex({ createdBy: 1 });
        await mongoose.connection.collection('projects').createIndex({ visibility: 1 });
        await mongoose.connection.collection('projects').createIndex({ title: 'text', description: 'text' });
        
        console.log('All indexes created successfully');
    } catch (error) {
        console.error('Index creation error:', error);
    }
};