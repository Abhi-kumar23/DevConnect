
import mongoose from "mongoose";
import Like from "../models/Like.js";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toggleLike } from "../services/likeService.js";

// Shared handler for post, comment and reply likes
const handleToggleLike = (targetType) =>
  asyncHandler(async (req, res) => {
    const targetId =
      targetType === "post"
        ? req.params.postId
        : req.params.commentId;

    const replyId = req.params.replyId || null;

    if (!mongoose.isValidObjectId(targetId)) {
      throw new ApiError(400, "Invalid target ID");
    }

    if (targetType === "reply" && !mongoose.isValidObjectId(replyId)) {
      throw new ApiError(400, "Invalid reply ID");
    }

    const result = await toggleLike({
      userId: req.user._id,
      targetType,
      targetId,
      replyId,
    });

    if (
      result.liked &&
      String(result.ownerId) !== String(req.user._id)
    ) {
      await Notification.createNotification({
        recipient: result.ownerId,
        sender: req.user._id,
        type: "like",
        title: "New Like",
        message: `${req.user.firstName} ${req.user.lastName} liked your ${targetType}`,
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


const getLikedPosts = asyncHandler(async (req, res) => {
  const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limitNum = Math.min(
    50,
    Math.max(1, parseInt(req.query.limit, 10) || 10)
  );

  const filter = {
    user: req.user._id,
    targetType: "post",
  };

  const [likedPosts, totalLiked] = await Promise.all([
    Like.find(filter)
      .populate({
        path: "targetId",
        model: "Post",
        populate: {
          path: "user",
          select: "firstName lastName profilePicture",
        },
      })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),

    Like.countDocuments(filter),
  ]);

  const posts = likedPosts
    .filter((item) => item.targetId)
    .map((item) => ({
      ...item.targetId,
      likedAt: item.createdAt,
    }));

  const totalPages = Math.ceil(totalLiked / limitNum);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        posts,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: totalLiked,
          limit: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      },
      "Liked posts fetched successfully"
    )
  );
});

const getLikeStatus = asyncHandler(async (req, res) => {
  const { postIds = [], commentIds = [] } = req.body;

  if (!Array.isArray(postIds) || !Array.isArray(commentIds)) {
    throw new ApiError(400, "postIds and commentIds must be arrays");
  }

  if (
    [...postIds, ...commentIds].some(
      (id) => !mongoose.isValidObjectId(id)
    )
  ) {
    throw new ApiError(400, "One or more IDs are invalid");
  }

  const [postLikes, commentLikes] = await Promise.all([
    Like.find({
      user: req.user._id,
      targetType: "post",
      targetId: { $in: postIds },
    }).select("targetId"),

    Like.find({
      user: req.user._id,
      targetType: "comment",
      targetId: { $in: commentIds },
    }).select("targetId"),
  ]);

  const likedPostIds = new Set(
    postLikes.map((like) => String(like.targetId))
  );

  const likedCommentIds = new Set(
    commentLikes.map((like) => String(like.targetId))
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        posts: Object.fromEntries(
          postIds.map((id) => [id, likedPostIds.has(String(id))])
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

const getPostLikers = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  const post = await Post.findById(postId).select("_id");

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

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


export{
    togglePostLike,
    toggleCommentLike,
    toggleReplyLike,
    getLikedPosts,
    getLikeStatus,
    getPostLikers
};