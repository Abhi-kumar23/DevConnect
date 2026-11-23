import mongoose from "mongoose";
import Like from "../models/Like.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toggleLike } from "../services/likeService.js";
import {
  getVisiblePost,
  visiblePostFilter,
} from "../utils/postAccess.js";

// Shared handler for post, comment and reply likes
const handleToggleLike = (targetType) =>
    asyncHandler(async (req, res) => {
        const targetId =
            targetType === "post"
                ? req.params.postId
                : req.params.commentId;

        const replyId = req.params.replyId || null;

        if (!mongoose.isValidObjectId(targetId)) {
            throw ApiError.badRequest("Invalid target ID");
        }

        if (
            targetType === "reply" &&
            !mongoose.isValidObjectId(replyId)
        ) {
            throw ApiError.badRequest("Invalid reply ID");
        }

        // Check whether the user can access the parent post
        if (targetType === "post") {
            await getVisiblePost(targetId, req.user);
        } else {
            const comment = await Comment.findById(targetId).select("post");

            if (!comment) {
                throw ApiError.notFound("Comment not found");
            }

            await getVisiblePost(comment.post, req.user);
        }

        const result = await toggleLike({
            userId: req.user._id,
            targetType,
            targetId,
            replyId,
        });

        // Notify the owner when a like is added
        if (
            result.liked &&
            String(result.ownerId) !== String(req.user._id)
        ) {
            await Notification.upsertNotification({
                recipient: result.ownerId,
                sender: req.user._id,
                dedupeKey: `like:${req.user._id}:${targetType}:${targetId}:${replyId || ""}`,
                type: "like",
                title: "New Like",
                message:
                    targetType === "post"
                        ? `${req.user.firstName} ${req.user.lastName} liked your post`
                        : targetType === "comment"
                            ? `${req.user.firstName} ${req.user.lastName} liked your comment`
                            : `${req.user.firstName} ${req.user.lastName} liked your reply`,
                data: {
                    postId: result.postId,
                    targetId,
                    replyId,
                },
                actionUrl: `/posts/${result.postId}`,
            });
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    liked: result.liked,
                    likesCount: result.likesCount,
                },
                result.liked ? "Liked" : "Unliked"
            )
        );
    });

const togglePostLike = handleToggleLike("post");
const toggleCommentLike = handleToggleLike("comment");
const toggleReplyLike = handleToggleLike("reply");

// Get posts liked by the current user
const getLikedPosts = asyncHandler(async (req, res) => {
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit, 10) || 10)
    );
    const skip = (pageNum - 1) * limitNum;

    const likeFilter = {
        user: req.user._id,
        targetType: "post",
    };

    const likes = await Like.find(likeFilter)
        .sort({ createdAt: -1 })
        .select("targetId createdAt")
        .lean();

    const postIds = likes.map((like) => like.targetId);

    const visiblePosts = await Post.find({
        _id: { $in: postIds },
        ...visiblePostFilter(req.user),
    })
        .populate("user", "firstName lastName profilePicture")
        .lean();

    const postById = new Map(
        visiblePosts.map((post) => [String(post._id), post])
    );

    const accessiblePosts = likes
        .map((like) => {
            const post = postById.get(String(like.targetId));

            return post
                ? {
                    ...post,
                    likedAt: like.createdAt,
                    isLiked: true,
                }
                : null;
        })
        .filter(Boolean);

    const totalItems = accessiblePosts.length;
    const posts = accessiblePosts.slice(skip, skip + limitNum);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                posts,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(totalItems / limitNum),
                    totalItems,
                    limit: limitNum,
                    hasNext: pageNum * limitNum < totalItems,
                    hasPrev: pageNum > 1,
                },
            },
            "Liked posts fetched successfully"
        )
    );
});

// Get like status for multiple posts and comments
const getLikeStatus = asyncHandler(async (req, res) => {
    const { postIds = [], commentIds = [] } = req.body;

    if (!Array.isArray(postIds) || !Array.isArray(commentIds)) {
        throw ApiError.badRequest("postIds and commentIds must be arrays");
    }

    if (
        [...postIds, ...commentIds].some(
            (id) => !mongoose.isValidObjectId(id)
        )
    ) {
        throw ApiError.badRequest("One or more IDs are invalid");
    }

    const requestedComments = await Comment.find({
        _id: { $in: commentIds },
    })
        .select("_id post")
        .lean();

    const candidatePostIds = [
        ...postIds,
        ...requestedComments.map((comment) => comment.post),
    ];

    const visiblePostIds = new Set(
        (
            await Post.find({
                _id: { $in: candidatePostIds },
                ...visiblePostFilter(req.user),
            }).distinct("_id")
        ).map(String)
    );

    const visiblePostIdList = postIds.filter((id) =>
        visiblePostIds.has(String(id))
    );

    const visibleCommentIdList = requestedComments
        .filter((comment) => visiblePostIds.has(String(comment.post)))
        .map((comment) => comment._id);

    const [postLikes, commentLikes] = await Promise.all([
        Like.find({
            user: req.user._id,
            targetType: "post",
            targetId: { $in: visiblePostIdList },
        }).select("targetId"),

        Like.find({
            user: req.user._id,
            targetType: "comment",
            targetId: { $in: visibleCommentIdList },
        }).select("targetId"),
    ]);

    const likedPostIds = new Set(postLikes.map((like) => String(like.targetId)));
    const likedCommentIds = new Set(
        commentLikes.map((like) => String(like.targetId))
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                posts: Object.fromEntries(
                    postIds.map((id) => [
                        id,
                        visiblePostIds.has(String(id)) &&
                        likedPostIds.has(String(id)),
                    ])
                ),
                comments: Object.fromEntries(
                    commentIds.map((id) => [
                        id,
                        likedCommentIds.has(String(id)),
                    ])
                ),
            },
            "Like status fetched successfully"
        )
    );
});

// Get users who liked a post
const getPostLikers = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        throw ApiError.badRequest("Invalid post ID");
    }

    await getVisiblePost(postId, req.user);

    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit, 10) || 20)
    );

    const filter = {
        targetType: "post",
        targetId: postId,
    };

    const [likes, totalLikes] = await Promise.all([
        Like.find(filter)
            .populate(
                "user",
                "firstName lastName profilePicture headline"
            )
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean(),

        Like.countDocuments(filter),
    ]);

    const users = likes
        .filter((like) => like.user)
        .map((like) => ({
            ...like.user,
            likedAt: like.createdAt,
        }));

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                users,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(totalLikes / limitNum),
                    totalItems: totalLikes,
                    limit: limitNum,
                },
            },
            "Post likers fetched successfully"
        )
    );
});

export {
    togglePostLike,
    toggleCommentLike,
    toggleReplyLike,
    getLikedPosts,
    getLikeStatus,
    getPostLikers,
};