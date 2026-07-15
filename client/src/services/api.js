import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const canRefresh = error.response?.status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes('/auth/refresh-token')

    if (canRefresh) {
      originalRequest._retry = true
      try {
        refreshPromise ||= api.post('/auth/refresh-token')
        const refreshResponse = await refreshPromise
        const token = refreshResponse.data?.data?.accessToken
        if (!token) throw new Error('No access token returned')
        localStorage.setItem('token', token)
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      } catch {
        localStorage.removeItem('token')
        if (!window.location.pathname.includes('/login')) window.location.assign('/login')
      } finally {
        refreshPromise = null
      }
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      if (!window.location.pathname.includes('/login')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  }
)

export default api
