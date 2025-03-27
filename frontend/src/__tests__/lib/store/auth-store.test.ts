import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals';
import { waitFor } from '@testing-library/react';
import type { Jest } from '@jest/types'; // Correct import path for SpyInstance
import { createAxiosErrorResponse } from '@/lib/utils/test-utils/axios-mocks';

// --- Mock Zustand Middleware (Top) ---
jest.mock('zustand/middleware', () => ({
  persist: (initializer: unknown) => initializer, // Disable persistence (use unknown)
  // devtools: (initializer: unknown) => initializer, // Add if needed
}));

// --- Mock Named Exports (Top) ---
const mockRedirectToLogin = jest.fn();
jest.mock('@/lib/api/auth', () => {
  // Try casting the result of requireActual
  const actualAuthModule = jest.requireActual('@/lib/api/auth') as {
    default: typeof authApi;
    redirectToLogin: typeof mockRedirectToLogin; // Include the named export type
  };
  return {
    __esModule: true,
    default: actualAuthModule.default,
    redirectToLogin: mockRedirectToLogin,
  };
});

// --- Import Store, API, and REAL Token Service AFTER mocks ---
import { useAuthStore } from '@/lib/store/auth-store';
import authApi from '@/lib/api/auth';
import { tokenService } from '@/lib/services/token-service';
import type { AuthState } from '@/lib/store/types';
import type { User, LoginCredentials, UserStatistics, NotificationPreferences } from '@/lib/api/auth';

// --- Store original API methods ---
const originalLogin = authApi.login;
const originalGetCurrentUser = authApi.getCurrentUser;
const originalGetUserStatistics = authApi.getUserStatistics;
const originalGetNotificationPreferences = authApi.getNotificationPreferences;

// --- Store original Token Service methods ---
const originalTokenGetToken = tokenService.getToken;
const originalTokenGetRefreshToken = tokenService.getRefreshToken;
const originalTokenSetTokens = tokenService.setTokens;
const originalTokenClearTokens = tokenService.clearTokens;
const originalTokenStartTokenRefresh = tokenService.startTokenRefresh;
const originalTokenShouldRefreshToken = tokenService.shouldRefreshToken;

// --- Declare mock variables ---
let mockLogin: jest.Mock;
let mockGetCurrentUser: jest.Mock;
let mockGetUserStatistics: jest.Mock;
let mockGetNotificationPreferences: jest.Mock;

// --- Declare Token Service mock variables ---
let mockTokenGetToken: jest.Mock;
let mockTokenGetRefreshToken: jest.Mock;
let mockTokenSetTokens: jest.Mock;
let mockTokenClearTokens: jest.Mock;
let mockTokenStartTokenRefresh: jest.Mock;
let mockTokenShouldRefreshToken: jest.Mock;

// Define spy variable for authApi.logout
let logoutSpy: jest.SpyInstance<Promise<void>, []>;

describe('AuthStore', () => {
  let store: AuthState;

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

  beforeEach(() => {
    // Clear API/Redirect mock history (Keep API module mock, but clear fn history)
    jest.clearAllMocks();

    // Reset store state FIRST, then get instance
    useAuthStore.getState().reset();
    store = useAuthStore.getState();

    // --- Create fresh API mocks (except logout) ---
    mockLogin = jest.fn();
    mockGetCurrentUser = jest.fn();
    mockGetUserStatistics = jest.fn();
    mockGetNotificationPreferences = jest.fn();

    // --- Create fresh Token Service mocks ---
    mockTokenGetToken = jest.fn().mockReturnValue(undefined); // Default to undefined
    mockTokenGetRefreshToken = jest.fn().mockReturnValue(undefined); // Default to undefined
    mockTokenSetTokens = jest.fn();
    mockTokenClearTokens = jest.fn(() => {
      // When clearTokens is called, make getters return null
      mockTokenGetToken.mockReturnValue(null);
      mockTokenGetRefreshToken.mockReturnValue(null);
    });
    mockTokenStartTokenRefresh = jest.fn();
    mockTokenShouldRefreshToken = jest.fn();

    // --- Assign API mocks (except logout) ---
    // @ts-expect-error - TS struggles matching Jest.Mock to complex fn signature
    authApi.login = mockLogin;
    // @ts-expect-error - TS struggles matching Jest.Mock to complex fn signature
    authApi.getCurrentUser = mockGetCurrentUser;
    // @ts-expect-error - TS struggles matching Jest.Mock to complex fn signature
    authApi.getUserStatistics = mockGetUserStatistics;
    // @ts-expect-error - TS struggles matching Jest.Mock to complex fn signature
    authApi.getNotificationPreferences = mockGetNotificationPreferences;

    // --- Assign Token Service mocks ---
    // @ts-expect-error - TS struggles matching Jest.Mock to complex fn signature
    tokenService.getToken = mockTokenGetToken;
    // @ts-expect-error - TS struggles matching Jest.Mock to complex fn signature
    tokenService.getRefreshToken = mockTokenGetRefreshToken;
    // @ts-expect-error - TS struggles matching Jest.Mock to complex fn signature
    tokenService.setTokens = mockTokenSetTokens;
    // @ts-expect-error - TS struggles matching Jest.Mock to complex fn signature
    tokenService.clearTokens = mockTokenClearTokens;
    // @ts-expect-error - TS struggles matching Jest.Mock to complex fn signature
    tokenService.startTokenRefresh = mockTokenStartTokenRefresh;
    // @ts-expect-error - TS struggles matching Jest.Mock to complex fn signature
    tokenService.shouldRefreshToken = mockTokenShouldRefreshToken;

    // --- Spy on authApi.logout ---
    // Ensure we spy on the actual implementation before tests modify it
    logoutSpy = jest.spyOn(authApi, 'logout').mockImplementation(async () => {
      // Manually call our redirect mock when the spy is invoked
      mockRedirectToLogin();
      // We might need to simulate the token clearing part of the original logout here too
      // or just rely on the store calling tokenService.clearTokens separately.
      // Let's assume the store handles clearing separately for now.
      // If the original authApi.logout also cleared tokens, we'd call mockTokenClearTokens() here.
      return Promise.resolve(); // Simulate successful API call
    });
  });

  afterEach(() => {
    // Restore the spy
    logoutSpy.mockRestore();

    // Restore original API methods
    // @ts-expect-error - Restoring original after mock assignment
    authApi.login = originalLogin;
    // @ts-expect-error - Restoring original after mock assignment
    authApi.getCurrentUser = originalGetCurrentUser;
    // @ts-expect-error - Restoring original after mock assignment
    authApi.getUserStatistics = originalGetUserStatistics;
    // @ts-expect-error - Restoring original after mock assignment
    authApi.getNotificationPreferences = originalGetNotificationPreferences;

    // Restore original Token Service methods
    tokenService.getToken = originalTokenGetToken;
    tokenService.getRefreshToken = originalTokenGetRefreshToken;
    tokenService.setTokens = originalTokenSetTokens;
    tokenService.clearTokens = originalTokenClearTokens;
    tokenService.startTokenRefresh = originalTokenStartTokenRefresh;
    tokenService.shouldRefreshToken = originalTokenShouldRefreshToken;
  });

  describe('token refresh', () => {
    it('should handle token refresh cycle correctly', async () => {
      // Arrange
      // Set initial state for mocks
      mockTokenGetRefreshToken.mockReturnValue('refresh-token');
      mockTokenShouldRefreshToken.mockReturnValueOnce(true); // Only true for the first check
      mockTokenStartTokenRefresh.mockResolvedValueOnce('new-token');

      // Set store state AFTER mocks are ready
      store.setDirectAuthState('initial-token', true); // Simulate initial auth state

      // Act: First refresh
      const firstRefresh = await store.refreshAuthToken();

      // Assert: First refresh
      expect(firstRefresh).toBe(true); // Expect refresh to succeed
      expect(mockTokenStartTokenRefresh).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
      await waitFor(() => expect(mockTokenSetTokens).toHaveBeenCalledWith('new-token', 'refresh-token')); // Check if tokens were updated

      // Arrange: Cooldown
      mockTokenShouldRefreshToken.mockReturnValueOnce(false); // Now return false
      // mockTokenStartTokenRefresh setup doesn't need changing, it shouldn't be called

      // Act: Cooldown calls
      const [refresh1, refresh2] = await Promise.all([
        store.refreshAuthToken(),
        store.refreshAuthToken()
      ]);

      // Assert: Cooldown
      expect(refresh1).toBe(false);
      expect(refresh2).toBe(false);
      expect(mockTokenStartTokenRefresh).toHaveBeenCalledTimes(1); // Still 1 total call
    });

    it('should handle token service errors gracefully', async () => {
      // Arrange
      // Set initial state for mocks
      mockTokenGetRefreshToken.mockReturnValue('refresh-token');
      mockTokenShouldRefreshToken.mockReturnValueOnce(true);
      const mockError = new Error('Refresh failed');
      mockTokenStartTokenRefresh.mockRejectedValueOnce(mockError);

      // Set store state AFTER mocks are ready
      store.setDirectAuthState('test-token', true); // Simulate initial auth state

      // Act
      const result = await store.refreshAuthToken();

      // Assert Mocks & Return Value
      expect(result).toBe(false);
      expect(mockTokenStartTokenRefresh).toHaveBeenCalledTimes(1);
      // Use waitFor for async mock calls
      // Expected calls: reset(0/afterEach) + catch(1) = 1
      await waitFor(() => expect(mockTokenClearTokens).toHaveBeenCalled());

      // Assert State after waiting
      expect(useAuthStore.getState().error).toBe('Refresh failed');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      await waitFor(() => {
        expect(mockTokenGetToken()).toBeNull(); // Check via mock getter
        expect(mockTokenGetRefreshToken()).toBeNull(); // Check via mock getter
      });
    });
  });

  describe('login', () => {
    it('should handle successful login', async () => {
      // Arrange
      const credentials: LoginCredentials = { username: 'test', password: 'test' };
      const apiResponse = { token: 'test-token', refreshToken: 'test-refresh' };
      mockLogin.mockResolvedValueOnce(apiResponse);
      mockGetCurrentUser.mockResolvedValueOnce(mockUser);
      mockGetUserStatistics.mockResolvedValueOnce({ totalCoursesEnrolled: 1 } as UserStatistics);
      mockGetNotificationPreferences.mockResolvedValueOnce({} as NotificationPreferences);
      store.error = null;

      // Act
      await store.login(credentials.username, credentials.password);
      // Assert Mocks immediately
      expect(mockLogin).toHaveBeenCalledWith(credentials);
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockGetUserStatistics).toHaveBeenCalledTimes(1);
      expect(mockGetNotificationPreferences).toHaveBeenCalledTimes(1);

      // Wait specifically for setTokens mock call
      await waitFor(() => {
        expect(mockTokenSetTokens).toHaveBeenCalledWith(apiResponse.token, apiResponse.refreshToken);
      });

      // Assert state after waiting for the mock call
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should handle login failure', async () => {
      // Arrange
      const credentials: LoginCredentials = { username: 'test', password: 'test' };
      const error = createAxiosErrorResponse(401, 'Invalid credentials');
      mockLogin.mockRejectedValueOnce(error);
      store.error = null;
      store.user = null;
      store.isAuthenticated = false;

      // Act & Assert Throw
      await expect(store.login(credentials.username, credentials.password))
        .rejects.toThrow('Request failed with status code 401');

      // Assert Mocks immediately (those called synchronously or definitely NOT called)
      expect(mockLogin).toHaveBeenCalledWith(credentials);
      // FIX: Assert that these were NOT called
      expect(mockGetCurrentUser).not.toHaveBeenCalled();
      expect(mockGetUserStatistics).not.toHaveBeenCalled();
      expect(mockGetNotificationPreferences).not.toHaveBeenCalled();

      // Wait specifically for clearTokens mock call
      // Expected calls: reset(0/afterEach) + login_catch(1) = 1
      await waitFor(() => {
        expect(mockTokenClearTokens).toHaveBeenCalled();
      });

      // Assert state after waiting for the mock call
      expect(useAuthStore.getState().error).toBe('Request failed with status code 401');
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  it('should handle logout', async () => {
    // Arrange
    useAuthStore.setState({ isAuthenticated: true, user: mockUser, error: null });
    // No need to mock logout API call here, spy handles it.

    // Act
    await store.logout();

    // Assert Mocks
    expect(logoutSpy).toHaveBeenCalledTimes(1); // Check the spy
    expect(mockRedirectToLogin).toHaveBeenCalledTimes(1); // Check our redirect mock

    // Wait specifically for clearTokens mock call
    // Expected calls: reset(0/afterEach) + logout(1) = 1
    await waitFor(() => {
      expect(mockTokenClearTokens).toHaveBeenCalled();
    });

    // Assert State after waiting
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().error).toBeNull();
    await waitFor(() => {
      expect(mockTokenGetToken()).toBeNull();
      expect(mockTokenGetRefreshToken()).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      // Arrange: Set an initial error directly on the store instance
      store.error = 'An initial error';
      // Or using setState if direct assignment is problematic:
      // useAuthStore.setState({ error: 'An initial error' });

      // Act
      store.clearError();

      // Assert: Check the fresh state
      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });
  });
});
