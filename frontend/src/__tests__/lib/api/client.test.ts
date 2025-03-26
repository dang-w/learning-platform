/* eslint-disable @typescript-eslint/no-unused-vars */
/// <reference lib="dom" />

import { expect, jest, describe, beforeEach, afterEach, it } from '@jest/globals';
import MockAdapter from 'axios-mock-adapter';
import axios, { AxiosInstance } from 'axios';
import type { TokenRefreshError as TokenRefreshErrorType } from '../../../lib/api/client';
import { getStandardizedUrl } from '../../../lib/api/client';

// Create mock functions for cookie utils
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockRemove = jest.fn();

// Create a manual mock for token service with proper types
const mockTokenService = {
  getToken: jest.fn<() => string | null>(),
  isRefreshingToken: jest.fn<() => boolean>(),
  startTokenRefresh: jest.fn<() => Promise<string | null>>(),
  queueRequest: jest.fn<(request: () => Promise<Response>) => Promise<Response>>(),
  setTokens: jest.fn<(token: string, refreshToken?: string) => void>(),
  clearTokens: jest.fn<() => void>(),
  onTokenChange: jest.fn<(callback: (token: string | null) => void) => () => void>(),
  isTokenExpired: jest.fn<() => boolean>()
};

// Mock the modules BEFORE importing apiClient
jest.mock('../../../lib/services/token-service', () => ({
  tokenService: mockTokenService
}));

jest.mock('../../../lib/utils/cookie', () => ({
  cookieUtils: {
    get: mockGet,
    set: mockSet,
    remove: mockRemove
  }
}));

jest.mock('../../../lib/config', () => ({
  BACKEND_API_URL: 'http://localhost:3000'
}));

// Import and create a fresh apiClient for testing
const apiClientModule = jest.requireActual<{
  default: AxiosInstance;
  TokenRefreshError: typeof TokenRefreshErrorType;
  withBackoff: <T>(fn: () => Promise<T>, maxRetries?: number, initialDelay?: number) => Promise<T>;
}>('../../../lib/api/client');

const { TokenRefreshError, withBackoff } = apiClientModule;
const BACKEND_API_URL = 'http://localhost:3000';

describe('API Client', () => {
  let mockAxios: MockAdapter;
  let apiClient: AxiosInstance;
  const testToken = 'test-token';
  const newToken = 'new-token';
  const testData = { data: 'test' };

  beforeEach(() => {
    // Reset all mocks first
    jest.clearAllMocks();

    // Create a fresh axios instance with the same config
    apiClient = axios.create({
      baseURL: BACKEND_API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Add URL standardization interceptor
    apiClient.interceptors.request.use((config) => {
      if (config.url) {
        config.url = getStandardizedUrl(config.url);
      }
      return config;
    });

    // Add auth token interceptor
    apiClient.interceptors.request.use(
      async (config) => {
        // Check for refresh token endpoint first, before any token service calls
        // Handle both standardized (/api/auth/token/refresh) and non-standardized (auth/token/refresh) paths
        if (config.url?.includes('auth/token/refresh')) {
          return config;
        }

        // Only try to get token for non-refresh requests
        try {
          const token = mockTokenService.getToken();
          if (token) {
            config.headers = config.headers || {};
            config.headers['Authorization'] = `Bearer ${token}`;
          }
        } catch {
          // Silently handle error and continue without token
        }

        return config;
      }
    );

    // Add response interceptor for token refresh
    apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (!originalRequest) {
          return Promise.reject(error);
        }

        if (originalRequest.url?.includes('/auth/token/refresh')) {
          mockTokenService.clearTokens();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        if (!error.response || error.response.status !== 401 || originalRequest._retryCount >= 2) {
          return Promise.reject(error);
        }

        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

        if (mockTokenService.isRefreshingToken()) {
          return mockTokenService.queueRequest(() => apiClient(originalRequest));
        }

        try {
          const newToken = await mockTokenService.startTokenRefresh();
          if (!newToken) {
            throw new TokenRefreshError('Token refresh failed - no token returned');
          }

          // Update the token service state with the new token
          mockTokenService.setTokens(newToken);

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

          return apiClient(originalRequest);
        } catch (refreshError) {
          if (refreshError instanceof TokenRefreshError) {
            mockTokenService.clearTokens();
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }
    );

    // Create mock adapter for our test instance
    mockAxios = new MockAdapter(apiClient);

    // Set up mock implementations with proper types
    mockTokenService.getToken.mockReturnValue(testToken);
    mockTokenService.isRefreshingToken.mockReturnValue(false);
    mockTokenService.startTokenRefresh.mockResolvedValue(newToken);
    mockTokenService.queueRequest.mockImplementation(request => request());
    mockTokenService.setTokens.mockImplementation(() => {});
    mockTokenService.clearTokens.mockImplementation(() => {});
    mockTokenService.onTokenChange.mockImplementation(() => () => {});
    mockTokenService.isTokenExpired.mockReturnValue(false);

    // Set up cookie utils mocks with proper types
    mockGet.mockReturnValue(testToken);
    mockSet.mockImplementation(() => {});
    mockRemove.mockImplementation(() => {});

    // Reset window.location.href
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true
    });

    // Add debug logging for interceptor setup
    console.log('Mock setup complete');
    console.log('TokenService mock state:', {
      getToken: mockTokenService.getToken.getMockImplementation(),
      startTokenRefresh: mockTokenService.startTokenRefresh.getMockImplementation()
    });
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('URL Standardization', () => {
    const urlTestCases = [
      { input: 'test', expected: '/api/test' },
      { input: '/test', expected: '/api/test' },
      { input: '/api/test', expected: '/api/test' },
      { input: 'http://example.com/test', expected: 'http://example.com/test' },
      { input: '/test/with//multiple///slashes', expected: '/api/test/with/multiple/slashes' },
      { input: '/api//test', expected: '/api/test' },
      { input: 'auth/token/refresh', expected: '/api/auth/token/refresh' }
    ];

    urlTestCases.forEach(({ input, expected }) => {
      it(`should standardize "${input}" to "${expected}"`, async () => {
        mockAxios.onGet(expected).reply(200, testData);

        if (input.startsWith('http')) {
          mockAxios.onGet(input).reply(200, testData);
        }

        await apiClient.get(input);
        const lastRequest = mockAxios.history.get[mockAxios.history.get.length - 1];

        if (input.startsWith('http')) {
          expect(lastRequest.url).toBe(input);
        } else {
          expect(lastRequest.url).toBe(expected);
        }
      });
    });
  });

  describe('Request Interceptor', () => {
    it('should add auth token with Bearer prefix to requests when available', async () => {
      mockAxios.onGet('/api/test').reply(() => [200, testData]);

      mockTokenService.getToken.mockReturnValue(testToken);
      await apiClient.get('test');

      expect(mockTokenService.getToken).toHaveBeenCalled();
      expect(mockAxios.history.get[0].headers?.Authorization).toBe(`Bearer ${testToken}`);
    });

    it('should not add auth token when token is not available', async () => {
      mockAxios.onGet('/api/test').reply(() => [200, testData]);

      mockTokenService.getToken.mockReturnValue(null);
      await apiClient.get('test');

      expect(mockTokenService.getToken).toHaveBeenCalled();
      expect(mockAxios.history.get[0].headers?.Authorization).toBeUndefined();
    });

    it('should not add auth token to refresh token requests', async () => {
      mockAxios.onPost('/api/auth/token/refresh').reply(200, { token: newToken });

      await apiClient.post('auth/token/refresh');

      expect(mockTokenService.getToken).not.toHaveBeenCalled();
      expect(mockAxios.history.post[0].headers?.Authorization).toBeUndefined();
    });

    it('should handle token service errors gracefully', async () => {
      mockAxios.onGet('/api/test').reply(200, testData);
      mockTokenService.getToken.mockImplementation(() => {
        throw new Error('Token service error');
      });

      await apiClient.get('test');

      expect(mockTokenService.getToken).toHaveBeenCalled();
      expect(mockAxios.history.get[0].headers?.Authorization).toBeUndefined();
    });
  });

  describe('Token Refresh Flow', () => {
    it('should handle token refresh when receiving 401', async () => {
      mockAxios
        .onGet('/api/test')
        .replyOnce(401)
        .onGet('/api/test')
        .reply(200, testData);

      mockTokenService.getToken
        .mockReturnValueOnce(testToken)
        .mockReturnValue(newToken);

      const response = await apiClient.get('test');

      expect(mockTokenService.startTokenRefresh).toHaveBeenCalled();
      expect(response.data).toEqual(testData);
      expect(mockAxios.history.get[1].headers?.Authorization).toBe(`Bearer ${newToken}`);
    });

    it('should handle multiple concurrent requests during refresh', async () => {
      mockAxios
        .onGet('/api/test')
        .replyOnce(401)
        .onGet('/api/test')
        .reply(200, testData);

      mockTokenService.getToken
        .mockReturnValueOnce(testToken)
        .mockReturnValue(newToken);

      mockTokenService.isRefreshingToken
        .mockReturnValueOnce(false)
        .mockReturnValue(true);

      const requests = [
        apiClient.get('test'),
        apiClient.get('test'),
        apiClient.get('test')
      ];

      const responses = await Promise.all(requests);

      expect(mockTokenService.startTokenRefresh).toHaveBeenCalledTimes(1);

      responses.forEach(response => {
        expect(response.data).toEqual(testData);
        expect(response.config.headers?.Authorization).toBe(`Bearer ${newToken}`);
      });
    });

    it('should handle refresh token endpoint failure', async () => {
      mockAxios
        .onPost('/api/auth/token/refresh')
        .reply(401, { message: 'Invalid refresh token' });

      try {
        await apiClient.post('auth/token/refresh');
      } catch (error) {
        expect(mockTokenService.clearTokens).toHaveBeenCalled();
        expect(window.location.href).toBe('/login');
      }
    });

    it('should respect retry limit for 401 errors', async () => {
      mockAxios.onGet('/api/test').reply(401);

      try {
        await apiClient.get('test');
      } catch (error) {
        expect(mockTokenService.startTokenRefresh).toHaveBeenCalledTimes(2);
      }
    });

    it('should clear tokens and redirect on refresh token failure', async () => {
      mockAxios.onGet('/api/test').reply(401);
      mockTokenService.startTokenRefresh.mockImplementation(() => {
        throw new TokenRefreshError('Refresh failed');
      });

      try {
        await apiClient.get('test');
      } catch (error) {
        expect(mockTokenService.clearTokens).toHaveBeenCalled();
        expect(window.location.href).toBe('/login');
      }
    });
  });

  describe('withBackoff', () => {
    it('should retry failed requests with exponential backoff', async () => {
      const mockFn = jest.fn<() => Promise<string>>();
      mockFn
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('success');

      const result = await withBackoff(mockFn);
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const error = new Error('Test error');
      const mockFn = jest.fn<() => Promise<never>>();
      mockFn.mockRejectedValue(error);

      await expect(withBackoff(mockFn, 2)).rejects.toThrow(error);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential delay between retries', async () => {
      jest.useFakeTimers();

      const mockFn = jest.fn<() => Promise<string>>();
      mockFn
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('success');

      const promise = withBackoff(mockFn, 2, 100);

      await Promise.resolve();
      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
      expect(mockFn).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(200);
      await Promise.resolve();
      await Promise.resolve();
      expect(mockFn).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toBe('success');

      jest.useRealTimers();
    });
  });
});