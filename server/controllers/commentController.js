const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Like = require('../models/Like');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all comments for a post
 * @route   GET /api/comments/:postId
 * @access  Private
 */
const getPostComments = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { page = 1, limit = 10, sort = 'desc' } = req.query;

    // Validate postId
    if (!mongoose.isValidObjectId(postId)) {
        throw ApiError.badRequest('Invalid post ID');
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
        throw ApiError.notFound('Post not found');
    }

    // Pagination options
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get comments with pagination
    const comments = await Comment.find({ post: postId })
        .populate('user', 'firstName lastName profilePicture')
        .sort({ createdAt: sort === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

    // Get like status for each comment
    const commentIds = comments.map(c => c._id);
    const userLikes = await Like.find({
        user: req.user._id,
        targetType: 'comment',
        targetId: { $in: commentIds }
    });

    const likedCommentIds = new Set(userLikes.map(l => l.targetId.toString()));

    // Add like status to comments
    const commentsWithLikeStatus = comments.map(comment => ({
        ...comment,
        isLiked: likedCommentIds.has(comment._id.toString())
    }));

    // Get total count
    const totalComments = await Comment.countDocuments({ post: postId });
    const totalPages = Math.ceil(totalComments / limitNum);

    return res.status(200).json(
        ApiResponse.success({
            comments: commentsWithLikeStatus,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalComments,
                limit: limitNum,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            }
        }, 'Comments fetched successfully')
    );
});

/**
 * @desc    Add comment to post
 * @route   POST /api/comments/:postId
 * @access  Private
 */
const addComment = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;

    // Validate postId
    if (!mongoose.isValidObjectId(postId)) {
        throw ApiError.badRequest('Invalid post ID');
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
        throw ApiError.notFound('Post not found');
    }

    // Create comment
    const comment = await Comment.create({
        content,
        post: postId,
        user: req.user._id
    });

    // Populate user details
    await comment.populate('user', 'firstName lastName profilePicture');

    // Update post comments count
    await Post.findByIdAndUpdate(postId, {
        $inc: { commentsCount: 1 }
    });

    // Create notification for post owner (if not self-comment)
    if (post.user.toString() !== req.user._id.toString()) {
        await Notification.createNotification({
            recipient: post.user,
            sender: req.user._id,
            type: 'comment',
            title: 'New Comment',
            message: `${req.user.firstName} ${req.user.lastName} commented on your post`,
            data: {
                postId: post._id,
                commentId: comment._id
            },
            actionUrl: `/posts/${postId}`
        });
    }

    return res.status(201).json(
        ApiResponse.created(comment, 'Comment added successfully')
    );
});

/**
 * @desc    Update comment
 * @route   PUT /api/comments/:commentId
 * @access  Private
 */
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    // Validate commentId
    if (!mongoose.isValidObjectId(commentId)) {
        throw ApiError.badRequest('Invalid comment ID');
    }

    // Find comment
    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw ApiError.notFound('Comment not found');
    }

    // Check ownership
    if (comment.user.toString() !== req.user._id.toString()) {
        throw ApiError.forbidden('Not authorized to update this comment');
    }

    // Save edit history
    if (!comment.editHistory) {
        comment.editHistory = [];
    }
    comment.editHistory.push({
        content: comment.content,
        editedAt: new Date()
    });

    // Update comment
    comment.content = content;
    comment.isEdited = true;
    await comment.save();

    return res.status(200).json(
        ApiResponse.success(comment, 'Comment updated successfully')
    );
});

/**
 * @desc    Delete comment
 * @route   DELETE /api/comments/:commentId
 * @access  Private
 */
const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    // Validate commentId
    if (!mongoose.isValidObjectId(commentId)) {
        throw ApiError.badRequest('Invalid comment ID');
    }

    // Find comment
    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw ApiError.notFound('Comment not found');
    }

    // Check ownership
    if (comment.user.toString() !== req.user._id.toString()) {
        throw ApiError.forbidden('Not authorized to delete this comment');
    }

    // Start session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Delete comment
        await comment.deleteOne({ session });

        // Delete all likes associated with this comment
        await Like.deleteMany({
            targetType: 'comment',
            targetId: commentId
        }).session(session);

        // Decrement post comments count
        await Post.findByIdAndUpdate(comment.post, {
            $inc: { commentsCount: -1 }
        }).session(session);

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw ApiError.internal('Error deleting comment');
    } finally {
        session.endSession();
    }

    return res.status(200).json(
        ApiResponse.success(null, 'Comment deleted successfully')
    );
});

/**
 * @desc    Like/unlike comment
 * @route   POST /api/comments/:commentId/like
 * @access  Private
 */
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    // Validate commentId
    if (!mongoose.isValidObjectId(commentId)) {
        throw ApiError.badRequest('Invalid comment ID');
    }

    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw ApiError.notFound('Comment not found');
    }

    // Toggle like
    const result = await Like.toggleLike(
        req.user._id,
        'comment',
        commentId,
        'Comment'
    );

    // Update comment likes count
    if (result.liked) {
        comment.likesCount += 1;
        
        // Create notification (if not self-like)
        if (comment.user.toString() !== req.user._id.toString()) {
            await Notification.createNotification({
                recipient: comment.user,
                sender: req.user._id,
                type: 'like',
                title: 'New Like',
                message: `${req.user.firstName} ${req.user.lastName} liked your comment`,
                data: {
                    postId: comment.post,
                    commentId: comment._id
                }
            });
        }
    } else {
        comment.likesCount -= 1;
    }

    await comment.save();

    return res.status(200).json(
        ApiResponse.success({
            liked: result.liked,
            likesCount: comment.likesCount
        }, result.liked ? 'Comment liked' : 'Comment unliked')
    );
});

/**
 * @desc    Add reply to comment
 * @route   POST /api/comments/:commentId/reply
 * @access  Private
 */
const addReply = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    // Validate commentId
    if (!mongoose.isValidObjectId(commentId)) {
        throw ApiError.badRequest('Invalid comment ID');
    }

    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw ApiError.notFound('Comment not found');
    }

    // Add reply
    const reply = await comment.addReply(req.user._id, content);

    // Populate user details for the new reply
    await comment.populate({
        path: 'replies.user',
        select: 'firstName lastName profilePicture'
    });

    const newReply = comment.replies[comment.replies.length - 1];

    // Create notification (if not self-reply)
    if (comment.user.toString() !== req.user._id.toString()) {
        await Notification.createNotification({
            recipient: comment.user,
            sender: req.user._id,
            type: 'reply',
            title: 'New Reply',
            message: `${req.user.firstName} ${req.user.lastName} replied to your comment`,
            data: {
                postId: comment.post,
                commentId: comment._id,
                replyId: newReply._id
            }
        });
    }

    return res.status(201).json(
        ApiResponse.created(newReply, 'Reply added successfully')
    );
});

module.exports = {
    getPostComments,
    addComment,
    updateComment,
    deleteComment,
    toggleCommentLike,
    addReply
};