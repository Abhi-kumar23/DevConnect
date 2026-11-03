import api from './api';

export const projectService = {
    getProjects: (filter = 'all') => api.get(`/projects?visibility=${filter}`),
    getProjectById: (id) => api.get(`/projects/${id}`),
    createProject: (data) => api.post('/projects', data),
    sendJoinRequest: (projectId, message) => api.post(`/projects/${projectId}/join`, { message }),
    acceptRequest: (projectId, userId) => api.post(`/projects/${projectId}/accept/${userId}`),
    rejectRequest: (projectId, userId) => api.post(`/projects/${projectId}/reject/${userId}`),
    getProjectChat: (projectId) => api.get(`/projects/${projectId}/chat`),
    sendProjectMessage: (projectId, content) => api.post(`/projects/${projectId}/chat`, { content }),
};