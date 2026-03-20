const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    content: {
        type: String,
        required: [true, 'Post content is required'],
        maxlength: [5000, 'Post cannot exceed 5000 characters']
    },
    images: [{
        url: String,
        publicId: String
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    likesCount: {
        type: Number,
        default: 0
    },
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true,
            maxlength: [1000, 'Comment cannot exceed 1000 characters']
        },
        likes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        likesCount: {
            type: Number,
            default: 0
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: Date
    }],
    commentsCount: {
        type: Number,
        default: 0
    },
    tags: [String],
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    visibility: {
        type: String,
        enum: ['public', 'connections', 'private'],
        default: 'public'
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
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ content: 'text', tags: 'text' });
postSchema.index({ visibility: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ likesCount: -1 });
postSchema.index({ commentsCount: -1 });

// Virtual for engagement score
postSchema.virtual('engagementScore').get(function() {
    const likeWeight = 1;
    const commentWeight = 2;
    const recencyFactor = 1 / (Math.log(Date.now() - this.createdAt + 1) + 1);
    
    return (this.likesCount * likeWeight + this.commentsCount * commentWeight) * recencyFactor;
});

// Pre-save middleware
postSchema.pre('save', function(next) {
    if (this.isModified('likes')) {
        this.likesCount = this.likes.length;
    }
    if (this.isModified('comments')) {
        this.commentsCount = this.comments.length;
    }
    next();
});

// Method to add comment
postSchema.methods.addComment = async function(userId, content) {
    this.comments.push({
        user: userId,
        content
    });
    this.commentsCount = this.comments.length;
    return this.save();
};

// Method to like/unlike post
postSchema.methods.toggleLike = function(userId) {
    const index = this.likes.indexOf(userId);
    if (index === -1) {
        this.likes.push(userId);
    } else {
        this.likes.splice(index, 1);
    }
    this.likesCount = this.likes.length;
    return this.save();
};

module.exports = mongoose.model('Post', postSchema);