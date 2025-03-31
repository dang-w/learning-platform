import { expect, jest, beforeEach, afterEach, describe, it } from '@jest/globals';
import { InternalAxiosRequestConfig } from 'axios';
import authApi, { User, LoginCredentials } from '../../../lib/api/auth';
import apiClient from '../../../lib/api/client';
import { tokenService } from '../../../lib/services/token-service';
import { createAxiosErrorResponse } from '../../../lib/utils/test-utils';

// Store original implementations
const originalApiGet = apiClient.get;
const originalApiPost = apiClient.post;
const originalTokenClear = tokenService.clearTokens;
const originalTokenRefresh = tokenService.startTokenRefresh;

// Define mock variables (can use simple jest.Mock type here)
let mockApiGet: jest.Mock;
let mockApiPost: jest.Mock;
let mockTokenClear: jest.Mock;
let mockTokenRefresh: jest.Mock;

// Define a reusable mock user
const mockUser: User = {
  id: '1',
  username: 'test',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true,
  role: 'user',
};

describe('Auth API', () => {
  beforeEach(() => {
    // Create fresh mocks for each test and assign them
    mockApiGet = jest.fn(async () => {
        throw new Error('apiClient.get mock not implemented for this test');
    });
    mockApiPost = jest.fn(async () => {
        throw new Error('apiClient.post mock not implemented for this test');
    });
    mockTokenClear = jest.fn(() => {});
    mockTokenRefresh = jest.fn(async () => {
        throw new Error('tokenService.startTokenRefresh mock not implemented for this test');
    });

    // Overwrite the actual methods with our mocks
    apiClient.get = mockApiGet;
    apiClient.post = mockApiPost;
    tokenService.clearTokens = mockTokenClear;
    tokenService.startTokenRefresh = mockTokenRefresh;
  });

  afterEach(() => {
    // Restore original implementations after each test
    apiClient.get = originalApiGet;
    apiClient.post = originalApiPost;
    tokenService.clearTokens = originalTokenClear;
    tokenService.startTokenRefresh = originalTokenRefresh;
  });

  describe('login', () => {
    const credentials: LoginCredentials = { username: 'test', password: 'password' };
    const mockLoginResponse = {
      token: 'test-token',
      refreshToken: 'test-refresh-token',
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange: Mock API success using the spy
      mockApiPost.mockResolvedValueOnce({ // Use the mock variable
        data: mockLoginResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      });

      // Act
      const result = await authApi.login(credentials);

      // Assert
      expect(result).toEqual(mockLoginResponse);
      expect(mockApiPost).toHaveBeenCalledWith('/auth/login', credentials);
      expect(mockApiPost).toHaveBeenCalledTimes(1);
      expect(mockTokenClear).not.toHaveBeenCalled();
    });

    it('should handle invalid credentials (401)', async () => {
      // Arrange: Mock API failure (401) using the spy
      const error = createAxiosErrorResponse(401, 'Invalid credentials');
      mockApiPost.mockRejectedValueOnce(error); // Use the mock variable

      // Act & Assert
      await expect(authApi.login(credentials)).rejects.toThrow('Request failed with status code 401');
      expect(mockApiPost).toHaveBeenCalledWith('/auth/login', credentials);
      expect(mockApiPost).toHaveBeenCalledTimes(1);
      expect(mockTokenClear).not.toHaveBeenCalled();
    });

    it('should handle network errors (e.g., 500)', async () => {
      // Arrange: Mock API failure (500) using the spy
      const error = createAxiosErrorResponse(500, 'Server Error');
      mockApiPost.mockRejectedValueOnce(error); // Use the mock variable

      // Act & Assert
      await expect(authApi.login(credentials)).rejects.toThrow('Request failed with status code 500');
      expect(mockApiPost).toHaveBeenCalledWith('/auth/login', credentials);
      expect(mockApiPost).toHaveBeenCalledTimes(1);
      expect(mockTokenClear).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should successfully logout and clear tokens', async () => {
      // Arrange: Mock API success using the spy
      mockApiPost.mockResolvedValueOnce({ // Use the mock variable
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      });

      // Act
      await authApi.logout();

      // Assert
      expect(mockApiPost).toHaveBeenCalledWith('/auth/logout');
      expect(mockApiPost).toHaveBeenCalledTimes(1);
      expect(mockTokenClear).toHaveBeenCalledTimes(1); // Use the mock variable
    });

    it('should clear tokens even if logout request fails', async () => {
      // Arrange: Mock API failure using the spy
      const error = createAxiosErrorResponse(500, 'Server Error');
      mockApiPost.mockRejectedValueOnce(error); // Use the mock variable

      // Act & Assert
      await expect(authApi.logout()).rejects.toThrow('Request failed with status code 500');
      expect(mockApiPost).toHaveBeenCalledWith('/auth/logout');
      expect(mockApiPost).toHaveBeenCalledTimes(1);
      expect(mockTokenClear).toHaveBeenCalledTimes(1); // Use the mock variable
    });
  });

  describe('getCurrentUser', () => {
    it('should successfully fetch current user', async () => {
      // Arrange: Mock API success using the spy
      mockApiGet.mockResolvedValueOnce({ // Use the mock variable
        data: mockUser,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      });

      // Act
      const result = await authApi.getCurrentUser();

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockApiGet).toHaveBeenCalledWith('/auth/me');
      expect(mockApiGet).toHaveBeenCalledTimes(1);
      expect(mockTokenRefresh).not.toHaveBeenCalled(); // Use the mock variable
      expect(mockTokenClear).not.toHaveBeenCalled(); // Use the mock variable
    });

    it('should handle unauthorized error (401), refresh token, and retry successfully', async () => {
      // Arrange: Mock sequence using spies
      const error401 = createAxiosErrorResponse(401, 'Token expired');
      mockApiGet.mockRejectedValueOnce(error401); // First call fails
      mockTokenRefresh.mockResolvedValueOnce('new-access-token'); // Refresh succeeds
      mockApiGet.mockResolvedValueOnce({ // Second call succeeds
        data: mockUser,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      });

      // Act
      const result = await authApi.getCurrentUser();

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockTokenRefresh).toHaveBeenCalledTimes(1);
      expect(mockApiGet).toHaveBeenCalledTimes(2);
      expect(mockApiGet).toHaveBeenNthCalledWith(1, '/auth/me');
      expect(mockApiGet).toHaveBeenNthCalledWith(2, '/auth/me');
      expect(mockTokenClear).not.toHaveBeenCalled();
    });

    it('should handle network errors (e.g., 500) and clear tokens', async () => {
      // Arrange: Mock API failure (non-401) using spy
      const error500 = createAxiosErrorResponse(500, 'Server Error');
      mockApiGet.mockRejectedValueOnce(error500);

      // Act & Assert
      await expect(authApi.getCurrentUser()).rejects.toThrow('Request failed with status code 500');
      expect(mockApiGet).toHaveBeenCalledWith('/auth/me');
      expect(mockApiGet).toHaveBeenCalledTimes(1);
      expect(mockTokenRefresh).not.toHaveBeenCalled();
      expect(mockTokenClear).toHaveBeenCalledTimes(1);
    });

    it('should handle unauthorized error (401) followed by token refresh failure and clear tokens', async () => {
      // Arrange: Mock sequence using spies
      const error401 = createAxiosErrorResponse(401, 'Token expired');
      const refreshError = new Error('No refresh token available');
      mockApiGet.mockRejectedValueOnce(error401); // First call fails
      mockTokenRefresh.mockRejectedValueOnce(refreshError); // Refresh fails

      // Act & Assert
      await expect(authApi.getCurrentUser()).rejects.toThrow('No refresh token available');
      expect(mockApiGet).toHaveBeenCalledWith('/auth/me');
      expect(mockApiGet).toHaveBeenCalledTimes(1);
      expect(mockTokenRefresh).toHaveBeenCalledTimes(1);
      expect(mockTokenClear).toHaveBeenCalledTimes(1);
    });

     it('should handle unauthorized error (401) followed by successful refresh but no new token and clear tokens', async () => {
      // Arrange: Mock sequence using spies
      const error401 = createAxiosErrorResponse(401, 'Token expired');
      mockApiGet.mockRejectedValueOnce(error401); // First call fails
      mockTokenRefresh.mockResolvedValueOnce(null); // Refresh succeeds but returns null

      // Act & Assert
      await expect(authApi.getCurrentUser()).rejects.toThrow('Request failed with status code 401');
      expect(mockApiGet).toHaveBeenCalledWith('/auth/me');
      expect(mockApiGet).toHaveBeenCalledTimes(1);
      expect(mockTokenRefresh).toHaveBeenCalledTimes(1);
      expect(mockTokenClear).toHaveBeenCalled();
    });
  });

  // Add tests for other authApi methods (register, updateProfile, etc.) using this pattern

}); // End describe('Auth API')