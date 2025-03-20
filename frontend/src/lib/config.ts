// API URL Configuration
export const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// This prefix is used for all API routes
export const API_PREFIX = '/api';

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