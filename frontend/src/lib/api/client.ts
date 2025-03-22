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
  console.log(`Standardizing URL (original): ${url}`);
  let standardizedUrl = url;

  // Handle frontend API routes vs direct backend calls
  // If the URL starts with /api and we're not using the absolute backend URL,
  // we should route through our Next.js API endpoints
  if (url.startsWith('/api') && !url.startsWith(BACKEND_API_URL)) {
    // This is already a Next.js API route, don't modify it
    console.log(`Using Next.js API route: ${url}`);
    return url;
  }

  // For direct backend API calls, ensure they go to the backend with the API prefix
  if (!url.startsWith('/api') && !url.startsWith('http')) {
    // Add /api prefix for backend calls
    standardizedUrl = '/api/' + url.replace(/^\/+/, '');
    console.log(`Added /api prefix for backend call: ${standardizedUrl}`);
  }

  // Ensure URLs start with a leading slash if they don't already
  if (!standardizedUrl.startsWith('/') && !standardizedUrl.startsWith('http')) {
    standardizedUrl = '/' + standardizedUrl;
    console.log(`Added leading slash: ${standardizedUrl}`);
  }

  // Handle the case of trailing slashes consistently - remove them except for root URL
  if (standardizedUrl.length > 1 && standardizedUrl.endsWith('/')) {
    standardizedUrl = standardizedUrl.replace(/\/+$/, '');
    console.log(`Removed trailing slash: ${standardizedUrl}`);
  }

  console.log(`Standardized URL (result): ${standardizedUrl}`);
  return standardizedUrl;
}

// Request interceptor to standardize URLs
apiClient.interceptors.request.use((config) => {
  if (config.url) {
    console.log(`Standardizing URL: ${config.url}`);
    config.url = getStandardizedUrl(config.url);
    console.log(`Standardized URL result: ${config.url}`);

    // Add special debugging for learning path progress endpoint
    if (config.url.includes('learning-path/progress')) {
      console.log('*** LEARNING PATH PROGRESS REQUEST ***');
      console.log('Original URL:', config.url);
      console.log('Auth header:', config.headers.Authorization ?
        `${String(config.headers.Authorization).substring(0, 15)}...` : 'Not set');
      console.log('Request method:', config.method);
      console.log('Full config:', JSON.stringify({
        ...config,
        headers: {
          ...config.headers,
          Authorization: config.headers.Authorization ?
            `${String(config.headers.Authorization).substring(0, 15)}...` : 'Not set'
        }
      }, null, 2));
    }
  }
  return config;
});

// Request interceptor to add auth token - update to always get the latest token
apiClient.interceptors.request.use(
  async (config) => {
    // Always get token directly from localStorage to ensure freshness
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Added auth token to request:', config.url, `Bearer ${token.substring(0, 10)}...`);

        // Ensure the token is also in cookies for SSR
        document.cookie = `token=${token}; path=/; max-age=3600; SameSite=Lax`;
      } else {
        console.log('No auth token available for request:', config.url);
      }

      // Add session ID header if available
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        config.headers['x-session-id'] = sessionId;
      }
    }

    // Log API request
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    console.log('Request headers:', config.headers);

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
    console.log('Token refresh already in progress, waiting for it to complete');
    return refreshPromise;
  }

  // Check if we need to observe the cooldown period after a failed refresh
  const now = Date.now();
  if (refreshFailedTimestamp > 0 && now - refreshFailedTimestamp < REFRESH_COOLDOWN) {
    const timeLeft = Math.ceil((REFRESH_COOLDOWN - (now - refreshFailedTimestamp)) / 1000);
    console.log(`Token refresh is in cooldown period. Please wait ${timeLeft} seconds.`);
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

      // Call the token refresh endpoint
      console.log('Calling token refresh endpoint: /api/auth/token/refresh');
      const response = await axios.post('/api/auth/token/refresh', {
        refresh_token: refreshToken
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
          isAuthenticated: true
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
      console.log('Attempting to refresh token due to 401 response');

      // Store the original request config
      const originalRequest = error.config;

      // Prevent infinite loops - don't retry the refresh token endpoint itself
      if (originalRequest.url?.includes('/token/refresh')) {
        console.log('Not retrying token refresh endpoint');
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        const refreshSuccessful = await refreshToken();

        // If token refresh was successful, update the Authorization header and retry
        if (refreshSuccessful) {
          console.log('Token refreshed successfully, retrying original request');

          // Get the updated token
          const token = localStorage.getItem('token');

          // Update the Authorization header with the new token
          originalRequest.headers.Authorization = `Bearer ${token}`;

          // Retry the original request with the new token
          return apiClient(originalRequest);
        } else {
          console.log('Token refresh failed, rejecting request');

          // Redirecting to login page would be handled by the auth provider
          // This is just to ensure the error is properly propagated
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.error('Error during token refresh:', refreshError);
        return Promise.reject(error);
      }
    }

    // For all other errors, just reject the promise
    return Promise.reject(error);
  }
);

export default apiClient;