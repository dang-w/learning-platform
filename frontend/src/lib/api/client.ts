import axios, { AxiosError } from 'axios';

// Configure the default settings for all Axios requests
const apiClient = axios.create({
  // Use relative URLs for API requests
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for handling cookies/sessions
  timeout: 15000, // 15 second timeout for requests
});

// Helper to retrieve token from various sources
const getAuthToken = () => {
  if (typeof window === 'undefined') return null;

  // First try localStorage
  const localToken = localStorage.getItem('token');
  if (localToken) return localToken;

  // If token isn't in localStorage, it might be available only as an HTTP-only cookie
  // We can't directly access HTTP-only cookies, but the server should be able to use them
  // Just return null here, and the cookie will be sent automatically with the request
  return null;
};

// Custom network error handling
const handleNetworkError = (error: unknown) => {
  // Format network error details for better debugging
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (!axiosError.response) {
      if (axiosError.code === 'ECONNABORTED') {
        console.error('Request timeout:', axiosError.config?.url);
        return new Error('Request timed out. Please try again.');
      }
      if (axiosError.message.includes('Network Error')) {
        console.error('Network error:', axiosError.config?.url);
        return new Error('Network error. Please check your connection and try again.');
      }
    }
  }

  return error;
};

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token to headers if available
    const token = getAuthToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add session ID to headers if available
    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('sessionId') : null;
    if (sessionId) {
      config.headers['x-session-id'] = sessionId;
    }

    // Add request timestamp for debugging
    config.headers['x-request-time'] = new Date().toISOString();

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(handleNetworkError(error));
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      return Promise.reject(handleNetworkError(error));
    }

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
          console.error('No refresh token available for token refresh');
          throw new Error('No refresh token available');
        }

        console.log('Attempting to refresh token...');

        // Try to refresh the token
        const response = await apiClient.post('/token/refresh', {
          refresh_token: refreshToken
        });

        if (response.data.access_token && response.data.refresh_token) {
          console.log('Token refresh successful');

          // Update tokens in localStorage
          localStorage.setItem('token', response.data.access_token);
          localStorage.setItem('refreshToken', response.data.refresh_token);

          // Update the Authorization header
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;

          // Retry the original request
          return apiClient(originalRequest);
        } else {
          console.error('Token refresh response did not contain new tokens');
          throw new Error('Token refresh failed');
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

    // Format error responses for better debugging
    if (error.response) {
      const status = error.response.status;
      const url = error.config?.url || 'unknown';

      if (status >= 400 && status < 500) {
        console.error(`Client error (${status}) for ${url}:`, error.response.data);
      } else if (status >= 500) {
        console.error(`Server error (${status}) for ${url}:`, error.response.data);
      }

      // Add additional context to error for better error handling in components
      if (error.response.data) {
        if (typeof error.response.data === 'object' && error.response.data !== null) {
          error.response.data._statusCode = status;
          error.response.data._url = url;
        }
      }
    } else if (error.request) {
      console.error('API request made but no response received:', error.request);
    } else {
      console.error('API request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Add retry functionality for failed requests
export const withRetry = async <T>(
  requestFn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      // Don't retry if it's a client error (4xx)
      if (axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) {
        break;
      }

      // Wait before retrying
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
  }

  throw lastError;
};

export default apiClient;