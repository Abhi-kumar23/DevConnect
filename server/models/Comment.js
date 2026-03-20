const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, 'Comment content is required'],
        maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    likesCount: {
        type: Number,
        default: 0
    },
    replies: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true,
            maxlength: [500, 'Reply cannot exceed 500 characters']
        },
        likes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: Date
    }],
    repliesCount: {
        type: Number,
        default: 0
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
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Indexes
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ user: 1, createdAt: -1 });

// Pre-save middleware
commentSchema.pre('save', function(next) {
    if (this.isModified('likes')) {
        this.likesCount = this.likes.length;
    }
    if (this.isModified('replies')) {
        this.repliesCount = this.replies.length;
    }
    next();
});

// Method to add reply
commentSchema.methods.addReply = async function(userId, content) {
    this.replies.push({
        user: userId,
        content
    });
    this.repliesCount = this.replies.length;
    return this.save();
};

// Method to toggle like
commentSchema.methods.toggleLike = function(userId) {
    const index = this.likes.indexOf(userId);
    if (index === -1) {
        this.likes.push(userId);
    } else {
        this.likes.splice(index, 1);
    }
    this.likesCount = this.likes.length;
    return this.save();
};

module.exports = mongoose.model('Comment', commentSchema);