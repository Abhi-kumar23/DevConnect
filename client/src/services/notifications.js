import api from './api'

export const notificationService = {
    getNotifications: () => api.get('/notifications'),
    getUnreadCount: async () => {
        const response = await api.get('/notifications/unread/count');
        // Return the count from the response
        return { data: { count: response.data?.data?.count || 0 } };
    },
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    clearAll: () => api.delete('/notifications'),
}
