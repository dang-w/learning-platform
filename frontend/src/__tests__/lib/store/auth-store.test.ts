/**
 * NOTE: There are TypeScript errors in this file related to mocking the global fetch function.
 * These errors occur because TypeScript doesn't recognize our mock implementation as conforming to
 * the fetch API type signature. However, the tests function correctly because:
 *
 * 1. We're only testing the auth-store's behavior, not the actual fetch implementation
 * 2. Our mock responses match the structure expected by the auth-store
 * 3. The test assertions verify the correct behavior regardless of TypeScript errors
 *
 * The alternative would be to create a full Response implementation, which is excessive for this test.
 */

import { expect, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '@/lib/store/auth-store';

// Create a mock localStorage
const mockLocalStorage = (function() {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string): string | null => {
      return store[key] || null;
    }),
    setItem: jest.fn((key: string, value: string): void => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string): void => {
      delete store[key];
    }),
    clear: jest.fn((): void => {
      store = {};
    }),
  };
})();

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

// Helper function for mocking fetch responses
const mockFetchResponse = (responseData: unknown) => {
  return {
    ok: true,
    json: () => Promise.resolve(responseData)
  };
};

// Helper function for mocking fetch error responses
const mockFetchErrorResponse = (status: number, headers?: { [key: string]: string }) => {
  const response: {
    ok: boolean;
    status: number;
    headers?: { get: (name: string) => string | null }
  } = {
    ok: false,
    status
  };

  if (headers) {
    response.headers = {
      get: (name: string) => headers[name] || null
    };
  }

  return response;
};

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset Zustand store by using the reset action
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.reset();
    });

    // Reset localStorage and cookies
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
    mockLocalStorage.clear();
    document.cookie = '';

    // Reset fetch mock
    // @ts-expect-error - Intentionally ignoring type errors for the mock
    global.fetch = jest.fn();
  });

  describe('refreshAuthToken functionality', () => {
    it('should refresh token successfully', async () => {
      // Setup initial state
      mockLocalStorage.setItem('refresh_token', 'test-refresh-token');

      // Create the store hook
      const { result } = renderHook(() => useAuthStore());

      // Set initial state
      act(() => {
        result.current.setRefreshToken('test-refresh-token');
      });

      // Mock fetch to return success response
      // @ts-expect-error - Intentionally ignoring type errors for the mock
      global.fetch.mockImplementationOnce(() => Promise.resolve(mockFetchResponse({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token'
      })));

      // Execute
      let refreshResult = false;
      await act(async () => {
        refreshResult = await result.current.refreshAuthToken();
      });

      // Verify
      expect(refreshResult).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'new-access-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh-token');
      expect(fetch).toHaveBeenCalledWith('/api/auth/token/refresh', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refresh_token: 'test-refresh-token' })
      }));

      // Verify the store state directly
      expect(result.current.token).toBe('new-access-token');
      expect(result.current.refreshToken).toBe('new-refresh-token');
      expect(result.current._refreshAttempts).toBe(0);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle refresh token failure', async () => {
      // Setup initial state
      mockLocalStorage.setItem('refresh_token', 'test-refresh-token');

      // Create the store hook
      const { result } = renderHook(() => useAuthStore());

      // Set initial state
      act(() => {
        result.current.setRefreshToken('test-refresh-token');
      });

      // Mock fetch to return error response
      // @ts-expect-error - Intentionally ignoring type errors for the mock
      global.fetch.mockImplementationOnce(() => Promise.resolve(mockFetchErrorResponse(401)));

      // Execute
      let refreshResult = true;
      await act(async () => {
        refreshResult = await result.current.refreshAuthToken();
      });

      // Verify
      expect(refreshResult).toBe(false);
      expect(fetch).toHaveBeenCalledWith('/api/auth/token/refresh', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refresh_token: 'test-refresh-token' })
      }));
      expect(result.current._refreshAttempts).toBe(1);
    });

    it('should handle rate limiting during token refresh', async () => {
      // Setup initial state
      mockLocalStorage.setItem('refresh_token', 'test-refresh-token');

      // Create the store hook
      const { result } = renderHook(() => useAuthStore());

      // Set initial state
      act(() => {
        result.current.setRefreshToken('test-refresh-token');
      });

      // Mock fetch to return rate limit response
      // @ts-expect-error - Intentionally ignoring type errors for the mock
      global.fetch.mockImplementationOnce(() => Promise.resolve(mockFetchErrorResponse(429, { 'Retry-After': '60' })));

      // Execute
      let refreshResult = true;
      await act(async () => {
        refreshResult = await result.current.refreshAuthToken();
      });

      // Verify
      expect(refreshResult).toBe(false);
      expect(fetch).toHaveBeenCalledWith('/api/auth/token/refresh', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refresh_token: 'test-refresh-token' })
      }));
      expect(result.current._retryAfterTimestamp).not.toBeNull();
      expect(result.current._refreshAttempts).toBe(1);

      // Attempting another refresh should fail due to rate limiting
      refreshResult = true;
      await act(async () => {
        refreshResult = await result.current.refreshAuthToken();
      });
      expect(refreshResult).toBe(false);
      // fetch should still have been called only once
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should try fallback endpoint if primary fails', async () => {
      // Setup initial state
      mockLocalStorage.setItem('refresh_token', 'test-refresh-token');

      // Create the store hook
      const { result } = renderHook(() => useAuthStore());

      // Set initial state
      act(() => {
        result.current.setRefreshToken('test-refresh-token');
      });

      // Mock responses for primary and fallback endpoints
      // @ts-expect-error - Intentionally ignoring type errors for the mock
      global.fetch.mockImplementationOnce(() => Promise.resolve(mockFetchErrorResponse(404)))
                 .mockImplementationOnce(() => Promise.resolve(mockFetchResponse({
                   token: 'fallback-token',
                   refresh_token: 'fallback-refresh'
                 })));

      // Execute
      let refreshResult = false;
      await act(async () => {
        refreshResult = await result.current.refreshAuthToken();
      });

      // Verify
      expect(refreshResult).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1, '/api/auth/token/refresh', expect.any(Object));
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/token/refresh', expect.any(Object));
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'fallback-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refresh_token', 'fallback-refresh');
      expect(result.current.token).toBe('fallback-token');
      expect(result.current.refreshToken).toBe('fallback-refresh');
    });
  });
});
