// src/components/Posts/PostCard.jsx
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { FiHeart, FiMessageCircle, FiShare2 } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'

const PostCard = ({ post, onLike, onComment }) => {
  const { user } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isLiked, setIsLiked] = useState(post.likes?.includes(user?._id) || false)
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0)

  const handleLike = () => {
    onLike()
    setIsLiked(!isLiked)
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1)
  }

  const handleComment = (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    onComment(commentText)
    setCommentText('')
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 flex items-center space-x-3">
        <Link to={`/profile/${post.user?._id}`}>
          <img
            src={post.user?.avatar || `https://ui-avatars.com/api/?name=${post.user?.firstName}+${post.user?.lastName}&background=3b82f6&color=fff`}
            alt={post.user?.firstName}
            className="w-10 h-10 rounded-full object-cover"
          />
        </Link>
        <div className="flex-1">
          <Link to={`/profile/${post.user?._id}`} className="font-semibold hover:text-primary-600">
            {post.user?.firstName} {post.user?.lastName}
          </Link>
          <p className="text-xs text-gray-500">{post.user?.headline || 'Developer'}</p>
        </div>
        <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(post.createdAt))} ago</p>
      </div>
      
      {/* Content */}
      <div className="px-4 pb-4">
        <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
        {post.image && (
          <img src={post.image} alt="Post" className="mt-4 rounded-lg max-h-96 w-full object-cover" />
        )}
      </div>
      
      {/* Actions */}
      <div className="px-4 py-2 border-t flex justify-around">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-2 py-2 px-4 rounded-lg transition-colors ${
            isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
          }`}
        >
          <FiHeart size={20} fill={isLiked ? 'currentColor' : 'none'} />
          <span className="text-sm">{likesCount}</span>
        </button>
        
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-2 py-2 px-4 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <FiMessageCircle size={20} />
          <span className="text-sm">{post.comments?.length || 0}</span>
        </button>
        
        <button className="flex items-center space-x-2 py-2 px-4 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors">
          <FiShare2 size={20} />
          <span className="text-sm">Share</span>
        </button>
      </div>
      
      {/* Comments Section */}
      {showComments && (
        <div className="border-t p-4 space-y-4 bg-gray-50">
          <form onSubmit={handleComment} className="flex space-x-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 input-primary py-2 text-sm"
            />
            <button type="submit" className="btn-primary px-4 text-sm">Post</button>
          </form>
          
          {post.comments?.map((comment) => (
            <div key={comment._id} className="flex space-x-3">
              <img
                src={comment.user?.avatar || `https://ui-avatars.com/api/?name=${comment.user?.firstName}+${comment.user?.lastName}&background=gray&color=fff`}
                alt=""
                className="w-8 h-8 rounded-full"
              />
              <div className="flex-1 bg-white rounded-lg p-3">
                <p className="font-semibold text-sm">{comment.user?.firstName} {comment.user?.lastName}</p>
                <p className="text-sm mt-1 text-gray-700">{comment.text}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(comment.createdAt))} ago
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PostCard