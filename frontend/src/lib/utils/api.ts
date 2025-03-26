import { tokenService } from '../services/token-service';

// Debug toggle for auth operations
const AUTH_DEBUG = true;

interface RequestWithCookies extends Request {
  cookies?: {
    'auth-token'?: string;
  };
}

/**
 * Log authentication operations when debug is enabled
 */
export const logAuthOperation = (operation: string, details: Record<string, unknown>) => {
  if (AUTH_DEBUG) {
    console.log(`Auth Operation [${operation}]:`, details);
  }
};

/**
 * Format token to ensure Bearer prefix
 */
const formatToken = (token: string): string => {
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

/**
 * Get the auth token from the TokenService
 */
export const getToken = (): string | null => {
  return tokenService.getToken();
};

/**
 * Get the auth token from request headers or cookies (for server-side API routes)
 */
export const getServerAuthToken = (request: RequestWithCookies): string | null => {
  // Try all possible token sources for maximum reliability
  let token: string | null = null;

  // Check Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    // Return the raw token without Bearer prefix
    token = authHeader.replace(/^Bearer\s+/i, '');
    logAuthOperation('getServerAuthToken', { source: 'header', hasBearer: authHeader.startsWith('Bearer ') });
    return token;
  }

  // Check cookies next
  if (request.cookies?.['auth-token']) {
    token = request.cookies['auth-token'];
    logAuthOperation('getServerAuthToken', { source: 'cookie' });
    return token;
  }

  logAuthOperation('getServerAuthToken', { status: 'failed', message: 'No token found' });
  return null;
};

/**
 * Fetch with authentication headers and automatic token refresh
 */
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    // Get fresh token
    const token = tokenService.getToken();

    // Prepare headers with authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers instanceof Headers ? Object.fromEntries(options.headers.entries()) :
        options.headers as Record<string, string> || {})
    };

    // Set Authorization header if token is available
    if (token) {
      headers['Authorization'] = formatToken(token);
      logAuthOperation('fetchWithAuth', { tokenAvailable: true, url });
    } else {
      logAuthOperation('fetchWithAuth', { tokenAvailable: false, url });
    }

    const fetchOptions: RequestInit = {
      ...options,
      headers,
      credentials: 'include'
    };

    // Function to make the actual request
    const makeRequest = async (): Promise<Response> => {
      const response = await fetch(url, fetchOptions);

      if (response.status === 401 && !url.includes('/auth/token/refresh')) {
        // If token refresh is already in progress, queue this request
        if (tokenService.isRefreshingToken()) {
          logAuthOperation('fetchWithAuth', { status: 'queued', url });
          return tokenService.queueRequest(() => makeRequest());
        }

        // Start token refresh
        const newToken = await tokenService.startTokenRefresh();
        if (newToken) {
          headers['Authorization'] = formatToken(newToken);
          return fetch(url, fetchOptions);
        }

        throw new Error('Authentication failed');
      }

      return response;
    };

    return makeRequest();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Request failed');
  }
};

/**
 * Fetch JSON with authentication headers
 */
export const fetchJsonWithAuth = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  try {
    const response = await fetchWithAuth(url, options);

    if (!response.ok) {
      // If authentication failed completely, redirect to login
      if (response.status === 401 || response.status === 403) {
        tokenService.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
        throw new Error('Authentication required');
      }

      throw new Error(`Request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[fetchJsonWithAuth] Error:', error);
    throw error;
  }
};

/**
 * Utility function to retry operations with exponential backoff
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 500
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};