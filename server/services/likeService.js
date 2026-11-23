import mongoose from "mongoose";
import Like from "../models/Like.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import { ApiError } from "../utils/ApiError.js";

const targetConfig = {
  post: { Model: Post, targetModel: "Post" },
  comment: { Model: Comment, targetModel: "Comment" },
  reply: { Model: Comment, targetModel: "Comment" },
};

export async function toggleLike({ userId, targetType, targetId, replyId = null }) {
  const config = targetConfig[targetType];

  if (!config) {
    throw ApiError.badRequest("Invalid like target");
  }

  if (targetType === "reply" && !replyId) {
    throw ApiError.badRequest("replyId is required for a reply like");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        const target =
          targetType === "reply"
            ? await Comment.findOne({
                _id: targetId,
                "replies._id": replyId,
              }).session(session)
            : await config.Model.findById(targetId).session(session);

        if (!target) {
          throw ApiError.notFound("Like target not found");
        }

        const likeFilter = {
          user: userId,
          targetType,
          targetId,
          replyId: targetType === "reply" ? replyId : null,
        };

        const removedLike = await Like.findOneAndDelete(likeFilter, { session });
        const liked = !removedLike;
        const delta = liked ? 1 : -1;

        if (liked) {
          await Like.create(
            [{
              ...likeFilter,
              targetModel: config.targetModel,
            }],
            { session }
          );
        }

        let updatedTarget;

        if (targetType === "reply") {
          updatedTarget = await Comment.findOneAndUpdate(
            { _id: targetId, "replies._id": replyId },
            { $inc: { "replies.$.likesCount": delta } },
            { new: true, session }
          );

          const reply = updatedTarget?.replies.id(replyId);

          return {
            liked,
            likesCount: reply?.likesCount ?? 0,
            ownerId: reply?.user,
            postId: updatedTarget?.post,
          };
        }

        updatedTarget = await config.Model.findByIdAndUpdate(
          targetId,
          { $inc: { likesCount: delta } },
          { new: true, session }
        );

        return {
          liked,
          likesCount: updatedTarget.likesCount,
          ownerId: updatedTarget.user,
          postId: targetType === "comment" ? updatedTarget.post : updatedTarget._id,
        };
      });
    } catch (error) {
      // Two simultaneous first-likes can race on the unique index. Retry so the
      // second request becomes a deterministic unlike.
      if (error?.code !== 11000 || attempt === 2) throw error;
    } finally {
      await session.endSession();
    }
  }
}