import authApi, { LoginCredentials, RegisterData, User } from '@/lib/api/auth';
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

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

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
  });
});