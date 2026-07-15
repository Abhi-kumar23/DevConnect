// controllers/postController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

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
        const image = await uploadOnCloudinary(req.file.path, "devconnect/posts");

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

    await post.populate("user", "firstName lastName profilePicture");

    return res
        .status(201)
        .json(new ApiResponse(201, post, "Post created successfully"));
});


const getFeed = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id).select("connections");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const connections = user.connections || [];

    const visibilityFilter = {
        $or: [
            // Everyone can see public posts
            { visibility: "public" },

            // Users can always see their own posts
            { user: req.user._id },

            // Connections can see connections-only posts
            {
                user: { $in: connections },
                visibility: "connections",
            },
        ],
    };

    const [posts, total] = await Promise.all([
        Post.find(visibilityFilter)
            .select("content image visibility likes comments createdAt user")
            .populate("user", "firstName lastName profilePicture")
            .populate("comments.user", "firstName lastName profilePicture")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),

        Post.countDocuments(visibilityFilter),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                data: posts,
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

const canAccessPost = (post, currentUserId, connections) => {
    const isOwner = post.user.toString() === currentUserId.toString();

    if (isOwner || post.visibility === "public") {
        return true;
    }

    return (
        post.visibility === "connections" &&
        connections.some(
            (connectionId) =>
                connectionId.toString() === post.user.toString()
        )
    );
};


const toggleLike = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const currentUser = await User.findById(req.user._id).select("connections");

    if (!canAccessPost(post, req.user._id, currentUser.connections || [])) {
        throw new ApiError(403, "You do not have access to this post");
    }

    const liked = post.likes.some((id) => id.toString() === req.user._id.toString());

    if (liked) {
        post.likes = post.likes.filter(id => id.toString() !== req.user._id.toString());
    } else {
        post.likes.push(req.user._id);

        if (post.user.toString() !== req.user._id.toString()) {
            await Notification.create({
                recipient: post.user,
                sender: req.user._id,
                type: "like",
                title: "New like",
                message: `${req.user.firstName} liked your post`,
                data: { postId: post._id },
                actionUrl: "/",
            });
        }
    }

    await post.save();

    return res.status(200).json(
        new ApiResponse(200, {
            liked: !liked,
            likesCount: post.likes.length
        }, liked ? "Post unliked" : "Post liked")
    );
});

const addComment = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const text = String(req.body?.text || "").trim();

    if (!text) {
        throw new ApiError(400, "Comment text is required");
    }

    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const currentUser = await User.findById(req.user._id).select("connections");
    if (!canAccessPost(post, req.user._id, currentUser?.connections || [])) {
        throw new ApiError(403, "You do not have access to this post");
    }

    const comment = {
        user: req.user._id,
        text
    };

    post.comments.push(comment);
    await post.save();

    if (post.user.toString() !== req.user._id.toString()) {
        await Notification.create({
            recipient: post.user,
            sender: req.user._id,
            type: "comment",
            title: "New comment",
            message: `${req.user.firstName} commented on your post`,
            data: { postId: post._id },
            actionUrl: "/",
        });
    }

    await post.populate("comments.user", "firstName lastName profilePicture");

    return res.status(200).json(
        new ApiResponse(200, post.comments, "Comment added successfully")
    );
});

const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    if (post.user.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized to delete this post");
    }

    const postWithImageId = await Post.findById(postId).select("+imagePublicId");
    await post.deleteOne();
    if (postWithImageId?.imagePublicId) await deleteFromCloudinary(postWithImageId.imagePublicId);

    return res.status(200).json(
        new ApiResponse(200, null, "Post deleted successfully")
    );
});

const getUserPosts = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const skip = (page - 1) * limit;

  const profileOwner = await User.findById(userId).select("connections");

  if (!profileOwner) {
    throw new ApiError(404, "User not found");
  }

  const isOwner = userId === req.user._id.toString();

  const currentUser = await User.findById(req.user._id).select("connections");

  const isConnected = currentUser.connections.some(
    (connectionId) => connectionId.toString() === userId
  );

  const visibilityFilter = isOwner
    ? { user: userId }
    : {
        user: userId,
        $or: [
          { visibility: "public" },
          ...(isConnected ? [{ visibility: "connections" }] : []),
        ],
      };

  const [posts, total] = await Promise.all([
    Post.find(visibilityFilter)
      .populate("user", "firstName lastName profilePicture")
      .populate("comments.user", "firstName lastName profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Post.countDocuments(visibilityFilter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        data: posts,
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

export { createPost, getFeed, toggleLike, addComment, deletePost, getUserPosts };
