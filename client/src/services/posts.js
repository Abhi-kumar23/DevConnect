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

  likePost: (postId) => api.post(`/likes/post/${postId}`),
  getComments: (postId, page = 1, limit = 20) => api.get(`/comments/post/${postId}?page=${page}&limit=${limit}`),
  commentPost: (postId, content ) => api.post(`/comments/post/${postId}`, { content }),

  deletePost: (postId) => api.delete(`/posts/${postId}`),

  getUserPosts: (userId, page = 1, limit = 10) => api.get(`/posts/user/${userId}?page=${page}&limit=${limit}`)

}