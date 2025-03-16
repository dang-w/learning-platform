import authApi, { LoginCredentials, RegisterData, User, AuthResponse } from '@/lib/api/auth';
import apiClient from '@/lib/api/client';

// Mock the apiClient
jest.mock('@/lib/api/client', () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
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
      const mockResponse = {
        data: {
          access_token: 'test-token',
          token_type: 'bearer',
        },
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Test credentials
      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'password123',
      };

      // Call the function
      const result = await authApi.login(credentials);

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith(
        '/token',
        expect.any(URLSearchParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
      expect(localStorage.getItem('token')).toBe('test-token');
    });

    it('should handle login errors', async () => {
      // Mock error response
      const mockError = new Error('Invalid credentials');
      (apiClient.post as jest.Mock).mockRejectedValue(mockError);

      // Test credentials
      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'wrong-password',
      };

      // Call the function and expect it to throw
      await expect(authApi.login(credentials)).rejects.toThrow();

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith(
        '/token',
        expect.any(URLSearchParams),
        expect.any(Object)
      );
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('register', () => {
    it('should call the register endpoint', async () => {
      // Mock response
      const mockUser: User = {
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        disabled: false,
      };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockUser });

      // Test data
      const registerData: RegisterData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test User',
      };

      // Call the function
      const result = await authApi.register(registerData);

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/users/', registerData);
      expect(result).toEqual(mockUser);
    });

    it('should handle registration errors', async () => {
      // Mock error response
      const mockError = new Error('Username already exists');
      (apiClient.post as jest.Mock).mockRejectedValue(mockError);

      // Test data
      const registerData: RegisterData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test User',
      };

      // Call the function and expect it to throw
      await expect(authApi.register(registerData)).rejects.toThrow();

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/users/', registerData);
    });
  });

  describe('getCurrentUser', () => {
    it('should call the getCurrentUser endpoint', async () => {
      // Mock response
      const mockUser: User = {
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        disabled: false,
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockUser });

      // Call the function
      const result = await authApi.getCurrentUser();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/users/me/');
      expect(result).toEqual(mockUser);
    });

    it('should handle getCurrentUser errors', async () => {
      // Mock error response
      const mockError = new Error('Unauthorized');
      (apiClient.get as jest.Mock).mockRejectedValue(mockError);

      // Call the function and expect it to throw
      await expect(authApi.getCurrentUser()).rejects.toThrow();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/users/me/');
    });
  });

  describe('refreshToken', () => {
    it('should call the refreshToken endpoint and store the token', async () => {
      // Mock response
      const mockResponse = {
        data: {
          access_token: 'refreshed-token',
          token_type: 'bearer',
        } as AuthResponse,
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Call the function
      const result = await authApi.refreshToken();

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/token/refresh');
      expect(result).toEqual(mockResponse.data);
      expect(localStorage.getItem('token')).toBe('refreshed-token');
    });

    it('should handle refreshToken errors and return null', async () => {
      // Mock error response
      const mockError = new Error('Token expired');
      (apiClient.post as jest.Mock).mockRejectedValue(mockError);

      // Call the function
      const result = await authApi.refreshToken();

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/token/refresh');
      expect(result).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('logout', () => {
    it('should call the logout endpoint and remove the token', async () => {
      // Set up localStorage with a token
      localStorage.setItem('token', 'test-token');

      // Mock response
      (apiClient.post as jest.Mock).mockResolvedValue({});

      // Call the function
      await authApi.logout();

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/logout');
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should handle logout errors but still remove the token', async () => {
      // Set up localStorage with a token
      localStorage.setItem('token', 'test-token');

      // Mock error response
      const mockError = new Error('Server error');
      (apiClient.post as jest.Mock).mockRejectedValue(mockError);

      // Call the function
      await authApi.logout();

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/logout');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should call the updateProfile endpoint', async () => {
      // Mock response
      const mockUser: User = {
        username: 'testuser',
        email: 'updated@example.com',
        full_name: 'Updated User',
        disabled: false,
      };
      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockUser });

      // Test data
      const updateData: Partial<User> = {
        email: 'updated@example.com',
        full_name: 'Updated User',
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