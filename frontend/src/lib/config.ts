/**
 * Application configuration
 */

// Local API prefix for Next.js API routes
export const API_PREFIX = '/api';

// Backend API URL for server-to-server communication
export const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Full API URL for client-side requests (uses Next.js API routes)
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Session activity update interval in minutes
export const SESSION_UPDATE_INTERVAL = 5;

// Authentication token expiry times in seconds
export const AUTH_TOKEN_EXPIRY = {
  ACCESS_TOKEN: 3600, // 1 hour in seconds
  REFRESH_TOKEN: 86400 // 24 hours in seconds
} as const;

// Learning path endpoints
export const LEARNING_PATH_API = {
  PROGRESS: `${API_PREFIX}/learning-path/progress`,
  MODULES: `${API_PREFIX}/learning-path/modules`,
  COMPLETED: `${API_PREFIX}/learning-path/completed`,
};

// User endpoints
export const USER_API = {
  ME: `${API_PREFIX}/users/me`,
  CHANGE_PASSWORD: `${API_PREFIX}/users/me/change-password`,
  PROFILE: `${API_PREFIX}/users/me`,
};

// Auth endpoints
export const AUTH_API = {
  LOGIN: `${API_PREFIX}/auth/login`,
  LOGOUT: `${API_PREFIX}/auth/logout`,
  REGISTER: `${API_PREFIX}/auth/register`,
  REFRESH_TOKEN: `${API_PREFIX}/auth/token/refresh`,
  TOKEN: `${API_PREFIX}/token`,
};

// Resources endpoints
export const RESOURCES_API = {
  LIST: `${API_PREFIX}/resources`,
  STATS: `${API_PREFIX}/resources/statistics`,
  SEARCH: `${API_PREFIX}/resources/search`,
};

// Progress endpoints
export const PROGRESS_API = {
  METRICS: `${API_PREFIX}/progress/metrics`,
  RECENT: `${API_PREFIX}/progress/metrics/recent`,
  SUMMARY: `${API_PREFIX}/progress/summary`,
};

// Reviews endpoints
export const REVIEWS_API = {
  LIST: `${API_PREFIX}/reviews`,
  STATS: `${API_PREFIX}/reviews/statistics`,
  CREATE: `${API_PREFIX}/reviews`,
};

// Session endpoints
export const SESSION_API = {
  LIST: `${API_PREFIX}/sessions`,
  CREATE: `${API_PREFIX}/sessions`,
  ACTIVITY: (sessionId: string) => `${API_PREFIX}/sessions/${sessionId}/activity`,
};

// Knowledge endpoints
export const KNOWLEDGE_API = {
  LIST: `${API_PREFIX}/knowledge`,
  STATS: `${API_PREFIX}/knowledge/statistics`,
  SEARCH: `${API_PREFIX}/knowledge/search`,
};

// Add a helper function to get a full API URL with the appropriate prefix
export function getApiUrl(path: string): string {
  // Remove any starting slashes from path
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;

  // Check if path already includes the API prefix
  if (normalizedPath.startsWith('api/')) {
    return `${BACKEND_API_URL}/${normalizedPath}`;
  }

  // Otherwise add the prefix
  return `${BACKEND_API_URL}/${normalizedPath}`;
}