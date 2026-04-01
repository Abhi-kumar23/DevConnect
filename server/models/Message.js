import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: [true, 'Message content is required'],
        maxlength: [5000, 'Message cannot exceed 5000 characters']
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'code', 'system'],
        default: 'text'
    },
    attachments: [{
        url: String,
        publicId: String,
        filename: String,
        fileType: String,
        fileSize: Number
    }],
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    deliveredTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editHistory: [{
        content: String,
        editedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Indexes
messageSchema.index({ chat: 1, createdAt: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ readBy: 1 });

// Virtual for read status
messageSchema.virtual('readStatus').get(function() {
    return {
        totalParticipants: this.chat.participants?.length || 0,
        readCount: this.readBy.length,
        allRead: this.readBy.length === (this.chat.participants?.length - 1)
    };
});

// Method to mark as read
messageSchema.methods.markAsRead = async function(userId) {
    if (!this.readBy.some(r => r.user.toString() === userId.toString())) {
        this.readBy.push({ user: userId });
        await this.save();
    }
};

// Method to mark as delivered
messageSchema.methods.markAsDelivered = async function(userId) {
    if (!this.deliveredTo.includes(userId)) {
        this.deliveredTo.push(userId);
        await this.save();
    }
};

// Static method to get unread count
messageSchema.statics.getUnreadCount = async function(chatId, userId) {
    return this.countDocuments({
        chat: chatId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
    });
};

const Message = mongoose.model('Message', messageSchema);

export default Message;