import mongoose from 'mongoose';

export const createIndexes = async () => {
    try {
        // Older versions created a unique multikey `participants_1` index. Such an
        // index makes it impossible for one user to have conversations with more
        // than one person, so remove it only when it is the old unique variant.
        const chatIndexes = await mongoose.connection.collection('chats').indexes()
            .catch((error) => error.codeName === 'NamespaceNotFound' ? [] : Promise.reject(error));
        const legacyChatIndex = chatIndexes.find((index) => index.name === 'participants_1' && index.unique);
        if (legacyChatIndex) await mongoose.connection.collection('chats').dropIndex(legacyChatIndex.name);

        // User indexes
        await mongoose.connection.collection('users').createIndex({ email: 1 });
        await mongoose.connection.collection('users').createIndex({ firstName: 'text', lastName: 'text' });
        
        // Post indexes
        await mongoose.connection.collection('posts').createIndex({ user: 1, createdAt: -1 });
        await mongoose.connection.collection('posts').createIndex({ likes: 1 });
        
        // Chat indexes
        await mongoose.connection.collection('chats').createIndex({ participants: 1, isGroupChat: 1, updatedAt: -1 });
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
