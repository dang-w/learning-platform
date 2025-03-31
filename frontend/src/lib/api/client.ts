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
    // Don't add auth headers or attempt refresh for the token refresh endpoint itself
    if (config.url?.includes('token/refresh')) {
      return config;
    }

    try {
      // Get valid token, potentially refreshing if needed
      const token = await tokenService.getValidAccessToken();
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`; // Assuming token is just the token, add Bearer
    } catch (error) {
      // If getValidAccessToken fails (e.g., refresh failed, user needs login),
      // prevent the request from proceeding.
      console.error('Failed to obtain valid token for request:', config.url, error);
      // Cancel the request by throwing an error that won't be retried
      // Creating a custom error or using a specific Axios error might be better
      const cancelError = new AxiosError(
        'Failed to obtain valid token before request.',
        'ERR_AUTH_REFRESH_FAILED', // Custom code
        config
      );
      return Promise.reject(cancelError);
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

    // Ignore errors without a config, or specific errors like auth failures from request interceptor
    if (!originalRequest || error.code === 'ERR_AUTH_REFRESH_FAILED') {
      return Promise.reject(error);
    }

    // Handle refresh token endpoint errors specially - this causes immediate logout
    if (originalRequest.url?.includes('token/refresh')) {
      console.error('Error during token refresh request itself. Clearing tokens and redirecting.');
      isRefreshing = false;
      processQueue(new TokenRefreshError('Refresh token is invalid or expired'));
      tokenService.clearTokens();
      // Redirect should be handled by the UI reacting to cleared tokens/auth state
      // window.location.href = '/login';
      return Promise.reject(error);
    }

    // Only handle 401 errors, and only retry once (retryCount 0 means first attempt failed)
    if (!error.response || error.response.status !== 401 || (originalRequest._retryCount || 0) >= 1) {
      return Promise.reject(error);
    }

    // Increment retry count
    originalRequest._retryCount = 1; // Mark as the first retry attempt

    // If we're already refreshing, queue this request
    if (isRefreshing) {
      console.log('Queueing request while token refresh is in progress:', originalRequest.url);
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve,
          reject,
          request: () => apiClient(originalRequest), // The request to retry
        });
      });
    }

    // --- Start Refresh and Retry Logic ---
    isRefreshing = true;

    try {
      console.log('Attempting to retry original request after 401:', originalRequest.url);
      // The request interceptor on this retry will call getValidAccessToken
      const retryResponse = await apiClient(originalRequest);
      console.log('Retry successful for:', originalRequest.url);
      // If retry succeeds, process the queue with no error
      processQueue();
      return retryResponse; // Return the successful response from retry
    } catch (retryError) {
      console.error('Retry attempt failed for:', originalRequest.url, retryError);
      // If the retry fails (potentially due to getValidAccessToken throwing), process queue with error
      const errorToPropagate = retryError instanceof Error ? retryError : new Error('Retry failed after token refresh attempt');
      processQueue(errorToPropagate);
      // Important: Reject with the error from the *retry* attempt, not the original 401 error
      return Promise.reject(retryError);
    } finally {
      isRefreshing = false; // Always reset refreshing status
    }
  }
);

export default apiClient;