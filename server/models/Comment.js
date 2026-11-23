import mongoose, { Schema } from "mongoose";

const editHistorySchema = new mongoose.Schema(
    {
        content: { type: String, required: true },
        editedAt: { type: Date, required: true },
    },
    { _id: false },
);

const replySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: { type: String, required: true, trim: true, maxLength: 2000 },
        likesCount: { type: Number, default: 0, min: 0 },
        isEdited: { type: Boolean, default: false },
        editHistory: { type: [editHistorySchema], default: [] },
    },
    { timestamps: true }
);

const commentSchema = new mongoose.Schema(
    {
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: true,
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxLength: 2000,
        },

        likesCount: {
            type: Number,
            default: 0,
            min: 0,
        },

        isEdited: {
            type: Boolean,
            default: false,
        },

        editHistory: {
            type: [editHistorySchema],
            default: [],
        },

        replies: {
            type: [replySchema],
            default: [],
        },

    },
    {  timestamps: true }
)


commentSchema.index({ post: 1, createdAt: -1 });

commentSchema.methods.addReply = async function (userId, content) {
  this.replies.push({ user: userId, content });
  await this.save();
  
  return this.replies[this.replies.length - 1];
};

export default mongoose.model("Comment", commentSchema);