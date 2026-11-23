import mongoose from "mongoose";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import Post from "../models/Post.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
import Like from "../models/Like.js";
import Notification from "../models/Notification.js";

import { deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js";

// Attach the current user's like status to each post
async function attachPostLikeState(posts, userId) {
    const postIds = posts.map((post) => post._id);

    if (!postIds.length) return posts;

    const likes = await Like.find({
        user: userId,
        targetType: "post",
        targetId: { $in: postIds },
    })
        .select("targetId")
        .lean();

    const likedPostIds = new Set(
        likes.map((like) => String(like.targetId))
    );

    return posts.map((post) => ({
        ...post,
        isLiked: likedPostIds.has(String(post._id)),
    }));
}

// Create post
const createPost = asyncHandler(async (req, res) => {
    const content = req.body?.content?.trim();
    const visibility = req.body?.visibility || "public";

    if (!["public", "connections"].includes(visibility)) {
        throw new ApiError(400, "Visibility must be public or connections");
    }

    if (!content && !req.file) {
        throw new ApiError(400, "Post must have text or an image");
    }

    let imageUrl = null;
    let imagePublicId = null;

    if (req.file) {
        const image = await uploadOnCloudinary(
            req.file.path,
            "devconnect/posts"
        );

        if (!image?.secure_url) {
            throw new ApiError(500, "Image upload failed");
        }

        imageUrl = image.secure_url;
        imagePublicId = image.public_id;
    }

    const post = await Post.create({
        user: req.user._id,
        content: content || "",
        image: imageUrl,
        imagePublicId,
        visibility,
    });

    await post.populate(
        "user",
        "firstName lastName profilePicture"
    );

    return res.status(201).json(
        new ApiResponse(201, post, "Post created successfully")
    );
});

// Get feed
const getFeed = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
        Math.max(parseInt(req.query.limit, 10) || 10, 1),
        50
    );
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id).select("connections");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const connections = user.connections || [];

    const visibilityFilter = {
        $or: [
            { visibility: "public" },
            { user: req.user._id },
            {
                user: { $in: connections },
                visibility: "connections",
            },
        ],
    };

    const [posts, total] = await Promise.all([
        Post.find(visibilityFilter)
            .select(
                "user content image visibility likesCount commentsCount createdAt"
            )
            .populate(
                "user",
                "firstName lastName profilePicture"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),

        Post.countDocuments(visibilityFilter),
    ]);

    const postsWithLikeState = await attachPostLikeState(
        posts,
        req.user._id
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                data: postsWithLikeState,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
            "Feed fetched successfully"
        )
    );
});

// Delete post
const deletePost = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    let imagePublicId = null;

    try {
        await session.withTransaction(async () => {
            const post = await Post.findOne({
                _id: req.params.postId,
                user: req.user._id,
            })
                .select("+imagePublicId")
                .session(session);

            if (!post) {
                throw new ApiError(
                    404,
                    "Post not found or not owned by you"
                );
            }

            imagePublicId = post.imagePublicId;

            const comments = await Comment.find({
                post: post._id,
            })
                .select("_id")
                .session(session)
                .lean();

            const commentIds = comments.map(({ _id }) => _id);

            await Like.deleteMany(
                {
                    $or: [
                        {
                            targetType: "post",
                            targetId: post._id,
                        },
                        {
                            targetType: {
                                $in: ["comment", "reply"],
                            },
                            targetId: { $in: commentIds },
                        },
                    ],
                },
                { session }
            );

            await Comment.deleteMany(
                { post: post._id },
                { session }
            );

            await post.deleteOne({ session });
        });
    } finally {
        await session.endSession();
    }

    if (imagePublicId) {
        await deleteFromCloudinary(imagePublicId);
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Post deleted successfully")
    );
});

// Get user's posts
const getUserPosts = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
        Math.max(parseInt(req.query.limit, 10) || 10, 1),
        50
    );
    const skip = (page - 1) * limit;

    const profileOwner = await User.findById(userId).select("connections");

    if (!profileOwner) {
        throw new ApiError(404, "User not found");
    }

    const isOwner = userId === req.user._id.toString();

    const currentUser = await User.findById(req.user._id).select("connections");

    const isConnected = (currentUser?.connections || []).some(
        (connectionId) => connectionId.toString() === userId
    );

    const visibilityFilter = isOwner
        ? { user: userId }
        : {
              user: userId,
              $or: [
                  { visibility: "public" },
                  ...(isConnected
                      ? [{ visibility: "connections" }]
                      : []),
              ],
          };

    const [posts, total] = await Promise.all([
        Post.find(visibilityFilter)
            .select(
                "user content image visibility likesCount commentsCount createdAt"
            )
            .populate(
                "user",
                "firstName lastName profilePicture"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),

        Post.countDocuments(visibilityFilter),
    ]);

    const postsWithLikeState = await attachPostLikeState(
        posts,
        req.user._id
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                data: postsWithLikeState,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
            "User posts fetched successfully"
        )
    );
});

export { createPost, getFeed, deletePost, getUserPosts, deletePost};