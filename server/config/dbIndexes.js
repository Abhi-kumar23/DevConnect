import mongoose from "mongoose";

// Safely drop an index if it exists
const dropIndexIfExists = async (collectionName, indexName) => {
    const collection = mongoose.connection.collection(collectionName);

    const indexes = await collection.indexes().catch((error) => {
        if (error.codeName === "NamespaceNotFound") return [];
        throw error;
    });

    const indexExists = indexes.some(
        (index) => index.name === indexName
    );

    if (indexExists) {
        await collection.dropIndex(indexName);
    }
};

export const createIndexes = async () => {
    try {
        // Remove old unique chat index if present
        const chatIndexes = await mongoose.connection
            .collection("chats")
            .indexes()
            .catch((error) =>
                error.codeName === "NamespaceNotFound" ? [] : Promise.reject(error)
            );

        const legacyChatIndex = chatIndexes.find(
            (index) =>
                index.name === "participants_1" && index.unique
        );

        if (legacyChatIndex) {
            await mongoose.connection
                .collection("chats")
                .dropIndex(legacyChatIndex.name);
        }

        // User indexes
        await mongoose.connection.collection("users").createIndex(
            { email: 1 },
            { unique: true, name: "email_1" }
        );

        await mongoose.connection.collection("users").createIndex({
            firstName: "text",
            lastName: "text",
        });

        // Post indexes
        await dropIndexIfExists("posts", "likes_1");

        await mongoose.connection.collection("posts").createIndex({
            user: 1,
            visibility: 1,
            createdAt: -1,
        });

        await mongoose.connection.collection("posts").createIndex({
            visibility: 1,
            createdAt: -1,
        });

        // Comment indexes
        await mongoose.connection.collection("comments").createIndex({
            post: 1,
            createdAt: -1,
        });

        // Like indexes
        const likeIndexes = await mongoose.connection
            .collection("likes")
            .indexes()
            .catch((error) =>
                error.codeName === "NamespaceNotFound" ? [] : Promise.reject(error)
            );

        // Find and remove the old unique index without replyId
        const oldLikeIndex = likeIndexes.find(
            (index) =>
                index.unique &&
                index.key.user === 1 &&
                index.key.targetType === 1 &&
                index.key.targetId === 1 &&
                !("replyId" in index.key)
        );

        if (oldLikeIndex) {
            await mongoose.connection
                .collection("likes")
                .dropIndex(oldLikeIndex.name);
        }

        // New unique index supports individual reply likes
        await mongoose.connection.collection("likes").createIndex(
            {
                user: 1,
                targetType: 1,
                targetId: 1,
                replyId: 1,
            },
            {
                unique: true,
                name: "user_targetType_targetId_replyId_unique",
            }
        );

        await mongoose.connection.collection("likes").createIndex({
            targetType: 1,
            targetId: 1,
            createdAt: -1,
        });

        // Chat indexes
        await mongoose.connection.collection("chats").createIndex({
            participants: 1,
            isGroupChat: 1,
            updatedAt: -1,
        });

        await mongoose.connection.collection("messages").createIndex({
            chat: 1,
            createdAt: 1,
        });

        // Notification indexes
        await mongoose.connection.collection("notifications").createIndex({
            recipient: 1,
            createdAt: -1,
        });

        await mongoose.connection.collection("notifications").createIndex({
            recipient: 1,
            isRead: 1,
        });

        // Project indexes
        await mongoose.connection.collection("projects").createIndex({
            createdBy: 1,
        });

        await mongoose.connection.collection("projects").createIndex({
            visibility: 1,
        });

        await mongoose.connection.collection("projects").createIndex({
            title: "text",
            description: "text",
            technologies: "text",
        });

        console.log("All indexes created successfully");
    } catch (error) {
        console.error("Index creation error:", error);
        throw error;
    }
};

export const createGoogleIdIndex = async () => {
    await mongoose.connection.collection("users").createIndex(
        { googleId: 1 },
        {
            unique: true,
            name: "googleId_unique_non_null",
            partialFilterExpression: {
                googleId: { $type: "string" },
            },
        }
    );

    console.log("Google ID unique index created successfully");
};