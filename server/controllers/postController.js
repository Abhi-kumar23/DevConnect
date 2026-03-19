const Notification = require("../models/Notification");
const Post = require("../models/Post");
const User = require("../models/User");

const createPost = async (req, res) => {
  try {
    const post = await Post.create({
      user: req.user._id,
      text: req.body.text,
      image: req.body.image,
    });

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFeed = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user connections
    const user = await User.findById(userId);
    const connections = user.connections;

    // Pagination
    let { page = 1, limit = 20 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const posts = await Post.find({
      user: { $ne: userId }
    }).populate("user", "name email");

    const rankedPosts = posts.map(post => {
      const likeScore = post.likes.length * 3;
      const commentScore = post.comments.length * 5;

      // Recency boost
      const hoursAgo =
        (Date.now() - new Date(post.createdAt)) / (1000 * 60 * 60);

      const recencyScore = Math.max(0, 24 - hoursAgo); // fresh posts boost

      const totalScore = likeScore + commentScore + recencyScore;

      return {
        post,
        score: totalScore
      };
    });

    rankedPosts.sort((a, b) => b.score - a.score);

    const paginated = rankedPosts
      .slice((page - 1) * limit, page * limit)
      .map(item => ({
        _id: item.post._id,
        user: item.post.user,
        text: item.post.text,
        image: item.post.image,
        likeCount: item.post.likes.length,
        commentCount: item.post.comments.length,
        score: item.score,
        createdAt: item.post.createdAt
      }));

    res.json(paginated);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const likePost = async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post.likes.includes(req.user._id)) {
    post.likes.push(req.user._id);
    await post.save();

    // CREATE NOTIFICATION
    if (post.user.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.user,
        sender: req.user._id,
        type: "like",
        post: post._id,
        message: "liked your post",
      });
    }
  }

  res.json(post.likes);
};

const commentPost = async (req, res) => {
  const post = await Post.findById(req.params.id);

  post.comments.push({
    user: req.user._id,
    text: req.body.text,
  });

  await post.save();

  // CREATE NOTIFICATION
  if (post.user.toString() !== req.user._id.toString()) {
    await Notification.create({
      recipient: post.user,
      sender: req.user._id,
      type: "comment",
      post: post._id,
      message: "commented on your post",
    });
  }

  res.json(post.comments);
};

module.exports = {
  createPost,
  getFeed,
  likePost,
  commentPost,
};