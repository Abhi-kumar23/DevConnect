import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    targetType: {
        type: String,
        enum: ['post', 'comment', 'reply'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'targetModel'
    },
    targetModel: {
        type: String,
        required: true,
        enum: ['Post', 'Comment']
    }
}, {
    timestamps: true
});

// Compound index to ensure unique likes
likeSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });

// Index for counting likes on targets
likeSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

// Static method to toggle like
likeSchema.statics.toggleLike = async function(userId, targetType, targetId, targetModel) {
    const existingLike = await this.findOne({
        user: userId,
        targetType,
        targetId
    });

    if (existingLike) {
        await existingLike.deleteOne();
        return { liked: false, likeId: null };
    }

    const like = await this.create({
        user: userId,
        targetType,
        targetId,
        targetModel
    });

    return { liked: true, likeId: like._id };
};

// Static method to get like count
likeSchema.statics.getLikeCount = async function(targetType, targetId) {
    return this.countDocuments({ targetType, targetId });
};

// Static method to check if user liked
likeSchema.statics.hasLiked = async function(userId, targetType, targetId) {
    const like = await this.findOne({ user: userId, targetType, targetId });
    return !!like;
};

const Like = mongoose.model('Like', likeSchema);
export default Like;

