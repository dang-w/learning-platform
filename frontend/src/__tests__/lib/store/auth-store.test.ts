import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '@/lib/store/auth-store';
import authApi from '@/lib/api/auth';

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
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the store state before each test
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      // Reset the store state directly instead of calling logout
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
      const mockToken = { access_token: 'test-token', token_type: 'bearer' };
      const mockUser = { username: 'testuser', email: 'test@example.com', full_name: 'Test User', disabled: false };

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

    it('should handle login failure', async () => {
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
    });
  });

  describe('logout', () => {
    it('should clear state on logout', async () => {
      // Setup initial authenticated state
      const { result } = renderHook(() => useAuthStore());

      // Manually set authenticated state
      act(() => {
        result.current.isAuthenticated = true;
        result.current.user = { username: 'testuser', email: 'test@example.com', full_name: 'Test User', disabled: false };
        result.current.token = 'test-token';
      });

      // Mock logout API
      (authApi.logout as jest.Mock).mockResolvedValue(undefined);

      // Verify logged in state
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();

      // Perform logout
      await act(async () => {
        await result.current.logout();
      });

      // Check logged out state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();

      // Verify API call
      expect(authApi.logout).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should update token on successful refresh', async () => {
      // Mock API response
      const mockToken = { access_token: 'new-token', token_type: 'bearer' };
      (authApi.refreshToken as jest.Mock).mockResolvedValue(mockToken);

      // Render the hook
      const { result } = renderHook(() => useAuthStore());

      // Perform token refresh
      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshToken();
      });

      // Check updated state
      expect(refreshResult).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe('new-token');

      // Verify API call
      expect(authApi.refreshToken).toHaveBeenCalled();
    });

    it('should handle refresh failure', async () => {
      // Mock API error
      (authApi.refreshToken as jest.Mock).mockResolvedValue(null);

      // Render the hook
      const { result } = renderHook(() => useAuthStore());

      // Manually set initial state to unauthenticated
      act(() => {
        result.current.isAuthenticated = false;
        result.current.token = null;
        result.current.user = null;
      });

      // Perform token refresh with failure
      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshToken();
      });

      // Check updated state
      expect(refreshResult).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });
});