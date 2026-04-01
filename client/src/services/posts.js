import api from './api'

export const postsService = {
  getFeed: (page = 1, limit = 20) => api.get(`/posts/feed?page=${page}&limit=${limit}`),
  createPost: (data) => {
    if (data instanceof FormData) {
      return api.post('/posts', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post('/posts', data);
  },

  likePost: (postId) => api.post(`/posts/${postId}/like`),
  commentPost: (postId, text) => api.post(`/posts/${postId}/comment`, { text }),

  deletePost: (postId) => api.delete(`/posts/${postId}`),

  getUserPosts: (userId, page = 1, limit = 10) => api.get(`/posts/user/${userId}?page=${page}&limit=${limit}`)

}