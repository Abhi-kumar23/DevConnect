import api from './api'

export const profileService = {
  getMyProfile: () => api.get('/profiles'),
  updateProfile: (data) => api.put('/profiles', data),
  getProfileByUserId: (userId) => api.get(`/profiles/user/${userId}`),

  // Let Axios set the multipart boundary. Explicitly setting the header can cause
  // some browsers to submit a body that Multer cannot parse.
  uploadProfilePic: (formData) => api.post('/profiles/avatar', formData),
  uploadCoverPhoto: (formData) => api.post('/profiles/cover', formData),

  deleteProfile: () => api.delete('/profiles'),
  
  searchUsers: (query) => api.get('/profiles/search', { params: { q: query } }),
  getAllProfiles: (page = 1) => api.get('/profiles/all', { params: { page } }),
}
