import authApi, { LoginCredentials, RegisterData, User, AuthResponse } from '@/lib/api/auth';
import apiClient from '@/lib/api/client';
import axios from 'axios';
import { expect } from '@jest/globals';

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(),
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

// Mock the apiClient
jest.mock('@/lib/api/client', () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  withBackoff: jest.fn((fn) => fn())
}));

// Mock constants
jest.mock('@/config', () => ({
  API_URL: 'http://test-api.com',
  BACKEND_API_URL: 'http://test-backend-api.com'
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('login', () => {
    it('should call the login endpoint and store the token', async () => {
      // Mock response
      const mockAuthResponse: AuthResponse = {
        access_token: 'test-token',
        refresh_token: 'test-refresh-token',
        token_type: 'bearer',
      };
      const mockSessionResponse = {
        data: {
          session_id: 'test-session-id'
        }
      };

      // Setup the mock to return different responses for different calls
      (axios.post as jest.Mock)
        .mockResolvedValueOnce({ data: mockAuthResponse }) // First call for token
        .mockResolvedValueOnce(mockSessionResponse); // Second call for session

      // Test credentials
      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'password123',
      };

      // Call the function
      const result = await authApi.login(credentials);

      // Verify first call is for token with correct form data
      const firstCall = (axios.post as jest.Mock).mock.calls[0];
      expect(firstCall[0]).toBe('http://test-backend-api.com/auth/token');
      // Verify the form data contains username and password
      const formData = firstCall[1];
      expect(formData instanceof URLSearchParams).toBeTruthy();
      expect(formData.get('username')).toBe('testuser');
      expect(formData.get('password')).toBe('password123');
      // Verify headers
      expect(firstCall[2].headers['Content-Type']).toBe('application/x-www-form-urlencoded');

      // Verify result matches mock response
      expect(result).toEqual(mockAuthResponse);

      // Verify tokens stored in localStorage
      expect(localStorage.getItem('token')).toBe('test-token');
      expect(localStorage.getItem('refreshToken')).toBe('test-refresh-token');
      expect(localStorage.getItem('sessionId')).toBe('test-session-id');
    });

    it('should handle login errors', async () => {
      // Mock error response
      const mockError = {
        response: {
          status: 401,
          data: { detail: 'Invalid credentials' }
        }
      };
      (axios.post as jest.Mock).mockRejectedValueOnce(mockError);

      // Test credentials
      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'wrong-password',
      };

      // Call the function and expect it to throw
      await expect(authApi.login(credentials)).rejects.toThrow('Invalid username or password');

      // Verify axios.post was called with correct arguments
      expect(axios.post).toHaveBeenCalledWith(
        'http://test-backend-api.com/auth/token',
        expect.any(URLSearchParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Verify no tokens in localStorage
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('sessionId')).toBeNull();
    });
  });

  describe('register', () => {
    it('should call the register endpoint', async () => {
      // Mock successful response for registration
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          session_id: 'test-session-id'
        }
      });

      // Test data
      const registerData: RegisterData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      // Call the function
      const result = await authApi.register(registerData);

      // Assertions
      expect(axios.post).toHaveBeenCalledWith(
        'http://test-backend-api.com/users/',
        registerData,
        { headers: { 'Content-Type': 'application/json' } }
      );

      // The result should be the session data
      expect(result).toEqual({ session_id: 'test-session-id' });
    });

    it('should handle registration errors', async () => {
      // Mock error response
      const mockError = {
        response: {
          status: 400,
          data: {
            detail: 'Username already registered'
          }
        }
      };
      (axios.post as jest.Mock).mockRejectedValueOnce(mockError);

      // Test data
      const registerData: RegisterData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      // Call the function and expect it to throw with specific message
      await expect(authApi.register(registerData)).rejects.toThrow(
        'Username is already taken. Please choose another username.'
      );

      // Assertions
      expect(axios.post).toHaveBeenCalledWith(
        'http://test-backend-api.com/users/',
        registerData,
        { headers: { 'Content-Type': 'application/json' } }
      );
    });
  });

  describe('getCurrentUser', () => {
    let fetchMock: jest.Mock;

    beforeEach(() => {
      fetchMock = jest.fn();
      global.fetch = fetchMock;
      localStorage.setItem('token', 'test-token');
    });

    it('should call the getCurrentUser endpoint', async () => {
      // Mock response
      const mockUser: User = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        createdAt: '2023-01-01T00:00:00Z',
        role: 'student',
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockUser
      });

      // Call the function
      const result = await authApi.getCurrentUser();

      // Assertions
      expect(fetchMock).toHaveBeenCalledWith('http://test-backend-api.com/users/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should handle getCurrentUser errors', async () => {
      // Mock error response
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' })
      });

      // Call the function and expect it to throw
      await expect(authApi.getCurrentUser()).rejects.toThrow();

      // Assertions
      expect(fetchMock).toHaveBeenCalledWith('http://test-backend-api.com/users/me', expect.any(Object));
    });
  });

  describe('refreshToken', () => {
    let fetchMock: jest.Mock;

    beforeEach(() => {
      fetchMock = jest.fn();
      global.fetch = fetchMock;
      localStorage.clear();
    });

    it('should refresh token successfully', async () => {
      // Setup
      localStorage.setItem('refresh_token', 'old-refresh-token');
      const mockToken = { token: 'new-token', refresh_token: 'new-refresh-token' };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockToken)
      });

      // Execute
      const result = await authApi.refreshAuthToken();

      // Verify
      expect(result).toBe(true);
      expect(localStorage.getItem('token')).toBe('new-token');
      expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toContain('/api/auth/token/refresh');
    });

    it('should handle refresh token failure', async () => {
      // Setup
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      // Execute
      const result = await authApi.refreshAuthToken();

      // Verify
      expect(result).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('logout', () => {
    it('should call the logout endpoint and remove the token', async () => {
      // Set up localStorage with a token
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('refreshToken', 'test-refresh-token');
      localStorage.setItem('sessionId', 'test-session-id');

      // Mock response
      (apiClient.post as jest.Mock).mockResolvedValue({});

      // Call the function
      await authApi.logout();

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', {}, {
        headers: {
          'x-session-id': 'test-session-id'
        }
      });
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('sessionId')).toBeNull();
    });

    it('should handle logout errors but still remove the token', async () => {
      // Set up localStorage with a token
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('refreshToken', 'test-refresh-token');

      // Mock error response
      const mockError = new Error('Server error');
      (apiClient.post as jest.Mock).mockRejectedValue(mockError);

      // Call the function
      await authApi.logout();

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should call the updateProfile endpoint', async () => {
      // Mock response
      const mockUser: User = {
        id: '123',
        username: 'testuser',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
        createdAt: '2023-01-01T00:00:00Z',
        role: 'student',
      };
      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockUser });

      // Test data
      const updateData: Partial<User> = {
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
      };

      // Call the function
      const result = await authApi.updateProfile(updateData);

      // Assertions
      expect(apiClient.put).toHaveBeenCalledWith('/users/me/', updateData);
      expect(result).toEqual(mockUser);
    });

    it('should handle updateProfile errors', async () => {
      // Mock error response
      const mockError = new Error('Invalid email format');
      (apiClient.put as jest.Mock).mockRejectedValue(mockError);

      // Test data
      const updateData: Partial<User> = {
        email: 'invalid-email',
      };

      // Call the function and expect it to throw
      await expect(authApi.updateProfile(updateData)).rejects.toThrow();

      // Assertions
      expect(apiClient.put).toHaveBeenCalledWith('/users/me/', updateData);
    });
  });

  describe('changePassword', () => {
    it('should call the changePassword endpoint', async () => {
      // Mock response
      (apiClient.post as jest.Mock).mockResolvedValue({});

      // Test data
      const oldPassword = 'old-password';
      const newPassword = 'new-password';

      // Call the function
      await authApi.changePassword(oldPassword, newPassword);

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/users/me/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
    });

    it('should handle changePassword errors', async () => {
      // Mock error response
      const mockError = new Error('Incorrect old password');
      (apiClient.post as jest.Mock).mockRejectedValue(mockError);

      // Test data
      const oldPassword = 'wrong-old-password';
      const newPassword = 'new-password';

      // Call the function and expect it to throw
      await expect(authApi.changePassword(oldPassword, newPassword)).rejects.toThrow();

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/users/me/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
    });
  });
});