import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for handling cookies/sessions
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token to headers if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (
      (error.response?.status === 401 || error.response?.status === 404) &&
      !originalRequest._retry &&
      originalRequest.url !== '/token/refresh' // Prevent infinite loop
    ) {
      originalRequest._retry = true;

      try {
        // Get the current refresh token from localStorage
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Try to refresh the token
        const response = await apiClient.post('/token/refresh', {
          refresh_token: refreshToken
        });

        if (response.data.access_token && response.data.refresh_token) {
          // Update tokens in localStorage
          localStorage.setItem('token', response.data.access_token);
          localStorage.setItem('refreshToken', response.data.refresh_token);

          // Update the Authorization header
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;

          // Retry the original request
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);

        // Clear tokens and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth/login?callbackUrl=' + encodeURIComponent(window.location.pathname);
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;