import api from './api'

export const chatService = {
  getChats: () => api.get('/chats'),
  createChat: (userId) => api.post('/chats', { userId }),
  getMessages: (chatId) => api.get(`/chats/${chatId}/messages`),
  sendMessage: (chatId, text) => api.post('/chats/message', { chatId, text }),
  markAsRead: (chatId) => api.put(`/chats/${chatId}/read`),
}