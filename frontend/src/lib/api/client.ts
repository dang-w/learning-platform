import axios from 'axios';
import { BACKEND_API_URL } from '../config';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: BACKEND_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important to include cookies in cross-origin requests
});

// Mutex for token refresh to prevent multiple simultaneous refreshes
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let refreshFailedTimestamp = 0;
const REFRESH_COOLDOWN = 5000; // 5 seconds cooldown after a failed refresh

// Utility function for API request retries with exponential backoff
export async function withBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 300
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (retries >= maxRetries) {
        throw error;
      }
      const delay = initialDelay * Math.pow(2, retries);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }
}

// Ensure API paths are standardized
function getStandardizedUrl(url: string): string {
  let standardizedUrl = url;

  // Handle frontend API routes vs direct backend calls
  // If the URL starts with /api and we're not using the absolute backend URL,
  // we should route through our Next.js API endpoints
  if (url.startsWith('/api') && !url.startsWith(BACKEND_API_URL)) {
    // This is already a Next.js API route, don't modify it
    return url;
  }

  // For direct backend API calls, ensure they go to the backend with the API prefix
  if (!url.startsWith('/api') && !url.startsWith('http')) {
    // Add /api prefix for backend calls
    standardizedUrl = '/api/' + url.replace(/^\/+/, '');
  }

  // Ensure URLs start with a leading slash if they don't already
  if (!standardizedUrl.startsWith('/') && !standardizedUrl.startsWith('http')) {
    standardizedUrl = '/' + standardizedUrl;
  }

  // Handle the case of trailing slashes consistently - remove them except for root URL
  if (standardizedUrl.length > 1 && standardizedUrl.endsWith('/')) {
    standardizedUrl = standardizedUrl.replace(/\/+$/, '');
  }

  return standardizedUrl;
}

// Request interceptor to standardize URLs
apiClient.interceptors.request.use((config) => {
  if (config.url) {
    config.url = getStandardizedUrl(config.url);
  }
  return config;
});

// Add request interceptor to add Authorization header
apiClient.interceptors.request.use(
  async (config) => {
    // Don't add auth headers to the token refresh endpoint
    if (config.url?.includes('/auth/token/refresh')) {
      return config;
    }

    try {
      // Get the token from localStorage
      const token = localStorage.getItem('token');

      if (token) {
        // Make sure headers object exists
        config.headers = config.headers || {};

        // Add the token to the Authorization header
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error setting auth header:', error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor to add auth token - update to always get the latest token
apiClient.interceptors.request.use(
  async (config) => {
    // Always get token directly from localStorage to ensure freshness
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;

        // Ensure the token is also in cookies for SSR
        document.cookie = `token=${token}; path=/; max-age=3600; SameSite=Lax`;
      }

      // Add session ID header if available
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        config.headers['x-session-id'] = sessionId;
      }
    }

    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Attempt to refresh the token and update headers
const refreshToken = async (): Promise<boolean> => {
  // Check if a refresh is already in progress, return that promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Check if we need to observe the cooldown period after a failed refresh
  const now = Date.now();
  if (refreshFailedTimestamp > 0 && now - refreshFailedTimestamp < REFRESH_COOLDOWN) {
    return false;
  }

  // Start the refresh process
  isRefreshing = true;

  // Create the refresh promise
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        console.error('No refresh token available for token refresh');
        return false;
      }

      // Call the token refresh endpoint using direct axios instead of apiClient
      // to avoid interceptor loops
      const response = await axios.post(`${BACKEND_API_URL}/api/auth/token/refresh`, {
        refresh_token: refreshToken
      }, {
        withCredentials: true
      });

      if (response.status === 200 && (response.data.token || response.data.access_token)) {
        const newToken = response.data.token || response.data.access_token;

        // Update the token in localStorage
        localStorage.setItem('token', newToken);

        // Also update in cookie
        if (typeof document !== 'undefined') {
          document.cookie = `token=${newToken}; path=/; max-age=3600; SameSite=Lax`;
        }

        // If we have a new refresh token, update that too
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);

          if (typeof document !== 'undefined') {
            document.cookie = `refresh_token=${response.data.refresh_token}; path=/; max-age=86400; SameSite=Lax`;
          }
        }

        // Update auth store state
        const authStore = await import('@/lib/store/auth-store');
        authStore.useAuthStore.setState({
          token: newToken,
          refreshToken: response.data.refresh_token || refreshToken,
          isAuthenticated: true,
          _lastTokenRefresh: Date.now()
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      refreshFailedTimestamp = Date.now();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Use axios interceptors to handle 401 responses globally
apiClient.interceptors.response.use(
  // For successful responses, just return the response
  (response) => response,

  // For errors, check if it's a 401 and try to refresh the token
  async (error) => {
    // Log error details
    console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'Network Error'}`);

    if (error.response?.status === 401) {
      // Store the original request config
      const originalRequest = error.config;

      // Prevent infinite loops - don't retry the refresh token endpoint itself
      if (originalRequest.url?.includes('/token/refresh') ||
          originalRequest.url?.includes('/auth/token/refresh')) {
        return Promise.reject(error);
      }

      try {
        // Attempt to refresh the token
        const refreshSuccessful = await refreshToken();

        if (refreshSuccessful) {
          // Update the Authorization header with the new token
          const newToken = localStorage.getItem('token');
          if (newToken) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          }

          // Retry the original request with the new token
          return axios(originalRequest);
        } else {
          // Clear auth state on token refresh failure
          const authStore = await import('@/lib/store/auth-store');
          authStore.useAuthStore.getState().logout();

          // Reject the promise to propagate the 401 error
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.error('Error during token refresh:', refreshError);

        // Clear auth state on token refresh error
        const authStore = await import('@/lib/store/auth-store');
        authStore.useAuthStore.getState().logout();

        return Promise.reject(error);
      }
    }

    // For other errors, just reject the promise
    return Promise.reject(error);
  }
);

export default apiClient;