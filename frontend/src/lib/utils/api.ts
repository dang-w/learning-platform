/**
 * Type for fetch options
 */
interface FetchOptions extends RequestInit {
  headers: Record<string, string>;
}

// Debug toggle for auth operations
const AUTH_DEBUG = true;

/**
 * Log authentication operations when debug is enabled
 */
export const logAuthOperation = (operation: string, details: Record<string, unknown>) => {
  if (AUTH_DEBUG) {
    console.log(`Auth Operation [${operation}]:`, details);
  }
};

/**
 * Get the auth token from localStorage or cookies
 */
export const getToken = (): string | null => {
  try {
    // Check localStorage first
    let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // Log the token source for debugging
    if (token) {
      logAuthOperation('getToken', { source: 'localStorage', tokenPrefix: token.substring(0, 10) + '...' });
      return token;
    }

    // If not in localStorage, try to get from cookies
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
      if (tokenCookie) {
        token = tokenCookie.split('=')[1];
        logAuthOperation('getToken', { source: 'cookie', tokenPrefix: token.substring(0, 10) + '...' });

        // Sync back to localStorage
        if (token && typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          logAuthOperation('tokenSync', { direction: 'cookie->localStorage' });
        }

        return token;
      }
    }

    // No token found in either storage location
    logAuthOperation('getToken', { status: 'failed', message: 'No token found in localStorage or cookies' });

    // At this point, we don't have a token in either localStorage or cookies
    return null;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

/**
 * Get the auth token from request headers or cookies (for server-side API routes)
 * @param request NextRequest object from API route
 * @returns Authorization header value or null if not found
 */
export const getServerAuthToken = (request: Request): string | null => {
  // Try all possible token sources for maximum reliability
  let token: string | null = null;

  // Check Authorization header first (already formatted properly)
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    // Ensure it has Bearer prefix
    if (authHeader.startsWith('Bearer ')) {
      console.log('Server auth token found in Authorization header (with Bearer)');
      return authHeader;
    } else {
      // Format as Bearer token if it doesn't have the prefix
      console.log('Server auth token found in Authorization header (without Bearer)');
      return `Bearer ${authHeader}`;
    }
  }

  // Check cookies next
  const cookie = request.headers.get('cookie');
  if (cookie) {
    const cookies = cookie.split(';');
    const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
    if (tokenCookie) {
      token = tokenCookie.trim().substring(6); // 'token='.length === 6
      if (token) {
        console.log('Server auth token found in cookie:', token.substring(0, 10) + '...');

        // Format as Bearer token
        return `Bearer ${token}`;
      }
    }
  }

  // Log detailed debug info if no token found
  console.warn('No server auth token found - auth details:', {
    hasAuthHeader: !!authHeader,
    authHeaderType: authHeader ? authHeader.split(' ')[0] : null,
    hasCookie: !!cookie,
    hasTokenCookie: cookie ? cookie.includes('token=') : false
  });

  return null;
};

/**
 * Log authentication token sources for debugging
 */
export const logAuthSources = (request: Request): void => {
  const cookieMatch = request.headers.get('cookie')?.match(/token=([^;]+)/);
  const cookieTokenPrefix = cookieMatch && cookieMatch.length > 1
    ? cookieMatch[1].substring(0, 10)
    : null;

  console.log('Auth token sources:', {
    hasAuthHeader: !!request.headers.get('Authorization'),
    authHeaderPrefix: request.headers.get('Authorization')?.substring(0, 10),
    hasCookie: request.headers.get('cookie')?.includes('token='),
    cookieTokenPrefix
  });
};

/**
 * Fetch with authentication headers
 */
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    // Always get a fresh token directly from storage
    const token = getToken();

    // Prepare headers with authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    const fetchOptions: FetchOptions = {
      ...options,
      headers
    };

    // Set Authorization header if token is available
    if (token) {
      fetchOptions.headers['Authorization'] = `Bearer ${token}`;
      logAuthOperation('fetchWithAuth', {
        tokenAvailable: true,
        url,
        tokenPrefix: token.substring(0, 10) + '...'
      });
    } else {
      // Token not available, continue without it - might be a public endpoint
      logAuthOperation('fetchWithAuth', { tokenAvailable: false, url });
    }

    // Send cookies along with the request
    if (!fetchOptions.credentials) {
      fetchOptions.credentials = 'include';
    }

    // Disable caching by default for authenticated requests
    if (token && !fetchOptions.cache) {
      fetchOptions.cache = 'no-store';
    }

    // Make the fetch request
    const response = await fetch(url, fetchOptions);

    // Check if response indicates auth error (401)
    if (response.status === 401) {
      logAuthOperation('fetchWithAuth', { status: 401, url, message: 'Authentication failed' });

      // Attempt to refresh token and retry
      const retryResponse = await refreshTokenAndRetry(fetchOptions, url);
      return retryResponse;
    }

    // Return the successful response
    return response;
  } catch (error) {
    console.error('Error in fetchWithAuth:', error);
    throw error;
  }
};

/**
 * Fetch JSON with authentication headers
 */
export const fetchJsonWithAuth = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  try {
    const response = await fetchWithAuth(url, options);

    // If we get a 401 or 403, try to refresh the token once
    if ((response.status === 401 || response.status === 403) && !url.includes('/auth/')) {
      try {
        console.log(`[fetchJsonWithAuth] Got ${response.status}, attempting to refresh token and retry`);
        const fetchOptions: FetchOptions = {
          ...options,
          headers: {
            ...(options.headers as Record<string, string> || {}),
            'Content-Type': 'application/json',
          },
        };

        // Try to refresh the token and retry
        const retryResponse = await refreshTokenAndRetry(fetchOptions, url);

        console.log(`[fetchJsonWithAuth] Retry after token refresh: ${retryResponse.status}`);

        if (retryResponse.ok) {
          return await retryResponse.json();
        }

        // If still failing after refresh, throw error
        throw new Error(`Request failed after token refresh: ${retryResponse.status}`);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // If token refresh fails, redirect to login
        console.error('[fetchJsonWithAuth] Token refresh failed, redirecting to login');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          window.location.href = '/auth/login';
        }
        throw new Error('Authentication required');
      }
    }

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[fetchJsonWithAuth] Error:', error);
    throw error;
  }
};

/**
 * Attempt to refresh the token and retry the original request
 */
export const refreshTokenAndRetry = async (fetchOptions: FetchOptions, url: string): Promise<Response> => {
  try {
    console.log('Attempting to refresh token before retrying request');
    const authStore = await import('@/lib/store/auth-store');

    // Before attempting to refresh, check if we're already rate limited
    const authState = authStore.useAuthStore.getState();
    const now = Date.now();
    const retryAfter = authState._retryAfterTimestamp || 0;

    if (retryAfter > now) {
      // We're in a rate-limited state, check if we have a token we can use
      if (authState.token) {
        console.log('Rate limited for token refresh, using existing token for request');
        // Ensure token is correctly formatted with Bearer prefix
        const formattedToken = authState.token.startsWith('Bearer ')
          ? authState.token
          : `Bearer ${authState.token}`;
        fetchOptions.headers['Authorization'] = formattedToken;

        // Also set token cookie for future requests
        if (typeof document !== 'undefined') {
          const cookieToken = authState.token.replace(/^Bearer\s+/i, '');
          document.cookie = `token=${cookieToken}; path=/; max-age=3600; SameSite=Lax`;
          console.log('Set token cookie in rate-limited state');
        }

        return await fetch(url, fetchOptions);
      } else {
        // No token available and we're rate limited - this will likely fail
        console.warn('No token available and rate limited for refresh, request will likely fail');
        return await fetch(url, fetchOptions);
      }
    }

    // Call the refreshToken function from auth-store
    console.log('Attempting token refresh via auth store');
    const refreshSuccess = await authStore.useAuthStore.getState().refreshAuthToken();

    if (!refreshSuccess) {
      console.error('Token refresh failed, cannot retry the request');

      // Even if refresh fails, check if we have a valid token we can try
      const existingToken = getToken();
      if (existingToken) {
        console.log('Using existing token despite refresh failure');
        // Ensure token is correctly formatted
        const formattedToken = existingToken.startsWith('Bearer ')
          ? existingToken
          : `Bearer ${existingToken}`;
        fetchOptions.headers['Authorization'] = formattedToken;

        // Also set token cookie
        if (typeof document !== 'undefined') {
          const cookieToken = existingToken.replace(/^Bearer\s+/i, '');
          document.cookie = `token=${cookieToken}; path=/; max-age=3600; SameSite=Lax`;
          console.log('Set token cookie from existing token');
        }

        return await fetch(url, fetchOptions);
      }

      throw new Error('Failed to refresh authentication token');
    }

    // Get the updated token after refresh
    const newAuthState = authStore.useAuthStore.getState();
    const newToken = newAuthState.token || getToken();

    if (!newToken) {
      console.error('No token found after successful refresh');
      throw new Error('No token available after refresh');
    }

    console.log('Token successfully refreshed, updating Authorization header');

    // Ensure token is correctly formatted for the Authorization header
    const formattedToken = newToken.startsWith('Bearer ') ? newToken : `Bearer ${newToken}`;
    fetchOptions.headers['Authorization'] = formattedToken;

    // Ensure token is also set in cookies for future requests
    if (typeof document !== 'undefined') {
      const cookieToken = newToken.replace(/^Bearer\s+/i, '');
      document.cookie = `token=${cookieToken}; path=/; max-age=3600; SameSite=Lax`;
      console.log('Set token cookie after successful refresh');
    }

    // Retry the original request with the new token
    console.log('Retrying original request with refreshed token', {
      url,
      method: fetchOptions.method,
      tokenPrefix: newToken.substring(0, 10) + '...'
    });

    // Add a small delay to ensure the token is propagated
    await new Promise(resolve => setTimeout(resolve, 100));

    return await fetch(url, fetchOptions);
  } catch (error) {
    console.error('Error in refreshTokenAndRetry:', error);
    throw error;
  }
};

/**
 * Utility function to retry failed operations
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 500
): Promise<T> => {
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      retries++;

      if (retries >= maxRetries) {
        break;
      }

      // Calculate exponential backoff delay
      const delay = initialDelay * Math.pow(2, retries - 1);

      console.log(`Retry attempt ${retries}/${maxRetries} failed, retrying in ${delay}ms`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};