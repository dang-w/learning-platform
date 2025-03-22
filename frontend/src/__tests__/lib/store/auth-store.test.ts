import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '@/lib/store/auth-store';
import authApi from '@/lib/api/auth';
import { User } from '@/lib/api/auth';
import { expect } from '@jest/globals';

// Mock the auth API
jest.mock('@/lib/api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
  refreshToken: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
}));

describe('Auth Store', () => {
  const mockUser: User = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    createdAt: '2021-01-01',
    updatedAt: '2021-01-01',
  };

  const mockToken = {
    access_token: 'test-token',
    token_type: 'bearer',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the store state before each test
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      // Reset the store state directly
      result.current.isAuthenticated = false;
      result.current.isLoading = false;
      result.current.user = null;
      result.current.token = null;
      result.current.error = null;
    });
  });

  describe('login', () => {
    it('should update state on successful login', async () => {
      // Mock API responses
      (authApi.login as jest.Mock).mockResolvedValue(mockToken);
      (authApi.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      // Render the hook
      const { result } = renderHook(() => useAuthStore());

      // Initial state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();

      // Perform login
      await act(async () => {
        await result.current.login('testuser', 'password');
      });

      // Check updated state
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.token).toBe('test-token');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();

      // Verify API calls
      expect(authApi.login).toHaveBeenCalledWith({ username: 'testuser', password: 'password' });
      expect(authApi.getCurrentUser).toHaveBeenCalled();
    });

    it('should handle login errors', async () => {
      // Mock API error
      const mockError = new Error('Invalid credentials');
      (authApi.login as jest.Mock).mockRejectedValue(mockError);

      // Render the hook
      const { result } = renderHook(() => useAuthStore());

      // Perform login with error
      await act(async () => {
        try {
          await result.current.login('testuser', 'wrong-password');
        } catch {
          // Expected to throw
        }
      });

      // Check error state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.error).toBe('Invalid credentials');

      // Verify API call
      expect(authApi.login).toHaveBeenCalledWith({ username: 'testuser', password: 'wrong-password' });
      expect(authApi.getCurrentUser).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should register and login on success', async () => {
      // Mock API responses
      (authApi.register as jest.Mock).mockResolvedValue(mockUser);
      (authApi.login as jest.Mock).mockResolvedValue(mockToken);
      (authApi.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      // Render the hook
      const { result } = renderHook(() => useAuthStore());

      // Perform registration
      await act(async () => {
        await result.current.register('testuser', 'test@example.com', 'password', 'Test User');
      });

      // Check updated state (should be logged in after registration)
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.token).toBe('test-token');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();

      // Verify API calls
      expect(authApi.register).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password',
        full_name: 'Test User',
      });
      expect(authApi.login).toHaveBeenCalledWith({ username: 'testuser', password: 'password' });
      expect(authApi.getCurrentUser).toHaveBeenCalled();
    });

    it('should handle registration errors', async () => {
      // Mock API error
      const mockError = new Error('Username already exists');
      (authApi.register as jest.Mock).mockRejectedValue(mockError);

      // Render the hook
      const { result } = renderHook(() => useAuthStore());

      // Perform registration with error
      await act(async () => {
        try {
          await result.current.register('existinguser', 'test@example.com', 'password', 'Test User');
        } catch {
          // Expected to throw
        }
      });

      // Check error state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.error).toBe('Username already exists');

      // Verify API calls
      expect(authApi.register).toHaveBeenCalledWith({
        username: 'existinguser',
        email: 'test@example.com',
        password: 'password',
        full_name: 'Test User',
      });
      expect(authApi.login).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear state on logout', async () => {
      // Set up initial authenticated state
      const { result } = renderHook(() => useAuthStore());
      act(() => {
        result.current.isAuthenticated = true;
        result.current.user = mockUser;
        result.current.token = 'test-token';
      });

      // Mock API response
      (authApi.logout as jest.Mock).mockResolvedValue(undefined);

      // Perform logout
      await act(async () => {
        await result.current.logout();
      });

      // Check cleared state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.error).toBeNull();

      // Verify API call
      expect(authApi.logout).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      // Set up initial authenticated state
      const { result } = renderHook(() => useAuthStore());
      act(() => {
        result.current.isAuthenticated = true;
        result.current.user = mockUser;
        result.current.token = 'test-token';
      });

      // Mock API error
      const mockError = new Error('Network error');
      (authApi.logout as jest.Mock).mockRejectedValue(mockError);

      // Perform logout with error
      await act(async () => {
        try {
          await result.current.logout();
        } catch {
          // Expected to throw
        }
      });

      // Check error state (should still be logged out)
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.error).toBe('Failed to logout');

      // Verify API call
      expect(authApi.logout).toHaveBeenCalled();
    });
  });

  describe('fetchUser', () => {
    it('should fetch and update user data', async () => {
      // Mock API response
      (authApi.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      // Render the hook
      const { result } = renderHook(() => useAuthStore());

      // Perform fetch user
      await act(async () => {
        await result.current.fetchUser();
      });

      // Check updated state
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();

      // Verify API call
      expect(authApi.getCurrentUser).toHaveBeenCalled();
    });

    it('should handle fetch user errors', async () => {
      // Mock API error
      const mockError = new Error('Unauthorized');
      (authApi.getCurrentUser as jest.Mock).mockRejectedValue(mockError);

      // Render the hook
      const { result } = renderHook(() => useAuthStore());

      // Perform fetch user with error
      await act(async () => {
        try {
          await result.current.fetchUser();
        } catch {
          // Expected to throw
        }
      });

      // Check error state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe('Failed to fetch user');

      // Verify API call
      expect(authApi.getCurrentUser).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    // Set up localStorage mock for tests
    let localStorageMock: { [key: string]: string } = {};

    beforeEach(() => {
      // Reset localStorage mock
      localStorageMock = {};

      // Mock localStorage
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(key => localStorageMock[key] || null);
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
        localStorageMock[key] = value.toString();
      });

      // Reset last refresh time to allow refresh to proceed
      const { result } = renderHook(() => useAuthStore());
      act(() => {
        // Force _lastTokenRefresh to be more than 30 seconds ago
        result.current._lastTokenRefresh = Date.now() - 60000;
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should refresh token successfully', async () => {
      // Add refresh token to localStorage
      localStorageMock['refreshToken'] = 'test-refresh-token';

      // Mock a successful token refresh
      (authApi.refreshToken as jest.Mock).mockResolvedValueOnce({
        access_token: 'test-token',
        refresh_token: 'new-refresh-token'
      });

      const { result } = renderHook(() => useAuthStore());

      // Call refreshToken
      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshToken();
      });

      // Check updated state
      expect(refreshResult).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe('test-token');

      // Verify API call
      expect(authApi.refreshToken).toHaveBeenCalled();

      // Verify localStorage was updated
      expect(localStorageMock['token']).toBe('test-token');
      expect(localStorageMock['refreshToken']).toBe('new-refresh-token');
    });

    it('should handle null token response', async () => {
      // Add refresh token to localStorage
      localStorageMock['refreshToken'] = 'test-refresh-token';

      // Mock null response from refreshToken
      (authApi.refreshToken as jest.Mock).mockResolvedValueOnce(null);

      const { result } = renderHook(() => useAuthStore());

      // Set initial authenticated state
      act(() => {
        result.current.setDirectAuthState('old-token', true);
      });

      // Call refreshToken
      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshToken();
      });

      // Check state (should not be authenticated)
      expect(refreshResult).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);

      // Verify API call
      expect(authApi.refreshToken).toHaveBeenCalled();
    });

    it('should handle refresh token errors', async () => {
      // Add refresh token to localStorage
      localStorageMock['refreshToken'] = 'test-refresh-token';

      // Mock error from refreshToken
      (authApi.refreshToken as jest.Mock).mockRejectedValueOnce(new Error('Refresh token error'));

      const { result } = renderHook(() => useAuthStore());

      // Set initial authenticated state
      act(() => {
        result.current.setDirectAuthState('old-token', true);
      });

      // Call refreshToken
      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshToken();
      });

      // Check state (should be logged out)
      expect(refreshResult).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();

      // Verify API call
      expect(authApi.refreshToken).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      // Mock updated user
      const updatedUser = {
        ...mockUser,
        email: 'updated@example.com',
        fullName: 'Updated User',
      };

      // Mock API response
      (authApi.updateProfile as jest.Mock).mockResolvedValue(updatedUser);

      // Render the hook
      const { result } = renderHook(() => useAuthStore());

      // Set initial state with user
      act(() => {
        result.current.user = mockUser;
      });

      // Perform profile update
      await act(async () => {
        await result.current.updateProfile({
          email: 'updated@example.com',
          fullName: 'Updated User',
        });
      });

      // Check updated state
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toEqual(updatedUser);
      expect(result.current.error).toBeNull();

      // Verify API call
      expect(authApi.updateProfile).toHaveBeenCalledWith({
        email: 'updated@example.com',
        fullName: 'Updated User',
      });
    });

    it('should handle update profile errors', async () => {
      // Mock API error
      const mockError = new Error('Invalid email format');
      (authApi.updateProfile as jest.Mock).mockRejectedValue(mockError);

      // Render the hook
      const { result } = renderHook(() => useAuthStore());

      // Set initial state with user
      act(() => {
        result.current.user = mockUser;
      });

      // Perform profile update with error
      await act(async () => {
        try {
          await result.current.updateProfile({ email: 'invalid-email' });
        } catch {
          // Expected to throw
        }
      });

      // Check error state
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toEqual(mockUser); // User should remain unchanged
      expect(result.current.error).toBe('Failed to update profile');

      // Verify API call
      expect(authApi.updateProfile).toHaveBeenCalledWith({ email: 'invalid-email' });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      // Mock API response
      (authApi.changePassword as jest.Mock).mockResolvedValue(undefined);

      // Render the hook
      const { result } = renderHook(() => useAuthStore());

      // Perform password change
      await act(async () => {
        await result.current.changePassword('old-password', 'new-password');
      });

      // Check state
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Verify API call
      expect(authApi.changePassword).toHaveBeenCalledWith('old-password', 'new-password');
    });

    it('should handle change password errors', async () => {
      // Mock API error
      const mockError = new Error('Incorrect old password');
      (authApi.changePassword as jest.Mock).mockRejectedValue(mockError);

      // Render the hook
      const { result } = renderHook(() => useAuthStore());

      // Perform password change with error
      await act(async () => {
        try {
          await result.current.changePassword('wrong-old-password', 'new-password');
        } catch {
          // Expected to throw
        }
      });

      // Check error state
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to change password');

      // Verify API call
      expect(authApi.changePassword).toHaveBeenCalledWith('wrong-old-password', 'new-password');
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      // Render the hook
      const { result } = renderHook(() => useAuthStore());

      // Set initial state with error
      act(() => {
        result.current.error = 'Some error';
      });

      // Clear error
      act(() => {
        result.current.clearError();
      });

      // Check cleared error state
      expect(result.current.error).toBeNull();
    });
  });
});