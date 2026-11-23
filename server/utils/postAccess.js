import Post from "../models/Post.js";
import { ApiError } from "./ApiError.js";

const sameId = (left, right) => String(left) === String(right);

export const canViewPost = (post, viewer) => {
  if (sameId(post.user, viewer._id)) return true;
  if (post.visibility === "public") return true;

  return (
    post.visibility === "connections" &&
    (viewer.connections || []).some((connectionId) =>
      sameId(connectionId, post.user)
    )
  );
};

export const getVisiblePost = async (postId, viewer) => {
  const post = await Post.findById(postId);

  if (!post || !canViewPost(post, viewer)) {
    throw new ApiError(404, "Post not found");
  }

  return post;
};

export const visiblePostFilter = (viewer) => ({
  $or: [
    { visibility: "public" },
    { user: viewer._id },
    {
      visibility: "connections",
      user: { $in: viewer.connections || [] },
    },
  ],
});