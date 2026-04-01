import api from './api'

export const profileService = {
  getMyProfile: () => api.get('/profiles'),
  updateProfile: (data) => api.post('/profiles', data),
  getProfileByUserId: (userId) => api.get(`/profiles/user/${userId}`),

  uploadProfilePic: (formData) => api.post('/profiles/avatar', formData,{headers: { 'Content-Type': 'multipart/form-data' }}),

  deleteProfile: () => api.delete('/profiles'),
  
  searchUsers: (query) => api.get(`/profiles/search?q=${query}`)
}