// controllers/postController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import  Post  from "../models/Post.js";
import  User  from "../models/User.js";
import Notification from "../models/Notification.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Create Post
const createPost = asyncHandler(async (req, res) => {

    const content = req.body?.content; 
    const visibility = req.body?.visibility

    if (!content  && !req.file) {
        throw new ApiError(400, "Post must have text or an image");
    }

    let imageUrl = null;
    if (req.file) {
        console.log("File received:", req.file.path);
        const image = await uploadOnCloudinary(req.file.path);
        console.log("Cloudinary response:", image);
        if (image && image.url) {
            imageUrl = image.url;
        } else {
            console.error("Cloudinary upload failed - no URL returned");
            throw new ApiError(500, "Image upload failed. Please check Cloudinary credentials.");
        }
    }

    const post = await Post.create({
        user: req.user._id,
        content: content || "",
        image: imageUrl,
        visibility,
    });

    await post.populate("user", "firstName lastName avatar");

    return res.status(201).json(
        new ApiResponse(201, post, "Post created successfully")
    );
});

// Get Feed
const getFeed = asyncHandler(async (req, res) => {
    try {
        console.log("REQ.USER:", req.user);

        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const user = await User.findById(req.user._id);
        const connections = user?.connections || [];

        const posts = await Post.find({
            $or: [
                { user: req.user._id },
                { user: { $in: connections } }
            ]
        })
        .populate("user", "firstName lastName email avatar") // Add user data
        .populate("comments.user", "firstName lastName email avatar") // Add comment user data
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limit);

        const total = await Post.countDocuments({
            $or: [
                { user: req.user._id },
                { user: { $in: connections } }
            ]
        });

        return res.status(200).json(
            new ApiResponse(200, {
                data: posts,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }, "Feed fetched successfully")
        );

    } catch (err) {
        console.error("🔥 REAL ERROR:", err.message);
        throw new ApiError(500, err.message);
    }
});

// Like/Unlike Post
const toggleLike = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const liked = post.likes.includes(req.user._id);

    if (liked) {
        post.likes = post.likes.filter(id => id.toString() !== req.user._id.toString());
    } else {
        post.likes.push(req.user._id);
        
        // Create notification
        if (post.user.toString() !== req.user._id.toString()) {
            await Notification.create({
                recipient: post.user,
                sender: req.user._id,
                type: "like",
                message: `${req.user.firstName} liked your post`,
                post: post._id
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

// Add Comment
const addComment = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { text } = req.body;

    if (!text) {
        throw new ApiError(400, "Comment text is required");
    }

    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const comment = {
        user: req.user._id,
        text
    };

    post.comments.push(comment);
    await post.save();

    // Create notification
    if (post.user.toString() !== req.user._id.toString()) {
        await Notification.create({
            recipient: post.user,
            sender: req.user._id,
            type: "comment",
            message: `${req.user.firstName} commented on your post`,
            post: post._id
        });
    }

    await post.populate("comments.user", "firstName lastName avatar");

    return res.status(200).json(
        new ApiResponse(200, post.comments, "Comment added successfully")
    );
});

// Delete Post
const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    if (post.user.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized to delete this post");
    }

    await post.deleteOne();

    return res.status(200).json(
        new ApiResponse(200, null, "Post deleted successfully")
    );
});

export { createPost, getFeed, toggleLike, addComment, deletePost };