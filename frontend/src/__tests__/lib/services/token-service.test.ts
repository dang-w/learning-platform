/// <reference lib="dom" />

import { expect, jest, beforeEach, describe, it } from '@jest/globals';
import { cookieUtils } from '@/lib/utils/cookie';
import { tokenService } from '@/lib/services/token-service';

// Define mock storage type
type MockStorage = {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
  clear: jest.Mock;
  length: number;
  key: jest.Mock;
};

// Create mock storage
const mockLocalStorage: MockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

// Replace global localStorage
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('TokenService', () => {
  // Setup cookie utils spies
  let getCookieSpy: ReturnType<typeof jest.spyOn>;
  let setCookieSpy: ReturnType<typeof jest.spyOn>;
  let removeCookieSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup cookie utils spies
    getCookieSpy = jest.spyOn(cookieUtils, 'get');
    setCookieSpy = jest.spyOn(cookieUtils, 'set');
    removeCookieSpy = jest.spyOn(cookieUtils, 'remove');

    // Clear localStorage
    mockLocalStorage.clear();

    // Reset token service state
    tokenService.clearTokens();
  });

  afterEach(() => {
    // Restore all spies
    getCookieSpy.mockRestore();
    setCookieSpy.mockRestore();
    removeCookieSpy.mockRestore();
  });

  describe('Token Storage', () => {
    it('should store tokens in cookies and metadata in localStorage', () => {
      const token = 'test-token';
      const refreshToken = 'test-refresh-token';

      tokenService.setTokens(token, refreshToken);

      // Check cookie storage
      expect(setCookieSpy).toHaveBeenCalledWith(
        'token',
        `Bearer ${token}`,
        expect.objectContaining({
          path: '/',
          secure: true,
          sameSite: 'strict',
          httpOnly: true
        })
      );

      expect(setCookieSpy).toHaveBeenCalledWith(
        'refresh_token',
        refreshToken,
        expect.objectContaining({
          path: '/',
          secure: true,
          sameSite: 'strict',
          httpOnly: true
        })
      );

      // Check metadata storage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'access_token_metadata',
        expect.stringContaining('"type":"access"')
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'refresh_token_metadata',
        expect.stringContaining('"type":"refresh"')
      );
    });

    it('should format token with Bearer prefix if not present', () => {
      const token = 'test-token';
      tokenService.setTokens(token, 'refresh');

      expect(setCookieSpy).toHaveBeenCalledWith(
        'token',
        `Bearer ${token}`,
        expect.any(Object)
      );
    });

    it('should not add Bearer prefix if already present', () => {
      const token = 'Bearer test-token';
      tokenService.setTokens(token, 'refresh');

      expect(setCookieSpy).toHaveBeenCalledWith(
        'token',
        token,
        expect.any(Object)
      );
    });
  });

  describe('Token Retrieval', () => {
    it('should retrieve token from cookies', () => {
      const storedToken = 'Bearer stored-token';
      getCookieSpy.mockReturnValue(storedToken);

      expect(tokenService.getToken()).toBe(storedToken);
      expect(getCookieSpy).toHaveBeenCalledWith('token');
    });

    it('should return null if no token is found', () => {
      getCookieSpy.mockReturnValue(null);
      expect(tokenService.getToken()).toBeNull();
    });
  });

  describe('Token Change Notifications', () => {
    it('should notify listeners when token changes', () => {
      const listener = jest.fn();
      tokenService.onTokenChange(listener);

      tokenService.setTokens('new-token', 'refresh');

      expect(listener).toHaveBeenCalledWith('Bearer new-token');
    });

    it('should notify listeners when token is cleared', () => {
      const listener = jest.fn();
      tokenService.onTokenChange(listener);

      tokenService.clearTokens();

      expect(listener).toHaveBeenCalledWith(null);
    });

    it('should remove listener when unsubscribe is called', () => {
      const listener = jest.fn();
      const unsubscribe = tokenService.onTokenChange(listener);

      unsubscribe();
      tokenService.setTokens('new-token', 'refresh');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Token Refresh', () => {
    it('should prevent concurrent refresh attempts', async () => {
      // Mock the refresh token to be available
      getCookieSpy.mockReturnValue('refresh-token');

      // Mock fetch to delay response
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(new Response(
          JSON.stringify({ token: 'new-token' }),
          { status: 200 }
        )), 100))
      );

      // Start first refresh
      const refreshPromise = tokenService.startTokenRefresh();

      // Verify that we're in refreshing state
      expect(tokenService.isRefreshingToken()).toBe(true);

      // Start second refresh while first is in progress
      const secondRefreshPromise = tokenService.startTokenRefresh();

      // Verify fetch was only called once
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Both promises should resolve to the same value
      const [firstResult, secondResult] = await Promise.all([refreshPromise, secondRefreshPromise]);
      expect(firstResult).toBe(secondResult);

      // Should no longer be refreshing
      expect(tokenService.isRefreshingToken()).toBe(false);

      mockFetch.mockRestore();
    });

    it('should clear refresh state after completion', async () => {
      // Mock the refresh token to be available
      getCookieSpy.mockReturnValue('refresh-token');

      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(
        JSON.stringify({ token: 'new-token' }),
        { status: 200 }
      ));

      await tokenService.startTokenRefresh();
      expect(tokenService.isRefreshingToken()).toBe(false);

      mockFetch.mockRestore();
    });

    it('should handle refresh failure gracefully', async () => {
      // Mock the refresh token to be available
      getCookieSpy.mockReturnValue('refresh-token');

      const mockFetch = jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Refresh failed'));

      const result = await tokenService.startTokenRefresh();
      expect(result).toBeNull();
      expect(tokenService.isRefreshingToken()).toBe(false);

      mockFetch.mockRestore();
    });
  });

  describe('Token Expiration', () => {
    beforeEach(() => {
      // Mock Date.now() for consistent testing
      jest.spyOn(Date, 'now').mockImplementation(() => 1516239022000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should detect expired tokens', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        expiresAt: Date.now() - 1000,
        type: 'access'
      }));

      expect(tokenService.isTokenExpired()).toBe(true);
    });

    it('should identify valid tokens', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        expiresAt: Date.now() + 1000000,
        type: 'access'
      }));

      expect(tokenService.isTokenExpired()).toBe(false);
    });

    it('should handle missing metadata', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(tokenService.isTokenExpired()).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should clear all tokens and notify listeners', () => {
      const listener = jest.fn();
      tokenService.onTokenChange(listener);

      tokenService.clearTokens();

      expect(removeCookieSpy).toHaveBeenCalledWith('token', expect.any(Object));
      expect(removeCookieSpy).toHaveBeenCalledWith('refresh_token', expect.any(Object));
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token_metadata');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token_metadata');
      expect(listener).toHaveBeenCalledWith(null);
    });
  });
});