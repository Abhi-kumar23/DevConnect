import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    isGroupChat: {
        type: Boolean,
        default: false
    },
    groupName: {
        type: String,
        maxlength: [100, 'Group name cannot exceed 100 characters']
    },
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    groupIcon: String,
    unreadCounts: {
        type: Map,
        of: Number,
        default: new Map()
    },
    isActive: {
        type: Boolean,
        default: true
    },
    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Indexes
// chatSchema.index({ participants: 1 });
// chatSchema.index({ lastMessageAt: -1 });
// chatSchema.index({ participants: 1, updatedAt: -1 });

// Ensure unique chat for two participants (not group)
chatSchema.index({ participants: 1 }, { 
    unique: true,
    partialFilterExpression: { isGroupChat: false }
});

// Virtual for getting other participant
chatSchema.virtual('otherParticipant').get(function() {
    if (this.isGroupChat) return null;
    return this.participants.find(p => p.toString() !== this.userId);
});

// Method to add participant
chatSchema.methods.addParticipant = async function(userId) {
    if (!this.participants.includes(userId)) {
        this.participants.push(userId);
        await this.save();
    }
};

// Method to remove participant
chatSchema.methods.removeParticipant = async function(userId) {
    this.participants = this.participants.filter(p => p.toString() !== userId.toString());
    await this.save();
};

// Method to update unread count
chatSchema.methods.incrementUnreadCount = async function(userId) {
    const currentCount = this.unreadCounts.get(userId.toString()) || 0;
    this.unreadCounts.set(userId.toString(), currentCount + 1);
    await this.save();
};

// Method to reset unread count
chatSchema.methods.resetUnreadCount = async function(userId) {
    this.unreadCounts.set(userId.toString(), 0);
    await this.save();
};

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;