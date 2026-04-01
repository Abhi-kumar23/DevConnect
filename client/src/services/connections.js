import api from './api'

export const connectionsService = {
  getConnections: () => api.get('/connections'),
  getPendingRequests: () => api.get('/connections/pending'),
  getSuggestions: () => api.get('/connections/suggestions'),
  sendRequest: (userId) => api.post(`/connections/connect/${userId}`),
  acceptRequest: (userId) => api.post(`/connections/accept/${userId}`),
  rejectRequest: (userId) => api.post(`/connections/reject/${userId}`),
}