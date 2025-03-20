import axios, { AxiosError } from 'axios';

// Configure the default settings for all Axios requests
const apiClient = axios.create({
  // Use relative URLs for API requests - avoid doubled /api/api/ prefix
  baseURL: '/',
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

      // Don't retry if it's a client error (4xx) except for rate limiting (429)
      if (axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
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

// Add exponential backoff for rate-limited requests
export const withBackoff = async <T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        // Get retry delay from headers
        const retryAfter = parseInt(error.response.headers['retry-after'] || '0', 10);
        const resetTime = parseInt(error.response.headers['x-ratelimit-reset'] || '0', 10);
        const remaining = parseInt(error.response.headers['x-ratelimit-remaining'] || '0', 10);
        const limit = parseInt(error.response.headers['x-ratelimit-limit'] || '0', 10);

        // Calculate delay based on headers or fallback to exponential backoff
        let delay: number;
        if (retryAfter > 0) {
          // Use the server's suggested retry delay
          delay = retryAfter * 1000;
        } else if (resetTime > 0) {
          // Use time until rate limit reset
          const now = Math.floor(Date.now() / 1000);
          delay = Math.max(0, (resetTime - now) * 1000);
        } else {
          // Fallback to exponential backoff
          delay = Math.pow(2, attempt) * 1000;
        }

        // Log rate limit info for debugging
        console.warn(`Rate limit info - Remaining: ${remaining}/${limit}, Reset: ${new Date(resetTime * 1000).toISOString()}`);
        console.warn(`Retrying after ${delay}ms delay...`);

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retry attempts reached');
};

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Store rate limit info in response headers for monitoring
    const rateLimitHeaders = {
      limit: response.headers['x-ratelimit-limit'],
      remaining: response.headers['x-ratelimit-remaining'],
      reset: response.headers['x-ratelimit-reset']
    };

    if (rateLimitHeaders.remaining) {
      // Log when approaching rate limit
      const remaining = parseInt(rateLimitHeaders.remaining, 10);
      const limit = parseInt(rateLimitHeaders.limit || '0', 10);
      if (remaining < limit * 0.2) { // Warning at 20% remaining
        console.warn(`Rate limit warning: ${remaining}/${limit} requests remaining`);
      }
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      return Promise.reject(handleNetworkError(error));
    }

    // Handle rate limiting with exponential backoff
    if (error.response?.status === 429 && !originalRequest._backoff) {
      originalRequest._backoff = true;
      try {
        return await withBackoff(() => apiClient(originalRequest));
      } catch (backoffError) {
        // Add rate limit context to error
        if (error.response?.headers) {
          const rateLimitInfo = {
            limit: error.response.headers['x-ratelimit-limit'],
            remaining: error.response.headers['x-ratelimit-remaining'],
            reset: error.response.headers['x-ratelimit-reset'],
            retryAfter: error.response.headers['retry-after']
          };
          console.error('Rate limit exceeded:', rateLimitInfo);
        }
        return Promise.reject(backoffError);
      }
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

export default apiClient;