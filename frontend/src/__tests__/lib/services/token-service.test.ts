/// <reference lib="dom" />

import { expect, jest, beforeEach, describe, it } from '@jest/globals';
import { AUTH_TOKEN_EXPIRY, BACKEND_API_URL } from '@/lib/config';
import { cookieUtils, CookieOptions } from '@/lib/utils/cookie';
import { TokenService } from '@/lib/services/token-service';

jest.mock('@/lib/utils/cookie');

// Mock fetch globally
// Use MockedFunction type for global assignment as well
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock BroadcastChannel
const mockBroadcastChannelPostMessage = jest.fn();
const mockBroadcastChannelClose = jest.fn();
const mockBroadcastChannel = jest.fn().mockImplementation(() => ({
  postMessage: mockBroadcastChannelPostMessage,
  close: mockBroadcastChannelClose,
  onmessage: null as MessageEventHandler | null,
}));
global.BroadcastChannel = mockBroadcastChannel as any; // Use any for simplicity here if needed

// Mock localStorage with spy capabilities
const mockLocalStorageStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: jest.fn((key: string): string | null => mockLocalStorageStore[key] ?? null),
  setItem: jest.fn((key: string, value: string): void => {
    mockLocalStorageStore[key] = value.toString();
  }),
  removeItem: jest.fn((key: string): void => {
    delete mockLocalStorageStore[key];
  }),
  clear: jest.fn((): void => {
    // Clear the actual store
    Object.keys(mockLocalStorageStore).forEach(key => {
        delete mockLocalStorageStore[key];
    });
  }),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, configurable: true });
Object.defineProperty(window, 'sessionStorage', { value: mockLocalStorage, configurable: true });

describe('TokenService', () => {
  let tokenService: TokenService;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let getCookieSpy: jest.SpyInstance<string | null, [string]>;
  let setCookieSpy: jest.SpyInstance<void, [string, string, (CookieOptions | undefined)?]>;
  let removeCookieSpy: jest.SpyInstance<void, [string, (CookieOptions | undefined)?]>;

  // Helper to create a mock fetch response
  const createMockResponse = (
    body: unknown,
    status = 200,
    ok = true
  ): Response => {
    const response = {
      ok,
      status,
      json: jest.fn().mockResolvedValue(body),
      text: jest.fn().mockResolvedValue(JSON.stringify(body)),
      headers: new Headers(),
      redirected: false,
      statusText: ok ? 'OK' : 'Error',
      type: 'basic',
      url: '',
      clone: jest.fn(() => ({ ...response })), // Simple clone
      body: null,
      bodyUsed: false,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
      blob: jest.fn().mockResolvedValue(new Blob()),
      formData: jest.fn<() => Promise<FormData>>().mockResolvedValue(new FormData()),
    } as unknown as Response;
    return response;
  };

  beforeEach(() => {
    mockLocalStorage.clear(); // Clear the store first
    tokenService = TokenService.getInstance();
    // Clear tokens *before* resetting mocks
    tokenService.clearTokens();
    // Reset mocks AFTER initial clearTokens call
    jest.clearAllMocks();
    // Re-assign mockFetch after clearAllMocks
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    // Re-create spies after clearAllMocks
    getCookieSpy = jest.spyOn(cookieUtils, 'get');
    setCookieSpy = jest.spyOn(cookieUtils, 'set');
    removeCookieSpy = jest.spyOn(cookieUtils, 'remove');
    // Reset BC mocks
    mockBroadcastChannelPostMessage.mockClear();
    mockBroadcastChannelClose.mockClear();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(createMockResponse({})); // Default mock
  });

  afterEach(() => {
    jest.useRealTimers();
    mockBroadcastChannelClose();
  });

  describe('Token Storage', () => {
    it('should store tokens in cookies and metadata in localStorage', () => {
      const token = 'test-token';
      const expectedExpiryDate = new Date(Date.now() + (AUTH_TOKEN_EXPIRY.ACCESS_TOKEN * 1000));
      tokenService.setTokens(token);

      expect(setCookieSpy).toHaveBeenCalledWith(
        'token',
        `Bearer ${token}`,
        expect.objectContaining({
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          expires: expect.any(Date),
        })
      );
      const setArgs = setCookieSpy.mock.calls[0][2];
      const actualExpires = (setArgs as { expires: Date }).expires;
      expect(Math.abs(actualExpires.getTime() - expectedExpiryDate.getTime())).toBeLessThan(1000);

      // Use the mockLocalStorage spy
      // Check if setItem was called for access_token_metadata
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'access_token_metadata',
        expect.any(String) // Check content separately
      );

      // Find the call specifically for access_token_metadata
      const setItemCall = mockLocalStorage.setItem.mock.calls.find(
        (call) => call[0] === 'access_token_metadata'
      );

      // Ensure the call was found and parse the stored value
      expect(setItemCall).toBeDefined();
      if (!setItemCall) return; // Guard for TypeScript

      const storedMetadataString = setItemCall[1];
      expect(typeof storedMetadataString).toBe('string');
      const storedMetadata = JSON.parse(storedMetadataString as string);

      // Assert the structure of the parsed metadata object
      expect(storedMetadata).toEqual(
        expect.objectContaining({
          type: 'access',
          expiresAt: expect.any(Number),
        })
      );

      // Check expiry time approximately
      expect(Math.abs(storedMetadata.expiresAt - expectedExpiryDate.getTime())).toBeLessThan(1000);

      expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith(
        'refresh_token_metadata',
        expect.anything()
      );
    });

    it('should retrieve the access token from cookies', () => {
      const token = 'Bearer test-token';
      getCookieSpy.mockReturnValue(token);
      expect(tokenService.getToken()).toBe(token);
      expect(getCookieSpy).toHaveBeenCalledWith('token');
    });

    it('should return null if token cookie does not exist', () => {
      getCookieSpy.mockReturnValue(null);
      expect(tokenService.getToken()).toBeNull();
    });
  });

  describe('Token Expiry', () => {
    it('should correctly determine if a token is expired', () => {
      const now = Date.now();
      jest.useFakeTimers();
      jest.setSystemTime(now);

      // Use mockLocalStorage.setItem directly to set metadata for test setup
      mockLocalStorage.setItem('access_token_metadata', JSON.stringify({ expiresAt: now, type: 'access' }));
      expect(tokenService.isTokenExpired()).toBe(true);

      mockLocalStorage.setItem('access_token_metadata', JSON.stringify({ expiresAt: now + 60 * 1000, type: 'access' }));
      expect(tokenService.isTokenExpired()).toBe(false);
      expect(tokenService.isTokenExpired(30)).toBe(false);
      expect(tokenService.isTokenExpired(90)).toBe(true);
    });

     it('should return true for expiry check if metadata is missing', () => {
       mockLocalStorage.removeItem('access_token_metadata');
       expect(tokenService.isTokenExpired()).toBe(true);
     });

    it('should correctly determine if token needs refresh based on threshold', () => {
       const now = Date.now();
       jest.useFakeTimers();
       jest.setSystemTime(now);
       const thresholdSeconds = 300;

       mockLocalStorage.setItem('access_token_metadata', JSON.stringify({ expiresAt: now + (thresholdSeconds + 1) * 1000, type: 'access' }));
       expect(tokenService.shouldRefreshToken()).toBe(false);

       mockLocalStorage.setItem('access_token_metadata', JSON.stringify({ expiresAt: now + thresholdSeconds * 1000, type: 'access' }));
       expect(tokenService.shouldRefreshToken()).toBe(true);

       mockLocalStorage.setItem('access_token_metadata', JSON.stringify({ expiresAt: now + (thresholdSeconds - 1) * 1000, type: 'access' }));
       expect(tokenService.shouldRefreshToken()).toBe(true);
     });
  });

  describe('Token Refresh', () => {
    const REFRESH_URL = `${BACKEND_API_URL}/api/auth/token/refresh`;

    it('should successfully refresh the token', async () => {
      const newAccessToken = 'new-access-token';
      mockFetch.mockResolvedValue(createMockResponse({ access_token: newAccessToken }));
      const setTokensSpy = jest.spyOn(tokenService, 'setTokens');

      const result = await tokenService.startTokenRefresh();

      expect(result).toBe(newAccessToken); // Expect raw token
      expect(mockFetch).toHaveBeenCalledWith(REFRESH_URL, {
        method: 'POST',
        credentials: 'include',
        headers: {},
      });
      expect(setTokensSpy).toHaveBeenCalledWith(newAccessToken);
      expect(tokenService.isRefreshingToken()).toBe(false);
    });

    it('should prevent concurrent refresh attempts', async () => {
      const newAccessToken = 'new-access-token';
      let resolveFetch: (value: Response | PromiseLike<Response>) => void;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
      mockFetch.mockReturnValue(fetchPromise);

      const refreshPromise1 = tokenService.startTokenRefresh();
      expect(tokenService.isRefreshingToken()).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const refreshPromise2 = tokenService.startTokenRefresh();
      expect(tokenService.isRefreshingToken()).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Resolve the fetch and compare results
      resolveFetch!(createMockResponse({ access_token: newAccessToken }));
      const [result1, result2] = await Promise.all([refreshPromise1, refreshPromise2]);

      expect(result1).toBe(newAccessToken);
      expect(result2).toBe(newAccessToken);
      expect(tokenService.isRefreshingToken()).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

     it('should clear refresh state after completion', async () => {
        const newAccessToken = 'new-access-token';
        mockFetch.mockResolvedValue(createMockResponse({ access_token: newAccessToken }));
        await tokenService.startTokenRefresh();
        expect(tokenService.isRefreshingToken()).toBe(false);
        // @ts-expect-error - testing private property
        expect(tokenService.refreshPromise).toBeNull();
      });

    it('should handle refresh failure gracefully (e.g., network error)', async () => {
      const networkError = new Error('Network failed');
      mockFetch.mockRejectedValue(networkError);
      await expect(tokenService.startTokenRefresh()).rejects.toThrow(networkError);
      expect(tokenService.isRefreshingToken()).toBe(false);
      expect(removeCookieSpy).not.toHaveBeenCalled();
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      // @ts-expect-error - testing private property
      expect(tokenService.lastRefreshFailure).toBeGreaterThan(0);
    });

     it('should handle refresh failure due to invalid refresh token (401/403)', async () => {
        const authError = createMockResponse({ detail: 'Invalid token' }, 401, false);
        mockFetch.mockResolvedValue(authError);
        await expect(tokenService.startTokenRefresh()).rejects.toThrow('Invalid refresh token');
        expect(tokenService.isRefreshingToken()).toBe(false);
        expect(removeCookieSpy).toHaveBeenCalledWith(
          'token',
          expect.objectContaining({ path: '/', sameSite: 'lax' })
        );
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token_metadata');
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token_metadata');
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

    it('should handle refresh failure due to invalid response data', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ message: 'Unexpected format' }));
        await expect(tokenService.startTokenRefresh()).rejects.toThrow('No new access token received from refresh endpoint');
        expect(tokenService.isRefreshingToken()).toBe(false);
        expect(removeCookieSpy).not.toHaveBeenCalled();
        expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

    it('should use correct endpoint and method for refresh', async () => {
      const newAccessToken = 'new-access-token';
      mockFetch.mockResolvedValue(createMockResponse({ access_token: newAccessToken }));
      await tokenService.startTokenRefresh();
      expect(mockFetch).toHaveBeenCalledWith(
        REFRESH_URL,
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      );
    });

    it('should observe cooldown period after a failed refresh', async () => {
       const now = Date.now();
       jest.useFakeTimers();
       jest.setSystemTime(now);
       mockFetch.mockRejectedValueOnce(new Error('Network Error'));
       await expect(tokenService.startTokenRefresh()).rejects.toThrow('Network Error');
       expect(mockFetch).toHaveBeenCalledTimes(1);
       expect(tokenService.lastRefreshFailure).toBe(now);

       jest.advanceTimersByTime(3000);

       await expect(tokenService.startTokenRefresh()).rejects.toThrow('Token refresh failed recently, cooldown active.');
       expect(mockFetch).toHaveBeenCalledTimes(1);

       jest.advanceTimersByTime(3000);

       const newAccessToken = 'new-token-after-cooldown';
       mockFetch.mockResolvedValueOnce(createMockResponse({ access_token: newAccessToken }));

       await expect(tokenService.startTokenRefresh()).resolves.toBe(newAccessToken);
       expect(mockFetch).toHaveBeenCalledTimes(2);
     });

  });

  describe('Cleanup', () => {
    it('should clear all tokens and notify listeners', () => {
      const listener = jest.fn();
      tokenService.onTokenChange(listener);
      tokenService.setTokens('initial-token');
      mockLocalStorage.setItem('refresh_token_metadata', JSON.stringify({ expiresAt: Date.now() + 10000, type: 'refresh' }));
      jest.clearAllMocks();

      tokenService.clearTokens();

      expect(removeCookieSpy).toHaveBeenCalledWith(
        'token',
        expect.objectContaining({ path: '/', sameSite: 'lax' })
      );
      expect(removeCookieSpy).not.toHaveBeenCalledWith('refresh_token', expect.any(Object));
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token_metadata');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token_metadata');
      expect(listener).toHaveBeenCalledWith(null);
      // @ts-expect-error - testing private property
       expect(tokenService.isRefreshing).toBe(false);
       // @ts-expect-error - testing private property
       expect(tokenService.refreshPromise).toBeNull();
       expect(tokenService.lastRefreshFailure).toBe(0);
    });
  });

  describe.skip('Cross-Tab Synchronization', () => {
     const triggerStorageEvent = (key: string, newValue: string | null) => {
       const event = new Event('storage') as StorageEvent;
       Object.defineProperties(event, {
          key: { value: key, writable: false },
          newValue: { value: newValue, writable: false },
          storageArea: { value: window.localStorage, writable: false },
       });
       window.dispatchEvent(event);
     };

    it('should update token state when access_token_metadata changes in another tab', () => {
       const newToken = 'new-token-from-other-tab';
       const newExpiry = Date.now() + 3600 * 1000;
       const newMetadata = { expiresAt: newExpiry, type: 'access' as const };
       const listener = jest.fn();
       tokenService.onTokenChange(listener);
       getCookieSpy.mockReturnValue(`Bearer ${newToken}`);
       triggerStorageEvent('access_token_metadata', JSON.stringify(newMetadata));
       expect(tokenService.getToken()).toBe(`Bearer ${newToken}`);
       // @ts-expect-error - getTokenMetadata is private
       // expect(tokenService.getTokenMetadata('access_token')).toEqual(newMetadata);
       expect(listener).toHaveBeenCalledWith(`Bearer ${newToken}`);
     });

    it('should clear token state when access_token_metadata is removed in another tab', () => {
       tokenService.setTokens('initial-token');
       const listener = jest.fn();
       tokenService.onTokenChange(listener);
       jest.clearAllMocks();
       getCookieSpy.mockReturnValue(null);
       triggerStorageEvent('access_token_metadata', null);
       expect(tokenService.getToken()).toBeNull();
       // @ts-expect-error - getTokenMetadata is private
       // expect(tokenService.getTokenMetadata('access_token')).toBeNull();
       expect(listener).toHaveBeenCalledWith(null);
       expect(removeCookieSpy).not.toHaveBeenCalled();
     });

     it('should post message to BroadcastChannel on setTokens', () => {
       tokenService.setTokens('my-new-token');
       expect(mockBroadcastChannelPostMessage).toHaveBeenCalledWith({ type: 'tokenSet', token: 'my-new-token' }); // Expect raw token
     });

     it('should post message to BroadcastChannel on clearTokens', () => {
       tokenService.clearTokens();
       expect(mockBroadcastChannelPostMessage).toHaveBeenCalledWith({ type: 'tokenCleared' });
     });

     it('should handle tokenSet message from BroadcastChannel', () => {
       const listener = jest.fn();
       tokenService.onTokenChange(listener);
       const newToken = 'token-via-broadcast';
       getCookieSpy.mockReturnValue(`Bearer ${newToken}`);
       const messageEvent = new MessageEvent('message', { data: { type: 'tokenSet', token: newToken } });
       const instance = mockBroadcastChannel();
       if (instance.onmessage) {
         instance.onmessage(messageEvent);
       } else {
         console.warn('onmessage listener was not set up on mock BroadcastChannel instance');
       }
       expect(tokenService.getToken()).toBe(`Bearer ${newToken}`);
       expect(listener).toHaveBeenCalledWith(`Bearer ${newToken}`); // Listener gets Bearer token
     });

     it('should handle tokenCleared message from BroadcastChannel', () => {
       tokenService.setTokens('initial-token');
       const listener = jest.fn();
       tokenService.onTokenChange(listener);
       getCookieSpy.mockReturnValue(null);
       const messageEvent = new MessageEvent('message', { data: { type: 'tokenCleared' } });
       const instance = mockBroadcastChannel();
        if (instance.onmessage) {
          instance.onmessage(messageEvent);
        } else {
           console.warn('onmessage listener was not set up on mock BroadcastChannel instance');
        }
       expect(tokenService.getToken()).toBeNull();
       expect(listener).toHaveBeenCalledWith(null);
     });
  });

  describe('getValidAccessToken', () => {
     it('should return current token if valid and not near expiry', async () => {
       const validToken = 'valid-token';
       const futureExpiry = Date.now() + 10 * 60 * 1000;
       getCookieSpy.mockReturnValue(`Bearer ${validToken}`);
       mockLocalStorage.setItem('access_token_metadata', JSON.stringify({ expiresAt: futureExpiry, type: 'access' }));
       const refreshSpy = jest.spyOn(tokenService, 'startTokenRefresh');

       const token = await tokenService.getValidAccessToken();

       expect(token).toBe(`Bearer ${validToken}`);
       expect(refreshSpy).not.toHaveBeenCalled();
     });

     it('should refresh token if near expiry', async () => {
       const oldToken = 'old-expiring-token';
       const newToken = 'refreshed-token';
       const pastExpiry = Date.now() + 1 * 60 * 1000;
       getCookieSpy.mockReturnValue(`Bearer ${oldToken}`);
       mockLocalStorage.setItem('access_token_metadata', JSON.stringify({ expiresAt: pastExpiry, type: 'access' }));
       const refreshSpy = jest.spyOn(tokenService, 'startTokenRefresh').mockResolvedValue(newToken);

       const token = await tokenService.getValidAccessToken();

       expect(token).toBe(newToken); // Expect raw token
       expect(refreshSpy).toHaveBeenCalledTimes(1);
     });

      it('should refresh token if current token is missing', async () => {
         getCookieSpy.mockReturnValue(null);
         mockLocalStorage.removeItem('access_token_metadata');
         const newToken = 'refreshed-token-when-missing';
         const refreshSpy = jest.spyOn(tokenService, 'startTokenRefresh').mockResolvedValue(newToken);

         const token = await tokenService.getValidAccessToken();

         expect(token).toBe(newToken); // Expect raw token
         expect(refreshSpy).toHaveBeenCalledTimes(1);
       });

     it('should throw error if refresh fails', async () => {
       const pastExpiry = Date.now() + 1 * 60 * 1000;
       getCookieSpy.mockReturnValue('Bearer old-expiring-token');
       mockLocalStorage.setItem('access_token_metadata', JSON.stringify({ expiresAt: pastExpiry, type: 'access' }));
       const refreshError = new Error('Refresh failed miserably');
       const refreshSpy = jest.spyOn(tokenService, 'startTokenRefresh').mockRejectedValue(refreshError);

       // Expect wrapped error message
       await expect(tokenService.getValidAccessToken()).rejects.toThrow(`Failed to obtain valid access token: ${refreshError.message}`);
       expect(refreshSpy).toHaveBeenCalledTimes(1);
     });
  });
});