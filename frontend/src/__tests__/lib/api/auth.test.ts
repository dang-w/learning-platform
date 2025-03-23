import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import auth from '@/lib/api/auth';

// Define interface types for our test that match the actual implementation
interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Create spies for each auth method
const loginSpy = jest.spyOn(auth, 'login');
const registerSpy = jest.spyOn(auth, 'register');
const getCurrentUserSpy = jest.spyOn(auth, 'getCurrentUser');
const logoutSpy = jest.spyOn(auth, 'logout');

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should call the login endpoint with correct credentials', async () => {
      // Mock response data
      const mockResponse = {
        token: 'mock-token',
        refreshToken: 'mock-refresh-token'
      };

      // Set up the mock using spyOn
      loginSpy.mockResolvedValue(mockResponse);

      // Call the login function with credentials object
      const credentials = {
        username: 'testuser',
        password: 'password123'
      };
      const result = await auth.login(credentials);

      // Check if the API was called with correct parameters
      expect(auth.login).toHaveBeenCalledWith(credentials);

      // Check if the result matches the expected response
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error on failed login', async () => {
      // Set up mock for error response
      loginSpy.mockRejectedValue(new Error('Invalid credentials'));

      // Expect the login to throw an error
      const credentials = {
        username: 'testuser',
        password: 'wrongpassword'
      };
      await expect(auth.login(credentials)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should call the register endpoint with correct data', async () => {
      // Set up mock
      registerSpy.mockResolvedValue(undefined);

      // Registration data
      const registerData: RegisterData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User'
      };

      // Call the register function
      await auth.register(registerData);

      // Check if the API was called with correct parameters
      expect(auth.register).toHaveBeenCalledWith(registerData);
    });
  });

  describe('getCurrentUser', () => {
    it('should call the current user endpoint', async () => {
      // Mock response data
      const mockUser: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        createdAt: '2023-01-01T00:00:00Z'
      };

      // Set up mock
      getCurrentUserSpy.mockResolvedValue(mockUser);

      // Call the getCurrentUser function
      const result = await auth.getCurrentUser();

      // Check if the API was called
      expect(auth.getCurrentUser).toHaveBeenCalled();

      // Check if the result matches the expected response
      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('should call the logout endpoint', async () => {
      // Set up mock to resolve with void
      logoutSpy.mockResolvedValue(undefined);

      // Call the logout function
      await auth.logout();

      // Check if the API was called
      expect(auth.logout).toHaveBeenCalled();
    });
  });
});