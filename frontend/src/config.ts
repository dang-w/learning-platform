// Main API URL for backend services
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Backend URL for direct API calls, identical to API_URL in most cases
export const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';