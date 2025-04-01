import { expect, jest, beforeEach, afterEach, describe, it } from '@jest/globals';
import { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import authApi, { User, LoginCredentials } from '@/lib/api/auth';
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

describe('Auth API', () => {
  // No need for separate mock variables when using spyOn

  beforeEach(() => {
    // Use jest.spyOn to mock methods on the actual objects
    jest.spyOn(apiClient, 'get').mockImplementation(async () => {
      throw new Error('apiClient.get spy not implemented for this test');
    });
    jest.spyOn(apiClient, 'post').mockImplementation(async () => {
      throw new Error('apiClient.post spy not implemented for this test');
    });
    jest.spyOn(tokenService, 'clearTokens').mockImplementation(() => {});
    // Corrected signature to match expected Promise<string>
    jest.spyOn(tokenService, 'startTokenRefresh').mockImplementation(async () => {
      throw new Error('tokenService.startTokenRefresh spy not implemented for this test');
    });
  });

  afterEach(() => {
    // Restore all original implementations and clear mocks
    jest.restoreAllMocks();
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
      // Arrange: Revert to simpler spy casting, keep `as any` on value
      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockSuccessResponse as any);

      // Act
      const result = await authApi.login(credentials);

      // Assert
      expect(result).toEqual({ token: mockApiResponseData.access_token });
      expect(apiClient.post).toHaveBeenCalledWith('/auth/token', credentials);
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(tokenService.clearTokens).not.toHaveBeenCalled();
    });

    it('should handle invalid credentials (401)', async () => {
      // Arrange: Revert to simpler spy casting, keep `as any` on value
      const error = createAxiosErrorResponse(401, 'Invalid credentials');
      (apiClient.post as jest.Mock).mockRejectedValueOnce(error as any);

      // Act & Assert
      await expect(authApi.login(credentials)).rejects.toThrow('Request failed with status code 401');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/token', credentials);
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(tokenService.clearTokens).not.toHaveBeenCalled();
    });

    it('should handle network errors (e.g., 500)', async () => {
      // Arrange: Revert to simpler spy casting, keep `as any` on value
      const error = createAxiosErrorResponse(500, 'Server Error');
      (apiClient.post as jest.Mock).mockRejectedValueOnce(error as any);

      // Act & Assert
      await expect(authApi.login(credentials)).rejects.toThrow('Request failed with status code 500');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/token', credentials);
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(tokenService.clearTokens).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should successfully logout and clear tokens', async () => {
      // Arrange: Mock API success using the spy with more specific casting
      const mockLogoutResponse: AxiosResponse = {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as InternalAxiosRequestConfig,
      };
      (apiClient.post as jest.Mock<Promise<AxiosResponse<any>>>).mockResolvedValueOnce(mockLogoutResponse as any);

      // Act
      await authApi.logout();

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(tokenService.clearTokens).toHaveBeenCalledTimes(1);
    });

    it('should clear tokens even if logout request fails', async () => {
      // Arrange: Mock API failure using the spy with more specific casting
      const error = createAxiosErrorResponse(500, 'Server Error');
      (apiClient.post as jest.Mock<Promise<AxiosResponse<any>>>).mockRejectedValueOnce(error as any);

      // Act & Assert
      // Logout function in auth.ts should catch the error and still clear tokens
      // Depending on implementation, it might re-throw or just log.
      // Assuming it re-throws based on previous tests:
      await expect(authApi.logout()).rejects.toThrow('Request failed with status code 500');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(tokenService.clearTokens).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCurrentUser', () => {
    const mockGetUserSuccessResponse: AxiosResponse<User> = {
        data: mockUser,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
    };

    it('should successfully fetch current user', async () => {
      // Arrange: Mock API success using the spy with more specific casting
      (apiClient.get as jest.Mock<Promise<AxiosResponse<User>>>).mockResolvedValueOnce(mockGetUserSuccessResponse as any);

      // Act
      const result = await authApi.getCurrentUser();

      // Assert
      expect(result).toEqual(mockUser);
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(apiClient.get).toHaveBeenCalledTimes(1);
      expect(tokenService.startTokenRefresh).not.toHaveBeenCalled();
      expect(tokenService.clearTokens).not.toHaveBeenCalled();
    });

    it('should handle unauthorized error (401), refresh token, and retry successfully', async () => {
      // Arrange: Mock sequence using spies with more specific casting
      const error401 = createAxiosErrorResponse(401, 'Token expired');
      (apiClient.get as jest.Mock<Promise<AxiosResponse<User>>>).mockRejectedValueOnce(error401 as any);
      // Cast startTokenRefresh spy
      (tokenService.startTokenRefresh as jest.Mock<Promise<string | null>>).mockResolvedValueOnce('new-access-token'); // Keep string | null based on previous error fix
      (apiClient.get as jest.Mock<Promise<AxiosResponse<User>>>).mockResolvedValueOnce(mockGetUserSuccessResponse as any);

      // Act
      const result = await authApi.getCurrentUser();

      // Assert
      expect(result).toEqual(mockUser);
      expect(tokenService.startTokenRefresh).toHaveBeenCalledTimes(1);
      expect(apiClient.get).toHaveBeenCalledTimes(2);
      expect(apiClient.get).toHaveBeenNthCalledWith(1, '/auth/me');
      expect(apiClient.get).toHaveBeenNthCalledWith(2, '/auth/me');
      expect(tokenService.clearTokens).not.toHaveBeenCalled();
    });

    it('should handle network errors (e.g., 500) and clear tokens', async () => {
      // Arrange: Mock API failure (non-401) using spy with more specific casting
      const error500 = createAxiosErrorResponse(500, 'Server Error');
      (apiClient.get as jest.Mock<Promise<AxiosResponse<User>>>).mockRejectedValueOnce(error500 as any);

      // Act & Assert
      await expect(authApi.getCurrentUser()).rejects.toThrow('Request failed with status code 500');
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(apiClient.get).toHaveBeenCalledTimes(1);
      expect(tokenService.startTokenRefresh).not.toHaveBeenCalled();
      expect(tokenService.clearTokens).toHaveBeenCalledTimes(1);
    });

    it('should handle unauthorized error (401) followed by token refresh failure and clear tokens', async () => {
      // Arrange: Mock sequence using spies with more specific casting
      const error401 = createAxiosErrorResponse(401, 'Token expired');
      const refreshError = new Error('No refresh token available');
      (apiClient.get as jest.Mock<Promise<AxiosResponse<User>>>).mockRejectedValueOnce(error401 as any);
      // Cast startTokenRefresh spy
      (tokenService.startTokenRefresh as jest.Mock<Promise<string | null>>).mockRejectedValueOnce(refreshError as any);

      // Act & Assert
      await expect(authApi.getCurrentUser()).rejects.toThrow('No refresh token available');
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(apiClient.get).toHaveBeenCalledTimes(1);
      expect(tokenService.startTokenRefresh).toHaveBeenCalledTimes(1);
      expect(tokenService.clearTokens).toHaveBeenCalledTimes(1);
    });

    it('should handle unauthorized error (401) followed by successful refresh but failure to get new token and clear tokens', async () => {
      // Arrange: Mock sequence using spies with more specific casting
      const error401 = createAxiosErrorResponse(401, 'Token expired');
      const refreshError = new Error('Refresh succeeded but no new token returned');
      (apiClient.get as jest.Mock<Promise<AxiosResponse<User>>>).mockRejectedValueOnce(error401 as any);
      // Cast startTokenRefresh spy
      (tokenService.startTokenRefresh as jest.Mock<Promise<string | null>>).mockRejectedValueOnce(refreshError as any);

      // Act & Assert
      await expect(authApi.getCurrentUser()).rejects.toThrow(refreshError.message);
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(apiClient.get).toHaveBeenCalledTimes(1);
      expect(tokenService.startTokenRefresh).toHaveBeenCalledTimes(1);
      expect(tokenService.clearTokens).toHaveBeenCalledTimes(1);
    });
  });

  // Add tests for other authApi methods (register, updateProfile, etc.) using this pattern

}); // End describe('Auth API')