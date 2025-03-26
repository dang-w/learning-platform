import { expect, jest, beforeEach, describe, it } from '@jest/globals';
import { tokenService } from '../../../lib/services/token-service';
import { useAuthStore } from '../../../lib/store/auth-store';
import authApi, { User, LoginCredentials } from '../../../lib/api/auth';

// Mock modules first, before any imports
jest.mock('../../../lib/services/token-service');
jest.mock('../../../lib/api/auth');

describe('AuthStore', () => {
  const mockUser: User = {
    user: {
      id: 1,
      username: 'testuser'
    },
    token: 'test-token',
    refresh_token: 'test-refresh-token',
    emailNotifications: true,
    courseUpdates: true,
    marketingEmails: false,
    totalCoursesEnrolled: 0,
    completedCourses: 0,
    averageScore: 0
  };

  const mockTokens = {
    token: 'test-token',
    refreshToken: 'test-refresh-token'
  };

  const mockError = new Error('API Error');

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      statistics: null,
      notificationPreferences: null,
      _lastTokenRefresh: 0,
      _retryAfterTimestamp: null,
      _lastRefreshAttemptTimestamp: null,
      _refreshAttempts: 0,
      _lastRefreshTimestamp: null,
      refreshToken: null
    });

    // Set up token service mocks with implementations
    jest.spyOn(tokenService, 'getToken').mockReturnValue('test-token');
    jest.spyOn(tokenService, 'getRefreshToken').mockReturnValue('test-refresh-token');
    jest.spyOn(tokenService, 'setTokens').mockImplementation(() => {});
    jest.spyOn(tokenService, 'clearTokens').mockImplementation(() => {});
    jest.spyOn(tokenService, 'startTokenRefresh').mockResolvedValue('new-token');
    jest.spyOn(tokenService, 'isTokenExpired').mockReturnValue(false);
    jest.spyOn(tokenService, 'isRefreshingToken').mockReturnValue(false);

    // Set up auth API mocks with implementations
    jest.spyOn(authApi, 'login').mockResolvedValue(mockTokens);
    jest.spyOn(authApi, 'logout').mockResolvedValue();
    jest.spyOn(authApi, 'getCurrentUser').mockResolvedValue(mockUser);
    jest.spyOn(authApi, 'refreshAuthToken').mockResolvedValue(true);
    jest.spyOn(authApi, 'getUserStatistics').mockResolvedValue({
      totalCoursesEnrolled: 0,
      completedCourses: 0,
      averageScore: 0,
      totalTimeSpent: 0,
      lastActive: new Date().toISOString(),
      achievementsCount: 0
    });
    jest.spyOn(authApi, 'getNotificationPreferences').mockResolvedValue({
      emailNotifications: true,
      courseUpdates: true,
      newMessages: true,
      marketingEmails: false,
      weeklyDigest: true
    });

    // Reset window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true
    });
  });

  describe('refreshAuthToken', () => {
    it('should handle refresh token failure', async () => {
      // Setup: No refresh token available and token is expired
      jest.spyOn(tokenService, 'getRefreshToken').mockReturnValue(null);
      jest.spyOn(tokenService, 'isTokenExpired').mockReturnValue(true);
      jest.spyOn(authApi, 'refreshAuthToken').mockResolvedValue(false);

      const result = await useAuthStore.getState().refreshAuthToken();

      expect(result).toBe(false);
      expect(jest.spyOn(tokenService, 'getRefreshToken')).toHaveBeenCalled();
      expect(jest.spyOn(tokenService, 'clearTokens')).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('should handle successful token refresh', async () => {
      // Setup: Refresh token available and refresh succeeds
      jest.spyOn(tokenService, 'getRefreshToken').mockReturnValue('valid-refresh-token');
      jest.spyOn(tokenService, 'isTokenExpired').mockReturnValue(true);
      jest.spyOn(authApi, 'refreshAuthToken').mockResolvedValue(true);
      jest.spyOn(authApi, 'getCurrentUser').mockResolvedValue(mockUser);

      const result = await useAuthStore.getState().refreshAuthToken();

      expect(result).toBe(true);
      expect(jest.spyOn(authApi, 'refreshAuthToken')).toHaveBeenCalled();
      expect(jest.spyOn(authApi, 'getCurrentUser')).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('should handle refresh API failure', async () => {
      // Setup: Refresh token available but refresh fails
      jest.spyOn(tokenService, 'getRefreshToken').mockReturnValue('valid-refresh-token');
      jest.spyOn(tokenService, 'isTokenExpired').mockReturnValue(true);
      jest.spyOn(authApi, 'refreshAuthToken').mockRejectedValue(mockError);

      const result = await useAuthStore.getState().refreshAuthToken();

      expect(result).toBe(false);
      expect(jest.spyOn(tokenService, 'clearTokens')).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().error).toBe(mockError.message);
    });

    it('should not refresh if token is not expired', async () => {
      // Setup: Token is not expired
      jest.spyOn(tokenService, 'getRefreshToken').mockReturnValue('valid-refresh-token');
      jest.spyOn(tokenService, 'isTokenExpired').mockReturnValue(false);

      const result = await useAuthStore.getState().refreshAuthToken();

      expect(result).toBe(true);
      expect(jest.spyOn(authApi, 'refreshAuthToken')).toHaveBeenCalledTimes(0);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    const credentials: LoginCredentials = {
      username: 'testuser',
      password: 'password'
    };

    it('should handle successful login', async () => {
      // Setup initial state
      useAuthStore.setState({ isLoading: false, error: null });

      await useAuthStore.getState().login(credentials.username, credentials.password);

      expect(jest.spyOn(authApi, 'login')).toHaveBeenCalledWith(credentials);
      expect(jest.spyOn(tokenService, 'setTokens')).toHaveBeenCalledWith(
        mockTokens.token,
        mockTokens.refreshToken
      );
      expect(jest.spyOn(authApi, 'getCurrentUser')).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should handle login failure', async () => {
      // Setup: Login API fails
      jest.spyOn(authApi, 'login').mockImplementation(() => Promise.reject(mockError));

      await expect(useAuthStore.getState().login(credentials.username, credentials.password))
        .rejects.toThrow('API Error');

      expect(jest.spyOn(authApi, 'login')).toHaveBeenCalledWith(credentials);
      expect(jest.spyOn(tokenService, 'setTokens')).not.toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().error).toBe(mockError.message);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should clear existing auth state before login', async () => {
      // Setup: Existing auth state
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        error: 'previous error'
      });

      await useAuthStore.getState().login(credentials.username, credentials.password);

      expect(jest.spyOn(tokenService, 'clearTokens')).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('should handle missing token in response', async () => {
      // Setup: Login returns empty token
      jest.spyOn(authApi, 'login').mockResolvedValue({ token: '', refreshToken: '' });

      await expect(useAuthStore.getState().login(credentials.username, credentials.password))
        .rejects.toThrow('No token received from login');

      expect(jest.spyOn(tokenService, 'setTokens')).not.toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().error).toBe('No token received from login');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should handle successful logout', async () => {
      // Setup: Start in authenticated state
      useAuthStore.setState({
        isAuthenticated: true,
        user: mockUser,
        error: null,
        isLoading: false
      });

      await useAuthStore.getState().logout();

      expect(jest.spyOn(authApi, 'logout')).toHaveBeenCalled();
      expect(jest.spyOn(tokenService, 'clearTokens')).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().error).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(window.location.href).toContain('/login');
    });

    it('should handle logout failure', async () => {
      // Setup: Start in authenticated state and logout fails
      useAuthStore.setState({
        isAuthenticated: true,
        user: mockUser,
        error: null,
        isLoading: false
      });
      jest.spyOn(authApi, 'logout').mockImplementation(() => Promise.reject(mockError));

      await useAuthStore.getState().logout();

      // Should still clear state even if API call fails
      expect(jest.spyOn(authApi, 'logout')).toHaveBeenCalled();
      expect(jest.spyOn(tokenService, 'clearTokens')).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().error).toBe(mockError.message);
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(window.location.href).toContain('/login');
    });

    it('should handle logout when not authenticated', async () => {
      // Setup: Start in unauthenticated state
      useAuthStore.setState({
        isAuthenticated: false,
        user: null,
        error: null,
        isLoading: false
      });

      await useAuthStore.getState().logout();

      // Should not call API but still clear state
      expect(jest.spyOn(authApi, 'logout')).not.toHaveBeenCalled();
      expect(jest.spyOn(tokenService, 'clearTokens')).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().error).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(window.location.href).toContain('/login');
    });
  });
});
