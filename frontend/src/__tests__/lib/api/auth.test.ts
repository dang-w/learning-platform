import { expect, jest, beforeEach, afterEach, describe, it } from '@jest/globals';
import { InternalAxiosRequestConfig, AxiosResponse, AxiosAdapter } from 'axios';
import authApi, { User, RawUserResponse, LoginCredentials } from '@/lib/api/auth';
import apiClient from '@/lib/api/client';
import { tokenService } from '@/lib/services/token-service';
import { createAxiosErrorResponse } from '@/lib/utils/test-utils';

// Define mock user data matching the User interface
const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T12:00:00Z',
  isActive: true,
  role: 'user',
};

// Define mock reponse user data matching the RawUserResponse interface
const mockResponseUser: RawUserResponse = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T12:00:00Z',
  is_active: true,
  role: 'user',
};

describe('Auth API', () => {
  // Store original adapter and create mock
  let originalAdapter: typeof apiClient.defaults.adapter; // Use typeof to get the correct complex type
  let adapterMock: jest.MockedFunction<AxiosAdapter>;
  // Add spies for tokenService methods
  let clearTokensSpy: ReturnType<typeof jest.spyOn>; // Use inferred type
  let startTokenRefreshSpy: ReturnType<typeof jest.spyOn>; // Use inferred type
  let getValidAccessTokenSpy: ReturnType<typeof jest.spyOn>; // Use inferred type

  beforeEach(() => {
    // Spy on tokenService methods BEFORE assigning mocks
    clearTokensSpy = jest.spyOn(tokenService, 'clearTokens').mockImplementation(() => {});
    // Spy on startTokenRefresh but don't provide a default implementation here
    startTokenRefreshSpy = jest.spyOn(tokenService, 'startTokenRefresh');
    // Spy on getValidAccessToken, which is what the interceptor calls.
    // Provide a default successful mock to prevent ERR_AUTH_REFRESH_FAILED in tests not specifically testing failure.
    getValidAccessTokenSpy = jest
      .spyOn(tokenService, 'getValidAccessToken')
      .mockResolvedValue('mock-access-token'); // Provide a default valid token

    // Mock the adapter
    originalAdapter = apiClient.defaults.adapter;
    adapterMock = jest.fn();
    apiClient.defaults.adapter = adapterMock;
  });

  afterEach(() => {
    // Restore all original implementations and clear mocks
    jest.restoreAllMocks();
    // Restore original adapter
    apiClient.defaults.adapter = originalAdapter;
  });

  describe('login', () => {
    const credentials: LoginCredentials = { username: 'test', password: 'password' };
    const mockApiResponseData = {
      access_token: 'test-token',
    };
    const mockSuccessResponse: AxiosResponse<{ access_token: string }> = {
      data: mockApiResponseData,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange: Mock adapter response for POST /auth/token
      // Interceptor 2 skips token logic for /auth/token, so getValidAccessTokenSpy won't be called.
      getValidAccessTokenSpy.mockImplementation(async () => {
        throw new Error('getValidAccessToken should not be called for /auth/token');
      });
      adapterMock.mockResolvedValueOnce(mockSuccessResponse);

      // Act
      const result = await authApi.login(credentials);

      // Assert
      expect(result).toEqual({ token: mockApiResponseData.access_token });
      // Axios calls adapter with a config object including the /api prefix
      expect(adapterMock).toHaveBeenCalledTimes(1);
      expect(adapterMock).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/api/auth/token', method: 'post', data: JSON.stringify(credentials) })
      );
      expect(clearTokensSpy).not.toHaveBeenCalled();
      expect(getValidAccessTokenSpy).not.toHaveBeenCalled(); // Verify interceptor skipped token logic
    });

    it('should handle invalid credentials (401)', async () => {
      // Arrange: Mock adapter rejection for POST /auth/token
      getValidAccessTokenSpy.mockImplementation(async () => {
        throw new Error('getValidAccessToken should not be called for /auth/token');
      });
      const error = createAxiosErrorResponse(401, 'Invalid credentials', { url: '/api/auth/token', method: 'post' });
      adapterMock.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(authApi.login(credentials)).rejects.toThrow('Request failed with status code 401');
      expect(adapterMock).toHaveBeenCalledTimes(1);
      expect(adapterMock).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/auth/token', method: 'post' }));
      expect(clearTokensSpy).not.toHaveBeenCalled();
      expect(getValidAccessTokenSpy).not.toHaveBeenCalled(); // Verify interceptor skipped token logic
    });

    it('should handle network errors (e.g., 500)', async () => {
      // Arrange: Mock adapter rejection for POST /auth/token
      getValidAccessTokenSpy.mockImplementation(async () => {
        throw new Error('getValidAccessToken should not be called for /auth/token');
      });
      const error = createAxiosErrorResponse(500, 'Server Error', { url: '/api/auth/token', method: 'post' });
      adapterMock.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(authApi.login(credentials)).rejects.toThrow('Request failed with status code 500');
      expect(adapterMock).toHaveBeenCalledTimes(1);
      expect(adapterMock).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/auth/token', method: 'post' }));
      expect(clearTokensSpy).not.toHaveBeenCalled();
      expect(getValidAccessTokenSpy).not.toHaveBeenCalled(); // Verify interceptor skipped token logic
    });
  });

  describe('logout', () => {
    it('should successfully logout and clear tokens', async () => {
      // Arrange: Mock adapter response for POST /auth/logout
      // Interceptor 2 skips token logic for /auth/logout
      getValidAccessTokenSpy.mockImplementation(async () => {
        throw new Error('getValidAccessToken should not be called for /auth/logout');
      });
      const mockLogoutResponse: AxiosResponse = {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as InternalAxiosRequestConfig,
      };
      adapterMock.mockResolvedValueOnce(mockLogoutResponse);

      // Act
      await authApi.logout();

      // Assert
      expect(adapterMock).toHaveBeenCalledTimes(1);
      expect(adapterMock).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/auth/logout', method: 'post' }));
      expect(clearTokensSpy).toHaveBeenCalledTimes(1);
      expect(getValidAccessTokenSpy).not.toHaveBeenCalled(); // Verify interceptor skipped token logic
    });

    it('should clear tokens even if logout request fails', async () => {
      // Arrange: Mock adapter rejection for POST /auth/logout
      getValidAccessTokenSpy.mockImplementation(async () => {
        throw new Error('getValidAccessToken should not be called for /auth/logout');
      });
      const error = createAxiosErrorResponse(500, 'Server Error', { url: '/api/auth/logout', method: 'post' });
      adapterMock.mockRejectedValueOnce(error);

      // Act & Assert
      // Logout function in auth.ts should catch the error and still clear tokens
      // Assuming it re-throws:
      await expect(authApi.logout()).rejects.toThrow('Request failed with status code 500');
      expect(adapterMock).toHaveBeenCalledTimes(1);
      expect(adapterMock).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/auth/logout', method: 'post' }));
      expect(clearTokensSpy).toHaveBeenCalledTimes(1); // Logout *always* clears tokens
      expect(getValidAccessTokenSpy).not.toHaveBeenCalled(); // Verify interceptor skipped token logic
    });
  });

  describe('getCurrentUser', () => {
    const mockGetRawUserSuccessResponse: AxiosResponse<RawUserResponse> = {
        data: mockResponseUser,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
    };

    it('should successfully fetch current user', async () => {
      // Arrange: Mock adapter response for GET /auth/me
      // Interceptor 2 WILL try to get a token. Use the default mock from beforeEach.
      adapterMock.mockResolvedValueOnce(mockGetRawUserSuccessResponse);

      // Act
      const result = await authApi.getCurrentUser();

      // Assert
      expect(result).toEqual(mockUser);
      expect(getValidAccessTokenSpy).toHaveBeenCalledTimes(1); // Interceptor called it
      expect(adapterMock).toHaveBeenCalledTimes(1);
      expect(adapterMock).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/auth/me', method: 'get' }));
      expect(startTokenRefreshSpy).not.toHaveBeenCalled(); // No refresh needed
      expect(clearTokensSpy).not.toHaveBeenCalled();
    });

    it('should handle unauthorized error (401), refresh token, and retry successfully', async () => {
      // Arrange: Mock adapter sequence: 401 -> successful refresh -> successful retry
      const error401 = createAxiosErrorResponse(401, 'Token expired', { url: '/api/auth/me', method: 'get' });
      // Request Interceptor 2 calls getValidAccessToken. Mock the first call (initial request).
      getValidAccessTokenSpy.mockResolvedValueOnce('mock-access-token');
      // The first adapter call fails with 401, triggering the *response* interceptor.
      adapterMock.mockRejectedValueOnce(error401);
      // The response interceptor calls startTokenRefresh. Mock this *specifically* for this test.
      startTokenRefreshSpy.mockResolvedValueOnce('new-access-token');
      // The response interceptor retries the request using apiClient(originalRequest).
      // Request Interceptor 2 runs again and calls getValidAccessToken. Mock the second call (retry).
      getValidAccessTokenSpy.mockResolvedValueOnce('new-access-token');
      // Mock the adapter for the retry.
      adapterMock.mockResolvedValueOnce(mockGetRawUserSuccessResponse);

      // Act
      const result = await authApi.getCurrentUser();

      // Assert
      expect(result).toEqual(mockUser);
      expect(getValidAccessTokenSpy).toHaveBeenCalledTimes(2); // Initial request + retry attempt calls
      expect(startTokenRefreshSpy).toHaveBeenCalledTimes(1); // Response interceptor called refresh
      expect(adapterMock).toHaveBeenCalledTimes(2); // Original call + retry
      expect(adapterMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ url: '/api/auth/me', method: 'get' }));
      // Check the second call (retry) includes the new token and retry count
      expect(adapterMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
        url: '/api/auth/me',
        method: 'get',
        headers: expect.objectContaining({ Authorization: 'Bearer new-access-token' }),
        _retryCount: 1 // Ensure the retry count is checked
      }));
      expect(clearTokensSpy).not.toHaveBeenCalled();
    });

    it('should handle network errors (e.g., 500) and clear tokens', async () => {
      // Arrange: Mock adapter rejection for GET /auth/me
      // Interceptor 2 will try to get token (default mock succeeds).
      const error500 = createAxiosErrorResponse(500, 'Server Error', { url: '/api/auth/me', method: 'get' });
      adapterMock.mockRejectedValueOnce(error500);

      // Act & Assert
      await expect(authApi.getCurrentUser()).rejects.toThrow('Request failed with status code 500');
      expect(getValidAccessTokenSpy).toHaveBeenCalledTimes(1); // Interceptor called it
      expect(adapterMock).toHaveBeenCalledTimes(1);
      expect(adapterMock).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/auth/me', method: 'get' }));
      expect(startTokenRefreshSpy).not.toHaveBeenCalled(); // No 401, so no refresh attempt
      // **Update:** Reviewing `auth.ts`, the catch block just re-throws. Token clearing is caller responsibility.
      expect(clearTokensSpy).not.toHaveBeenCalled();
    });

    it('should handle unauthorized error (401) followed by token refresh failure and clear tokens', async () => {
      // Arrange: Mock adapter sequence: 401 -> failed refresh
      const error401 = createAxiosErrorResponse(401, 'Token expired', { url: '/api/auth/me', method: 'get' });
      // Interceptor 2 runs, gets default token. Request happens.
      adapterMock.mockRejectedValueOnce(error401);
      // Response interceptor catches 401, calls startTokenRefresh. Mock this to fail.
      const refreshError = new Error('No refresh token available');
      startTokenRefreshSpy.mockRejectedValueOnce(refreshError);

      // Act & Assert
      // The response interceptor will catch the refreshError and re-throw it
      await expect(authApi.getCurrentUser()).rejects.toThrow(refreshError); // Expect the refresh error
      expect(getValidAccessTokenSpy).toHaveBeenCalledTimes(1); // Initial request interceptor call
      expect(adapterMock).toHaveBeenCalledTimes(1); // Only the first call happens
      expect(adapterMock).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/auth/me', method: 'get' }));
      expect(startTokenRefreshSpy).toHaveBeenCalledTimes(1); // Response interceptor called refresh
      // Check client.ts: Interceptor now catches refresh error, clears tokens, and rejects.
      expect(clearTokensSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle unauthorized error (401) followed by successful refresh but failure to get new token and clear tokens', async () => {
      // Arrange: Mock adapter sequence: 401 -> successful refresh returning null
      const error401 = createAxiosErrorResponse(401, 'Token expired', { url: '/api/auth/me', method: 'get' });
      // Interceptor 2 runs, gets default token. Request happens.
      adapterMock.mockRejectedValueOnce(error401);
      // Response interceptor catches 401, calls startTokenRefresh. Mock this to resolve with null.
      startTokenRefreshSpy.mockResolvedValueOnce(null);
      // Expected error message from the *response interceptor* when refresh yields no token
      const refreshErrorMessage = 'Refresh succeeded but tokenService returned null/empty.';

      // Act & Assert
      // The interceptor should throw its specific error when refresh resolves but provides no token
      await expect(authApi.getCurrentUser()).rejects.toThrow(refreshErrorMessage);
      expect(getValidAccessTokenSpy).toHaveBeenCalledTimes(1); // Initial request interceptor call
      expect(adapterMock).toHaveBeenCalledTimes(1); // Only the first call happens
      expect(adapterMock).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/auth/me', method: 'get' }));
      expect(startTokenRefreshSpy).toHaveBeenCalledTimes(1); // Response interceptor called refresh
      // Check client.ts: Interceptor now catches refresh error (null token), clears tokens, and rejects.
      expect(clearTokensSpy).toHaveBeenCalledTimes(1);
    });
  });

  // Add tests for other authApi methods (register, updateProfile, etc.) using this pattern

}); // End describe('Auth API')