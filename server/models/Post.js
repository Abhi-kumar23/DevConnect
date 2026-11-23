import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  content: {
    type: String,
    default: "",
    trim: true,
    maxlength: [5000, "Post content cannot exceed 5000 characters"],
  },
  image: {
    type: String,
    default: null,
  },
  imagePublicId: {
    type: String,
    select: false,
  },

  visibility: {
    type: String,
    enum: ['public', 'connections'],
    default: 'public',
    index: true,
  },

  likesCount:{
    type: Number,
    default: 0,
    min: 0,
  },

  commentsCount: {
    type: Number,
    default: 0,
    min: 0,
  }, 
},
{ timestamps: true }
);

postSchema.index({user:1, visibility:1, createdAt: -1});
postSchema.index({visibility: 1, createdAt: -1});

export default mongoose.model("Post", postSchema);