const mongoose = require('mongoose');
const Like = require('../models/Like');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Toggle like on post
 * @route   POST /api/likes/post/:postId
 * @access  Private
 */
const togglePostLike = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    // Validate postId
    if (!mongoose.isValidObjectId(postId)) {
        throw ApiError.badRequest('Invalid post ID');
    }

    // Find post
    const post = await Post.findById(postId);
    if (!post) {
        throw ApiError.notFound('Post not found');
    }

    // Toggle like
    const result = await Like.toggleLike(
        req.user._id,
        'post',
        postId,
        'Post'
    );

    // Update post likes count
    if (result.liked) {
        post.likesCount += 1;
        
        // Create notification (if not self-like)
        if (post.user.toString() !== req.user._id.toString()) {
            await Notification.createNotification({
                recipient: post.user,
                sender: req.user._id,
                type: 'like',
                title: 'New Like',
                message: `${req.user.firstName} ${req.user.lastName} liked your post`,
                data: {
                    postId: post._id
                },
                actionUrl: `/posts/${postId}`
            });
        }
    } else {
        post.likesCount -= 1;
    }

    await post.save();

    return res.status(200).json(
        ApiResponse.success({
            liked: result.liked,
            likesCount: post.likesCount
        }, result.liked ? 'Post liked' : 'Post unliked')
    );
});

/**
 * @desc    Toggle like on comment
 * @route   POST /api/likes/comment/:commentId
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
                },
                actionUrl: `/posts/${comment.post}`
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
 * @desc    Get user's liked posts
 * @route   GET /api/likes/posts
 * @access  Private
 */
const getLikedPosts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get liked posts with pagination
    const likedPosts = await Like.find({
        user: req.user._id,
        targetType: 'post'
    })
    .populate({
        path: 'targetId',
        model: 'Post',
        populate: {
            path: 'user',
            select: 'firstName lastName profilePicture'
        }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

    // Format response
    const posts = likedPosts
        .filter(item => item.targetId) // Filter out deleted posts
        .map(item => ({
            ...item.targetId,
            likedAt: item.createdAt
        }));

    // Get total count
    const totalLiked = await Like.countDocuments({
        user: req.user._id,
        targetType: 'post'
    });

    const totalPages = Math.ceil(totalLiked / limitNum);

    return res.status(200).json(
        ApiResponse.success({
            posts,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: totalLiked,
                limit: limitNum,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            }
        }, 'Liked posts fetched successfully')
    );
});

/**
 * @desc    Get like status for multiple items
 * @route   POST /api/likes/status
 * @access  Private
 */
const getLikeStatus = asyncHandler(async (req, res) => {
    const { postIds = [], commentIds = [] } = req.body;

    const likeStatus = {};

    // Check post likes
    if (postIds.length > 0) {
        const postLikes = await Like.find({
            user: req.user._id,
            targetType: 'post',
            targetId: { $in: postIds }
        });

        const likedPostIds = new Set(postLikes.map(l => l.targetId.toString()));

        likeStatus.posts = postIds.reduce((acc, id) => {
            acc[id] = likedPostIds.has(id.toString());
            return acc;
        }, {});
    }

    // Check comment likes
    if (commentIds.length > 0) {
        const commentLikes = await Like.find({
            user: req.user._id,
            targetType: 'comment',
            targetId: { $in: commentIds }
        });

        const likedCommentIds = new Set(commentLikes.map(l => l.targetId.toString()));

        likeStatus.comments = commentIds.reduce((acc, id) => {
            acc[id] = likedCommentIds.has(id.toString());
            return acc;
        }, {});
    }

    return res.status(200).json(
        ApiResponse.success(likeStatus, 'Like status fetched successfully')
    );
});

/**
 * @desc    Get users who liked a post
 * @route   GET /api/likes/post/:postId/users
 * @access  Private
 */
const getPostLikers = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!mongoose.isValidObjectId(postId)) {
        throw ApiError.badRequest('Invalid post ID');
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get users who liked the post
    const likes = await Like.find({
        targetType: 'post',
        targetId: postId
    })
    .populate('user', 'firstName lastName profilePicture headline')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

    const users = likes.map(like => ({
        ...like.user,
        likedAt: like.createdAt
    }));

    const totalLikes = await Like.countDocuments({
        targetType: 'post',
        targetId: postId
    });

    const totalPages = Math.ceil(totalLikes / limitNum);

    return res.status(200).json(
        ApiResponse.success({
            users,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: totalLikes,
                limit: limitNum
            }
        }, 'Post likers fetched successfully')
    );
});

module.exports = {
    togglePostLike,
    toggleCommentLike,
    getLikedPosts,
    getLikeStatus,
    getPostLikers
};