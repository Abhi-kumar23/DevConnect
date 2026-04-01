import React, { useState } from 'react'
import { FiImage, FiSend } from 'react-icons/fi'
import toast from 'react-hot-toast'

const PostForm = ({ onSubmit }) => {
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim()) {
      toast.error('Please write something')
      return
    }

    setLoading(true)

    let postData
    if (image) {
      postData = new FormData()
      postData.append('content', content)
      postData.append('image', image)
    } else {
      postData = { content }
    }

    await onSubmit(postData)

    setContent('')
    setImage(null)
    setLoading(false)
    toast.success('Post created!')
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }
    setImage(file)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          rows="3"
        />

        {image && (
          <div className="relative">
            <img src={URL.createObjectURL(image)} alt="Preview" className="max-h-48 rounded-lg" />
            <button
              type="button"
              onClick={() => setImage(null)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex justify-between">
          <label className="cursor-pointer p-2 text-gray-500 hover:text-primary-600">
            <FiImage size={20} />
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>

          <button type="submit" disabled={loading} className="btn-primary flex items-center space-x-2">
            <span>{loading ? 'Posting...' : 'Post'}</span>
            <FiSend />
          </button>
        </div>
      </form>
    </div>
  )
}

export default PostForm