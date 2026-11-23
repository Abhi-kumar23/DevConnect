import mongoose from "mongoose";

import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import Like from "../models/Like.js";
import Notification from "../models/Notification.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getVisiblePost } from "../utils/postAccess.js";

/**
 * Get all comments for a post
 * GET /api/comments/:postId
 */
const getPostComments = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        throw ApiError.badRequest("Invalid post ID");
    }

    // Check post visibility and access
    const post = await getVisiblePost(postId, req.user);

    const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitNum = Math.min(
        Math.max(parseInt(req.query.limit, 10) || 10, 1),
        50
    );

    const skip = (pageNum - 1) * limitNum;
    const sort = req.query.sort === "asc" ? 1 : -1;

    const [comments, totalComments] = await Promise.all([
        Comment.find({ post: post._id })
            .populate("user", "firstName lastName profilePicture")
            .populate(
                "replies.user",
                "firstName lastName profilePicture"
            )
            .sort({ createdAt: sort })
            .skip(skip)
            .limit(limitNum)
            .lean(),

        Comment.countDocuments({ post: post._id }),
    ]);

    const commentIds = comments.map((comment) => comment._id);

    const userLikes = await Like.find({
        user: req.user._id,
        targetType: "comment",
        targetId: { $in: commentIds },
    })
        .select("targetId")
        .lean();

    const likedCommentIds = new Set(
        userLikes.map((like) => String(like.targetId))
    );

    const commentsWithLikeStatus = comments.map((comment) => ({
        ...comment,
        isLiked: likedCommentIds.has(String(comment._id)),
    }));

    const totalPages = Math.ceil(totalComments / limitNum);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                comments: commentsWithLikeStatus,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalComments,
                    limit: limitNum,
                    hasNext: pageNum < totalPages,
                    hasPrev: pageNum > 1,
                },
            },
            "Comments fetched successfully"
        )
    );
});

/**
 * Add comment to post
 * POST /api/comments/:postId
 */
const addComment = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;

    if (!mongoose.isValidObjectId(postId)) {
        throw ApiError.badRequest("Invalid post ID");
    }

    if (!content?.trim()) {
        throw ApiError.badRequest("Comment content is required");
    }

    // Check post visibility and access
    const post = await getVisiblePost(postId, req.user);

    const comment = await Comment.create({
        content: content.trim(),
        post: post._id,
        user: req.user._id,
    });

    await comment.populate(
        "user",
        "firstName lastName profilePicture"
    );

    await Post.findByIdAndUpdate(post._id, {
        $inc: { commentsCount: 1 },
    });

    // Notify post owner
    if (String(post.user) !== String(req.user._id)) {
        await Notification.upsertNotification({
            recipient: post.user,
            sender: req.user._id,
            dedupeKey: `comment:${req.user._id}:${comment._id}`,
            type: "comment",
            title: "New Comment",
            message: `${req.user.firstName} ${req.user.lastName} commented on your post`,
            data: {
                postId: post._id,
                commentId: comment._id,
            },
            actionUrl: `/posts/${post._id}`,
        });
    }

    return res.status(201).json(
        new ApiResponse(201, comment, "Comment added successfully")
    );
});

/**
 * Update comment
 * PUT /api/comments/:commentId
 */
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!mongoose.isValidObjectId(commentId)) {
        throw ApiError.badRequest("Invalid comment ID");
    }

    if (!content?.trim()) {
        throw ApiError.badRequest("Comment content is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw ApiError.notFound("Comment not found");
    }

    // Check parent post visibility
    await getVisiblePost(comment.post, req.user);

    if (String(comment.user) !== String(req.user._id)) {
        throw ApiError.forbidden(
            "Not authorized to update this comment"
        );
    }

    if (!comment.editHistory) {
        comment.editHistory = [];
    }

    comment.editHistory.push({
        content: comment.content,
        editedAt: new Date(),
    });

    comment.content = content.trim();
    comment.isEdited = true;

    await comment.save();

    return res.status(200).json(
        new ApiResponse(200, comment, "Comment updated successfully")
    );
});

/**
 * Delete comment
 * DELETE /api/comments/:commentId
 */
export const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!mongoose.isValidObjectId(commentId)) {
        throw ApiError.badRequest("Invalid comment ID");
    }

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const comment = await Comment.findById(commentId).session(session);

            if (!comment) {
                throw ApiError.notFound("Comment not found");
            }

            // Check parent post visibility
            await getVisiblePost(comment.post, req.user);

            if (String(comment.user) !== String(req.user._id)) {
                throw ApiError.forbidden(
                    "Not authorized to delete this comment"
                );
            }

            // Delete likes on this comment and its replies
            await Like.deleteMany(
                {
                    targetType: { $in: ["comment", "reply"] },
                    targetId: comment._id,
                },
                { session }
            );

            await Post.updateOne(
                {
                    _id: comment.post,
                    commentsCount: { $gt: 0 },
                },
                {
                    $inc: { commentsCount: -1 },
                },
                { session }
            );

            await comment.deleteOne({ session });
        });
    } finally {
        await session.endSession();
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Comment deleted successfully")
    );
});

/**
 * Add reply to comment
 * POST /api/comments/:commentId/reply
 */
const addReply = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!mongoose.isValidObjectId(commentId)) {
        throw ApiError.badRequest("Invalid comment ID");
    }

    if (!content?.trim()) {
        throw ApiError.badRequest("Reply content is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw ApiError.notFound("Comment not found");
    }

    // Check parent post visibility
    const post = await getVisiblePost(comment.post, req.user);

    await comment.addReply(req.user._id, content.trim());

    await comment.populate({
        path: "replies.user",
        select: "firstName lastName profilePicture",
    });

    const newReply = comment.replies[comment.replies.length - 1];

    // Notify comment owner
    if (String(comment.user) !== String(req.user._id)) {
        await Notification.upsertNotification({
            recipient: comment.user,
            sender: req.user._id,
            dedupeKey: `reply:${req.user._id}:${comment._id}:${newReply._id}`,
            type: "reply",
            title: "New Reply",
            message: `${req.user.firstName} ${req.user.lastName} replied to your comment`,
            data: {
                postId: post._id,
                commentId: comment._id,
                replyId: newReply._id,
            },
            actionUrl: `/posts/${post._id}`,
        });
    }

    return res.status(201).json(
        new ApiResponse(201, newReply, "Reply added successfully")
    );
});

export {
    getPostComments,
    addComment,
    updateComment,
    addReply,
};
