import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const url = originalRequest?.url || ''

    const isAuthEndpoint = [
      '/auth/login',
      '/auth/google',
      '/auth/verify-otp',
      '/auth/register',
      '/auth/resend-otp',
      '/auth/refresh-token',
      '/auth/logout',
    ].some((endpoint) => url.includes(endpoint))

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      if (!refreshPromise) {
        refreshPromise = api
          .post('/auth/refresh-token')
          .finally(() => {
            refreshPromise = null
          })
      }

      await refreshPromise

      // The server sets the new access token as an HttpOnly cookie.
      return api(originalRequest)
    } catch {
      if (!window.location.pathname.includes('/login')) {
        window.location.assign('/login')
      }

      return Promise.reject(error)
    }
  }
)

export default api