import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { BACKEND_API_URL } from '../config';
import { tokenService } from '../services/token-service';
import { cookieUtils } from '../utils/cookie';

// Define a type for the window object that might include Cypress
interface WindowWithCypress extends Window {
  Cypress?: unknown; // Use unknown for type safety, we only check for existence
}

// Check if running in Cypress test environment
const IS_CYPRESS_TEST = typeof window !== 'undefined' && !!(window as WindowWithCypress).Cypress;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: BACKEND_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Ensure this is true to send cookies
});

// Log the configured base URL at runtime
console.log(`[apiClient] Initialized with baseURL: ${apiClient.defaults.baseURL}`);
// Log if the skip header is being added
if (IS_CYPRESS_TEST) {
  console.log('[apiClient] Cypress environment detected, adding X-Skip-Rate-Limit header.');
}

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

// HTTP methods requiring CSRF protection
const CSRF_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

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

// List of public paths that don't require authentication/token refresh
// Defined here for access by both request and response interceptors
const publicPaths = [
  '/auth/login', '/api/auth/login',
  '/auth/token', '/api/auth/token',
  '/auth/register', '/api/auth/register',
  '/auth/logout', '/api/auth/logout',
  // Add other public paths if needed (e.g., '/password-reset')
];

// Request interceptor to standardize URLs, add retry count, AND add skip header
apiClient.interceptors.request.use((config: RetryableRequest) => {
  if (config.url) {
    const originalUrl = config.url;
    config.url = getStandardizedUrl(config.url);
    console.log(`[apiClient Request Interceptor 1] Standardized URL: ${originalUrl} -> ${config.url}`);
  }
  config._retryCount = config._retryCount || 0;

  // --- Add CSRF Token ---
  config.headers = config.headers || {};
  const method = config.method?.toUpperCase();
  if (method && CSRF_METHODS.includes(method)) {
    const csrfToken = cookieUtils.get('csrftoken'); // Read token from cookie
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken; // Add header
      console.log(`[apiClient Request Interceptor 1] Added X-CSRF-Token header for ${method} ${config.url}`);
    } else {
      console.warn(`[apiClient Request Interceptor 1] CSRF token cookie ('csrftoken') not found for ${method} ${config.url}. Request will likely fail if CSRF is enforced.`);
    }
  }
  // --- End CSRF Token ---

  // Add skip header dynamically just before the request if in Cypress
  if (IS_CYPRESS_TEST) {
    config.headers = config.headers || {};
    config.headers['X-Skip-Rate-Limit'] = 'true';
    console.log(`[apiClient Request Interceptor 1] Added X-Skip-Rate-Limit header for Cypress: ${config.url}`);
  }

  return config;
});

// Add request interceptor to add Authorization header
apiClient.interceptors.request.use(
  async (config: RetryableRequest) => {
    const url = config.url || '';

    // Don't add auth headers or attempt refresh for the token refresh endpoint itself OR other public paths
    if (url.includes('token/refresh') || publicPaths.some(path => url.includes(path))) {
      console.log(`[apiClient Request Interceptor 2] Skipping auth logic for public/refresh path: ${url}`);
      return config;
    }

    try {
      // Get valid token, potentially refreshing if needed
      console.log(`[apiClient Request Interceptor 2] Attempting to get valid token for: ${url}`);
      const token = await tokenService.getValidAccessToken();
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`; // Assuming token is just the token, add Bearer
      console.log(`[apiClient Request Interceptor 2] Added auth header for: ${url}`);
    } catch (error) {
      // If getValidAccessToken fails (e.g., refresh failed, user needs login),
      // prevent the request from proceeding.
      console.error('Failed to obtain valid token for request:', url, error);
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

    // Also ignore public paths in the response interceptor
    const url = originalRequest.url || '';
    if (publicPaths.some((path: string) => url.includes(path))) {
      console.log(`[apiClient Response Interceptor] Skipping refresh/retry logic for public path: ${url}`);
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
    let newAccessToken: string | null = null; // Variable to hold the new token

    try {
      console.log('Attempting token refresh after 401 on:', originalRequest.url);
      // Step 1: Attempt to refresh the token
      newAccessToken = await tokenService.startTokenRefresh();
      if (!newAccessToken) {
        throw new Error('Refresh succeeded but tokenService returned null/empty.');
      }
      console.log('Token refresh successful for:', originalRequest.url);

      // Step 2: If refresh is successful, retry the original request
      // The request interceptor (Interceptor 2) should ideally pick up the *new* token via getValidAccessToken
      // or we could manually set it here.
      // Let's rely on getValidAccessToken being called during the retry.
      console.log('Attempting to retry original request with new token:', originalRequest.url);
      const retryResponse = await apiClient(originalRequest);
      console.log('Retry successful for:', originalRequest.url);

      // Step 3: If retry succeeds, process the queue and return the response
      processQueue();
      return retryResponse;

    } catch (refreshOrRetryError) {
      console.error('Error during token refresh or retry attempt for:', originalRequest.url, refreshOrRetryError);

      // Step 4: If refresh OR retry fails, process queue with the error and reject
      const errorToPropagate = refreshOrRetryError instanceof Error
          ? refreshOrRetryError
          : new Error('Unknown error during token refresh or retry attempt');

      // If the error came from startTokenRefresh, clear tokens (as per getValidAccessToken logic)
      // Check if newAccessToken is null, meaning startTokenRefresh failed.
      if (newAccessToken === null) {
        console.log('Clearing tokens due to refresh failure during interceptor handling.');
        tokenService.clearTokens();
      }

      processQueue(errorToPropagate);
      return Promise.reject(errorToPropagate); // Reject with the specific error (refresh or retry error)

    } finally {
      isRefreshing = false; // Always reset refreshing status
    }
  }
);

export default apiClient;