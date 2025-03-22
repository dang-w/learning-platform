import { expect } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '@/lib/store/auth-store';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset the store to its initial state
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.user = null;
      result.current.token = null;
      result.current.isAuthenticated = false;
      result.current.error = null;
    });

    // Reset storage
    localStorage.clear();
    document.cookie = ''; // Reset cookies
  });

  describe('refreshAuthToken functionality', () => {
    beforeEach(() => {
      // Reset fetch mock
      global.fetch = jest.fn();
      localStorage.clear();
      document.cookie = ''; // Reset cookies
    });

    it('should refresh token successfully', async () => {
      // Setup
      localStorage.setItem('refresh_token', 'test-refresh-token');
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token'
        })
      });

      // Execute
      const { result } = renderHook(() => useAuthStore());
      let refreshResult = false;
      await act(async () => {
        refreshResult = await result.current.refreshAuthToken();
      });

      // Verify
      expect(refreshResult).toBe(true);
      expect(localStorage.getItem('token')).toBe('new-access-token');
      expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle refresh token failure', async () => {
      // Setup
      localStorage.setItem('refresh_token', 'test-refresh-token');
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      // Execute
      const { result } = renderHook(() => useAuthStore());
      let refreshResult = true;
      await act(async () => {
        refreshResult = await result.current.refreshAuthToken();
      });

      // Verify
      expect(refreshResult).toBe(false);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle rate limiting during token refresh', async () => {
      // Setup
      localStorage.setItem('refresh_token', 'test-refresh-token');
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (header: string) => header === 'Retry-After' ? '60' : null
        }
      });

      // Execute
      const { result } = renderHook(() => useAuthStore());
      let refreshResult = true;
      await act(async () => {
        refreshResult = await result.current.refreshAuthToken();
      });

      // Verify
      expect(refreshResult).toBe(false);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Attempting another refresh should fail due to rate limiting
      refreshResult = true;
      await act(async () => {
        refreshResult = await result.current.refreshAuthToken();
      });
      expect(refreshResult).toBe(false);
      // fetch should still have been called only once
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
