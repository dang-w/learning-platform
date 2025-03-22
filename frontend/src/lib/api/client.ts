import axios from 'axios';
import { BACKEND_API_URL } from '../config';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: BACKEND_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

  // Normalize URLs to use the BACKEND_API_URL directly, without the "/api" prefix
  if (standardizedUrl.startsWith('/api/')) {
    // Strip the /api prefix
    standardizedUrl = standardizedUrl.replace(/^\/api/, '');
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

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Log all requests for debugging
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);

    // Debug the final URL
    console.log(`Final Request URL: ${config.baseURL}${config.url}`);

    // Only try to access localStorage on the client
    if (typeof window !== 'undefined') {
      // Add token to requests if available
      const token = localStorage.getItem('token');

      if (token) {
        // Log sanitized token (first few chars only)
        console.log(`Request auth: Bearer ${token.substring(0, 6)}...`);

        // Set the Authorization header
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn(`Request without auth token: ${config.url}`);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only try to refresh token once per request
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Get a new token
        const response = await axios.post(`${BACKEND_API_URL}/auth/token/refresh`, {
          refresh_token: refreshToken
        });

        if (response.data.access_token) {
          // Save the new tokens
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', response.data.access_token);
            if (response.data.refresh_token) {
              localStorage.setItem('refreshToken', response.data.refresh_token);
            }
          }

          // Update the Authorization header
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;

          // Retry the original request
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;