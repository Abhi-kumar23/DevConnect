import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    default: "",
    trim: true,
    maxlength: [5000, "Post content cannot exceed 5000 characters"],
  },
  image: {
    type: String,
  },
  imagePublicId: {
    type: String,
    select: false,
  },
  visibility: {
    type: String,
    enum: ['public', 'connections'],
    default: 'public'
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      text: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
},
{ timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

export default Post;
