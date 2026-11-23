import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["post", "comment", "reply"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "targetModel",
    },
    replyId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetModel: {
      type: String,
      enum: ["Post", "Comment"],
      required: true,
    },
  },
  { timestamps: true }
);

likeSchema.pre("validate", function () {
  const isReply = this.targetType === "reply";

  if (isReply && !this.replyId) {
    this.invalidate("replyId", "A reply like requires replyId");
  }

  if (!isReply && this.replyId) {
    this.invalidate("replyId", "Only reply likes may contain replyId");
  }

  if (this.targetType === "post" && this.targetModel !== "Post") {
    this.invalidate("targetModel", "Post likes must target Post");
  }

  if (["comment", "reply"].includes(this.targetType) && this.targetModel !== "Comment") {
    this.invalidate("targetModel", "Comment and reply likes must target Comment");
  }
});

likeSchema.index(
  { user: 1, targetType: 1, targetId: 1, replyId: 1 },
  { unique: true }
);

likeSchema.index({ targetType: 1, targetId: 1, replyId: 1, createdAt: -1 });

export default mongoose.model("Like", likeSchema);