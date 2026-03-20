const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    type: {
        type: String,
        enum: [
            'like', 'comment', 'reply',
            'connection_request', 'connection_accept',
            'message', 'mention', 'follow',
            'post_share', 'system', 'welcome'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: Date,
    isArchived: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    actionUrl: String,
    imageUrl: String,
    expiresAt: Date
}, {
    timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create notification
notificationSchema.statics.createNotification = async function({
    recipient,
    sender = null,
    type,
    title,
    message,
    data = {},
    priority = 'normal',
    actionUrl = null,
    imageUrl = null
}) {
    const notification = await this.create({
        recipient,
        sender,
        type,
        title,
        message,
        data,
        priority,
        actionUrl,
        imageUrl
    });

    // Populate sender if exists
    if (sender) {
        await notification.populate('sender', 'firstName lastName profilePicture');
    }

    return notification;
};

// Static method to mark as read
notificationSchema.statics.markAsRead = async function(notificationId, userId) {
    return this.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { 
            isRead: true,
            readAt: Date.now()
        },
        { new: true }
    );
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
    return this.updateMany(
        { recipient: userId, isRead: false },
        { 
            isRead: true,
            readAt: Date.now()
        }
    );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
    return this.countDocuments({ recipient: userId, isRead: false });
};

module.exports = mongoose.model('Notification', notificationSchema);