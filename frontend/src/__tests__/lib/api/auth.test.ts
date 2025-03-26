import { expect, jest } from '@jest/globals';
import authApi from '@/lib/api/auth';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    document.cookie = '';
    mockFetch.mockReset();
  });

  describe('login', () => {
    const mockCredentials = {
      username: 'testuser',
      password: 'password123'
    };

    it('should successfully login and store tokens', async () => {
      const mockResponse = {
        token: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await authApi.login(mockCredentials);

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockCredentials)
      }));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', `Bearer ${mockResponse.token}`);
      expect(result).toEqual({
        token: `Bearer ${mockResponse.token}`,
        refreshToken: mockResponse.refreshToken
      });
    });

    it('should handle login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid credentials' })
      } as Response);

      await expect(authApi.login(mockCredentials)).rejects.toThrow('Invalid credentials');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const mockUserData = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User'
    };

    it('should successfully register', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'mock-token' })
      } as Response);

      await authApi.register(mockUserData);

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockUserData)
      }));
    });

    it('should handle registration failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Email already exists' })
      } as Response);

      await expect(authApi.register(mockUserData)).rejects.toThrow('Email already exists');
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      // Mock a valid token that meets the length requirement
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'token') return 'Bearer mock-token-with-sufficient-length-123456789';
        return null;
      });
    });

    it('should successfully logout and clear tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response);

      await authApi.logout();

      // Verify that the fetch call was made with the correct headers
      const fetchCalls = mockFetch.mock.calls;
      expect(fetchCalls.length).toBe(1);
      expect(fetchCalls[0][0]).toBe('/api/auth/logout');
      expect(fetchCalls[0][1]).toMatchObject({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-token-with-sufficient-length-123456789',
          'Content-Type': 'application/json'
        }
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token_expiry');
    });

    it('should clear tokens even if logout request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Network error')
      } as Response);

      await authApi.logout();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token_expiry');
    });
  });

  describe('refreshAuthToken', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'refresh_token') return 'mock-refresh-token';
        return null;
      });
    });

    it('should successfully refresh token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token'
        })
      } as Response);

      const result = await authApi.refreshAuthToken();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/token/refresh', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: 'mock-refresh-token' })
      }));
      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'new-access-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh-token');
    });

    it('should handle refresh token failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      } as Response);

      const result = await authApi.refreshAuthToken();

      expect(result).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    const mockUser = {
      user: {
        id: 1,
        username: 'testuser'
      },
      token: 'mock-token',
      refresh_token: 'mock-refresh-token',
      emailNotifications: true,
      courseUpdates: true,
      marketingEmails: false,
      totalCoursesEnrolled: 5,
      completedCourses: 3,
      averageScore: 85
    };

    beforeEach(() => {
      // Mock a valid token that meets the length requirement
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'token') return 'Bearer mock-token-with-sufficient-length-123456789';
        return null;
      });
    });

    it('should successfully fetch current user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser)
      } as Response);

      const result = await authApi.getCurrentUser();

      // Verify that the fetch call was made with the correct headers
      const fetchCalls = mockFetch.mock.calls;
      expect(fetchCalls.length).toBe(1);
      expect(fetchCalls[0][0]).toBe('/api/users/me');
      expect(fetchCalls[0][1]).toMatchObject({
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-token-with-sufficient-length-123456789',
          'Content-Type': 'application/json'
        }
      });

      expect(result).toEqual(mockUser);
    });

    it('should handle getCurrentUser failure', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Failed to get current user: 401' })
      } as Response;

      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(authApi.getCurrentUser()).rejects.toThrow('Failed to get current user: 401');
    });
  });
});