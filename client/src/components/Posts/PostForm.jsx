import React, { useState } from 'react'
import { FiImage, FiSend, FiGlobe, FiUsers } from 'react-icons/fi'
import toast from 'react-hot-toast'

const PostForm = ({ onSubmit }) => {
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [visibility, setVisibility] = useState('public')

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!content.trim() && !image) {
      toast.error("Please write something or add an image");
      return;
    }

    setLoading(true);

    try {
      let postData;

      if (image) {
        postData = new FormData();
        postData.append("content", content);
        postData.append("image", image);
        postData.append("visibility", visibility);
      } else {
        postData = { content: content.trim(), visibility };
      }

      await onSubmit(postData);

      setContent("");
      setImage(null);
    } catch {
      // The mutation displays the request error; keep the entered form intact.
    } finally {
      setLoading(false);
    }
  };

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

        {/* Visibility Options */}
        <div className="flex items-center space-x-4 border-t pt-3">
          <span className="text-sm text-gray-500">Who can see this?</span>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors ${visibility === 'public'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <FiGlobe size={14} />
              <span>Public</span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('connections')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors ${visibility === 'connections'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <FiUsers size={14} />
              <span>Connections</span>
            </button>
          </div>
        </div>

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
