import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { BACKEND_API_URL } from '../config';
import { tokenService } from '../services/token-service';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: BACKEND_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important to include cookies in cross-origin requests
});

// Type for request with retry flag
interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

// Request queue management
interface QueueItem {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  request: () => Promise<unknown>;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: Error | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(promise.request());
    }
  });
  failedQueue = [];
};

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
export function getStandardizedUrl(url: string): string {
  // If URL is absolute, return as is
  if (url.startsWith('http')) {
    return url;
  }

  // Remove multiple consecutive slashes and normalize
  const cleanUrl = url.replace(/\/+/g, '/');

  // If URL already starts with /api, return as is
  if (cleanUrl.startsWith('/api/')) {
    return cleanUrl;
  }

  // For auth endpoints, ensure they're properly prefixed
  if (cleanUrl.includes('auth/token/refresh')) {
    return `/api/${cleanUrl.replace(/^\//, '')}`;
  }

  // Add /api prefix for relative URLs
  return `/api/${cleanUrl.replace(/^\//, '')}`;
}

// Request interceptor to standardize URLs and add retry count
apiClient.interceptors.request.use((config: RetryableRequest) => {
  if (config.url) {
    config.url = getStandardizedUrl(config.url);
  }
  config._retryCount = config._retryCount || 0;
  return config;
});

// Add request interceptor to add Authorization header
apiClient.interceptors.request.use(
  async (config: RetryableRequest) => {
    // Don't add auth headers to the token refresh endpoint
    if (config.url?.includes('/auth/token/refresh')) {
      return config;
    }

    try {
      const token = tokenService.getToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error setting auth header:', error);
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Custom error class for token refresh failures
export class TokenRefreshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenRefreshError';
  }
}

// Add response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    // Ensure we have a config object and it's properly typed
    const originalRequest = error.config as RetryableRequest;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle refresh token endpoint errors specially
    if (originalRequest.url?.includes('/auth/token/refresh')) {
      isRefreshing = false;
      processQueue(new TokenRefreshError('Refresh token is invalid or expired'));
      tokenService.clearTokens();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Only handle 401 errors that haven't exceeded retry limit
    if (!error.response || error.response.status !== 401 || originalRequest._retryCount! >= 2) {
      return Promise.reject(error);
    }

    // Increment retry count
    originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

    // If we're already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve,
          reject,
          request: () => apiClient(originalRequest),
        });
      });
    }

    isRefreshing = true;

    try {
      // Start token refresh
      const newToken = await tokenService.startTokenRefresh();
      if (!newToken) {
        // Don't throw here, let the original caller handle the null token case.
        // The original request will be re-thrown implicitly if we don't return anything.
        console.warn('Token refresh succeeded but returned no token.');
        // Let the original 401 error propagate by not returning apiClient(originalRequest)
        // processQueue(); // Don't process queue if refresh didn't yield a useful token
        // isRefreshing = false;
        // We fall through to the finally block if present, or return undefined, causing the original error path.
      } else {
        // Update the request header with the new token
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

        // Process any queued requests ONLY if refresh was successful with a token
        processQueue();
        isRefreshing = false; // Reset only after successful refresh and queue processing

        // Retry the original request
        return apiClient(originalRequest);
      }
    } catch (refreshError) {
      // If refresh fails (promise rejected), process queue with error and clear auth state
      isRefreshing = false;
      processQueue(refreshError instanceof Error ? refreshError : new TokenRefreshError('Unknown refresh error'));

      // Only clear tokens if the refresh itself threw an error.
      if (refreshError instanceof Error) {
          tokenService.clearTokens();
          // Optional: Redirect only on actual refresh failure
          if (refreshError instanceof TokenRefreshError) { // Or specific error types
            // Check if window is defined before using it (for non-browser environments like tests)
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
      }

      // Rethrow the error caught from startTokenRefresh
      throw refreshError;
    }
    // If newToken was null, we reach here implicitly.
    // We need to ensure isRefreshing is reset and the original error is propagated.
    isRefreshing = false;
    // Reject with the original error to signify the overall operation failed due to lack of a new token
    return Promise.reject(error);
  }
);

export default apiClient;