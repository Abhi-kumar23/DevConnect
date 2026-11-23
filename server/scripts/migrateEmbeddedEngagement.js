import "../config/env.js";
import mongoose from "mongoose";
import Comment from "../models/Comment.js";
import Like from "../models/Like.js";

await mongoose.connect(process.env.MONGO_URI);

const posts = mongoose.connection.collection("posts");

try {
  for await (const post of posts.find({})) {
    const legacyComments = post.comments ?? [];
    const legacyLikes = [...new Set((post.likes ?? []).map(String))];

    const commentOps = legacyComments
      .filter((comment) => comment.user && String(comment.text ?? "").trim())
      .map((comment) => ({
        updateOne: {
          filter: { _id: comment._id },
          update: {
            $setOnInsert: {
              post: post._id,
              user: comment.user,
              content: String(comment.text).trim(),
              likesCount: 0,
              isEdited: false,
              editHistory: [],
              replies: [],
              createdAt: comment.createdAt ?? post.createdAt ?? new Date(),
              updatedAt: comment.createdAt ?? post.createdAt ?? new Date(),
            },
          },
          upsert: true,
        },
      }));

    if (commentOps.length) {
      await Comment.bulkWrite(commentOps, { ordered: false });
    }

    const likeOps = legacyLikes.map((user) => ({
      updateOne: {
        filter: {
          user: new mongoose.Types.ObjectId(user),
          targetType: "post",
          targetId: post._id,
          replyId: null,
        },
        update: {
          $setOnInsert: {
            user: new mongoose.Types.ObjectId(user),
            targetType: "post",
            targetId: post._id,
            replyId: null,
            targetModel: "Post",
            createdAt: post.createdAt ?? new Date(),
            updatedAt: post.createdAt ?? new Date(),
          },
        },
        upsert: true,
      },
    }));

    if (likeOps.length) {
      await Like.bulkWrite(likeOps, { ordered: false });
    }

    const [likesCount, commentsCount] = await Promise.all([
      Like.countDocuments({ targetType: "post", targetId: post._id }),
      Comment.countDocuments({ post: post._id }),
    ]);

    await posts.updateOne(
      { _id: post._id },
      {
        $set: { likesCount, commentsCount },
        $unset: { likes: "", comments: "" },
      }
    );
  }
} finally {
  await mongoose.disconnect();
}