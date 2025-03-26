/// <reference lib="dom" />

import { expect, jest } from '@jest/globals';
import { tokenService } from '../../../lib/services/token-service';
import { cookieUtils } from '../../../lib/utils/cookie';

type TokenServiceType = typeof tokenService;

describe('TokenService', () => {
  let testTokenService: TokenServiceType;
  let mockGet: jest.MockedFunction<typeof cookieUtils.get>;
  let mockSet: jest.MockedFunction<typeof cookieUtils.set>;
  let mockRemove: jest.MockedFunction<typeof cookieUtils.remove>;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  const testToken = 'Bearer test-token';
  const testRefreshToken = 'test-refresh-token';

  beforeEach(() => {
    // Reset token service instance
    testTokenService = tokenService;
    testTokenService.clearTokens();

    // Mock cookie utils
    mockGet = jest.fn() as jest.MockedFunction<typeof cookieUtils.get>;
    mockSet = jest.fn() as jest.MockedFunction<typeof cookieUtils.set>;
    mockRemove = jest.fn() as jest.MockedFunction<typeof cookieUtils.remove>;
    jest.spyOn(cookieUtils, 'get').mockImplementation((key: string): string | null => {
      return mockGet(key);
    });
    jest.spyOn(cookieUtils, 'set').mockImplementation(mockSet);
    jest.spyOn(cookieUtils, 'remove').mockImplementation(mockRemove);

    // Mock fetch for token refresh
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    const mockResponse = new Response(JSON.stringify({ token: 'new-token' }), {
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' })
    });
    mockFetch.mockResolvedValue(mockResponse);
    global.fetch = mockFetch;

    // Mock localStorage
    const mockLocalStorage: { [key: string]: string } = {};
    global.localStorage = {
      getItem: (key: string) => mockLocalStorage[key] || null,
      setItem: (key: string, value: string) => { mockLocalStorage[key] = value; },
      removeItem: (key: string) => { delete mockLocalStorage[key]; },
      clear: () => { Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]); },
      length: 0,
      key: () => null,
    };

    // Mock request for queue tests
    mockRequest = jest.fn().mockResolvedValue(new Response('', {
      status: 200,
      headers: new Headers()
    }));
  });

  afterAll(() => {
    // Clean up token service instance
    testTokenService.clearTokens();
  });

  describe('Token Management', () => {
    it('should set tokens with proper formatting and expiry', () => {
      testTokenService.setTokens(testToken, testRefreshToken);

      expect(mockSet).toHaveBeenCalledWith(
        'token',
        'Bearer test-token',
        expect.objectContaining({
          path: '/',
          secure: true,
          sameSite: 'strict'
        })
      );
    });

    it('should retrieve token from storage', () => {
      mockGet.mockReturnValue(testToken);
      const token = testTokenService.getToken();
      expect(token).toBe(testToken);
      expect(mockGet).toHaveBeenCalledWith('token');
    });

    it('should clear all tokens and storage', () => {
      testTokenService.clearTokens();

      expect(mockRemove).toHaveBeenCalledWith('token', expect.objectContaining({
        path: '/',
        secure: true,
        sameSite: 'strict'
      }));
    });

    it('should check token expiration correctly', () => {
      const futureExpiry = Date.now() + 1000;
      localStorage.setItem('token_expiry', futureExpiry.toString());
      expect(testTokenService.isTokenExpired()).toBe(false);

      const pastExpiry = Date.now() - 1000;
      localStorage.setItem('token_expiry', pastExpiry.toString());
      expect(testTokenService.isTokenExpired()).toBe(true);
    });
  });

  describe('Token Refresh', () => {
    beforeEach(() => {
      // Set up initial tokens including refresh token
      mockGet.mockImplementation((key: string) => {
        if (key === 'token') return testToken;
        if (key === 'refresh_token') return testRefreshToken;
        return null;
      });
      testTokenService.setTokens(testToken, testRefreshToken);
    });

    it('should handle successful token refresh', async () => {
      const token = await testTokenService.startTokenRefresh();
      expect(token).toBe('new-token');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockSet).toHaveBeenCalledWith(
        'token',
        'Bearer new-token',
        expect.objectContaining({
          path: '/',
          secure: true,
          sameSite: 'strict'
        })
      );
    });

    it('should prevent multiple simultaneous refresh attempts', async () => {
      let fetchCallCount = 0;
      mockFetch.mockImplementation(() => {
        fetchCallCount++;
        return Promise.resolve(new Response(JSON.stringify({ token: 'new-token' }), {
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' })
        }));
      });

      const [result1, result2] = await Promise.all([
        testTokenService.startTokenRefresh(),
        testTokenService.startTokenRefresh()
      ]);

      expect(result1).toBe(result2);
      expect(fetchCallCount).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle refresh failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const token = await testTokenService.startTokenRefresh();
      expect(token).toBeNull();
      expect(mockRemove).toHaveBeenCalledWith('token', expect.objectContaining({
        path: '/',
        secure: true,
        sameSite: 'strict'
      }));
      expect(mockRemove).toHaveBeenCalledWith('refresh_token', expect.objectContaining({
        path: '/',
        secure: true,
        sameSite: 'strict'
      }));
    });

    it('should respect cooldown period after failed refresh', async () => {
      // Reset token service state
      testTokenService.clearTokens();

      // Set up initial refresh token
      mockGet.mockImplementation((key: string): string | null => {
        if (key === 'refresh_token') return testRefreshToken;
        return null;
      });

      // First attempt fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const token1 = await testTokenService.startTokenRefresh();
      expect(token1).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear refresh token for second attempt
      mockGet.mockImplementation((): string | null => null);

      // Second attempt should return null immediately
      const token2 = await testTokenService.startTokenRefresh();
      expect(token2).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should not call fetch again
    });
  });

  describe('Request Queue', () => {
    beforeEach(() => {
      // Set up refresh token
      mockGet.mockImplementation((key: unknown) => {
        const k = key as string;
        if (k === 'token') return 'Bearer test-token';
        if (k === 'refresh_token') return 'test-refresh-token';
        return null;
      });
    });

    it('should queue requests during token refresh', async () => {
      const mockRequest = jest.fn().mockImplementation(async () => new Response('', { status: 200 })) as jest.MockedFunction<() => Promise<Response>>;

      // Start token refresh
      const refreshPromise = testTokenService.startTokenRefresh();

      // Queue a request
      const queuedRequest = testTokenService.queueRequest(mockRequest);

      // Wait for refresh to complete
      await refreshPromise;

      // Request should be executed after refresh
      await queuedRequest;
      expect(mockRequest).toHaveBeenCalled();
    });

    it('should handle failed requests in queue', async () => {
      const mockRequest = jest.fn().mockImplementation(async () => {
        throw new Error('Request failed');
      }) as jest.MockedFunction<() => Promise<Response>>;

      // Start token refresh
      const refreshPromise = testTokenService.startTokenRefresh();

      // Queue a request
      const queuedRequest = testTokenService.queueRequest(mockRequest);

      // Wait for refresh to complete
      await refreshPromise;

      // Request should fail
      await expect(queuedRequest).rejects.toThrow('Request failed');
    });

    it('should handle failed token refresh for queued requests', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const mockRequest = jest.fn().mockImplementation(async () => new Response('', { status: 200 })) as jest.MockedFunction<() => Promise<Response>>;

      // Start token refresh
      const refreshPromise = testTokenService.startTokenRefresh();

      // Queue a request
      const queuedRequest = testTokenService.queueRequest(mockRequest);

      // Wait for refresh to fail
      await refreshPromise;

      // Queued request should be rejected
      await expect(queuedRequest).rejects.toThrow('Authentication failed');
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('should execute requests immediately if no refresh is needed', async () => {
      const mockRequest = jest.fn().mockImplementation(async () => new Response('', { status: 200 })) as jest.MockedFunction<() => Promise<Response>>;

      await testTokenService.queueRequest(mockRequest);
      expect(mockRequest).toHaveBeenCalled();
    });
  });
});