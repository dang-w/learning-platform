import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals';
import { waitFor } from '@testing-library/react';
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
const originalTokenSetTokens = tokenService.setTokens;
const originalTokenClearTokens = tokenService.clearTokens;
const originalTokenStartTokenRefresh = tokenService.startTokenRefresh;
const originalTokenShouldRefreshToken = tokenService.shouldRefreshToken;

// --- Declare mock variables ---
let mockLogin: jest.MockedFunction<typeof originalLogin>;
let mockGetCurrentUser: jest.MockedFunction<typeof originalGetCurrentUser>;
let mockGetUserStatistics: jest.MockedFunction<typeof originalGetUserStatistics>;
let mockGetNotificationPreferences: jest.MockedFunction<typeof originalGetNotificationPreferences>;

// --- Declare Token Service mock variables ---
let mockTokenGetToken: jest.MockedFunction<typeof originalTokenGetToken>;
let mockTokenSetTokens: jest.MockedFunction<typeof originalTokenSetTokens>;
let mockTokenClearTokens: jest.MockedFunction<typeof originalTokenClearTokens>;
let mockTokenStartTokenRefresh: jest.MockedFunction<typeof originalTokenStartTokenRefresh>;
let mockTokenShouldRefreshToken: jest.MockedFunction<typeof originalTokenShouldRefreshToken>;

// Define spy variable for authApi.logout
// Use jest.SpiedFunction for modern Jest type compatibility
let logoutSpy: jest.SpiedFunction<typeof authApi.logout>;

// Mock TokenService methods
jest.mock('@/lib/services/token-service', () => ({
  tokenService: {
    getInstance: jest.fn().mockReturnThis(),
    setTokens: mockTokenSetTokens,
    getToken: mockTokenGetToken,
    clearTokens: mockTokenClearTokens,
    startTokenRefresh: mockTokenStartTokenRefresh,
    shouldRefreshToken: mockTokenShouldRefreshToken,
    isTokenExpired: jest.fn(), // Keep a simple mock for isTokenExpired if needed
    onTokenChange: jest.fn(),
  },
}));

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
    mockTokenGetToken = jest.fn().mockReturnValue(undefined) as jest.MockedFunction<typeof originalTokenGetToken>;
    mockTokenSetTokens = jest.fn();
    mockTokenClearTokens = jest.fn(() => {
      // When clearTokens is called, make getters return null
      mockTokenGetToken.mockReturnValue(null);
    }) as jest.MockedFunction<typeof originalTokenClearTokens>;
    mockTokenStartTokenRefresh = jest.fn();
    mockTokenShouldRefreshToken = jest.fn();

    // --- Assign API mocks (except logout) ---
    authApi.login = mockLogin;
    authApi.getCurrentUser = mockGetCurrentUser;
    authApi.getUserStatistics = mockGetUserStatistics;
    authApi.getNotificationPreferences = mockGetNotificationPreferences;

    // --- Assign Token Service mocks ---
    tokenService.getToken = mockTokenGetToken;
    tokenService.setTokens = mockTokenSetTokens;
    tokenService.clearTokens = mockTokenClearTokens;
    tokenService.startTokenRefresh = mockTokenStartTokenRefresh;
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

    // Set initial state before each test
    store.reset();
    // Ensure token mocks reflect the initial state
    mockTokenGetToken.mockReturnValue(null);
  });

  afterEach(() => {
    // Restore the spy
    logoutSpy.mockRestore();

    // Restore original API methods
    authApi.login = originalLogin;
    authApi.getCurrentUser = originalGetCurrentUser;
    authApi.getUserStatistics = originalGetUserStatistics;
    authApi.getNotificationPreferences = originalGetNotificationPreferences;

    // Restore original Token Service methods
    tokenService.getToken = originalTokenGetToken;
    tokenService.setTokens = originalTokenSetTokens;
    tokenService.clearTokens = originalTokenClearTokens;
    tokenService.startTokenRefresh = originalTokenStartTokenRefresh;
    tokenService.shouldRefreshToken = originalTokenShouldRefreshToken;

    store.setDirectAuthState('test-token', true); // Use helper if available or set state directly
    useAuthStore.setState({ user: mockUser }); // Ensure user is set for logout logic if needed
    // Make sure token exists for clearTokens mock
    mockTokenGetToken.mockReturnValue('test-token');
  });

  describe('login', () => {
    it('should handle successful login', async () => {
      // Arrange Mocks
      const credentials: LoginCredentials = { username: 'test', password: 'password' };
      const mockApiResponse = { token: 'test-token' };
      mockLogin.mockResolvedValue(mockApiResponse);
      mockGetCurrentUser.mockResolvedValue(mockUser);

      // Mock statistics/preferences fetching (called by fetchUser)
      mockGetUserStatistics.mockResolvedValue({
        totalCoursesEnrolled: 5,
        completedCourses: 2,
        averageScore: 85.5,
        learningTimeMinutes: 1200,
        totalTimeSpent: 1200,
        lastAccessDate: new Date().toISOString(),
      } as UserStatistics);
      mockGetNotificationPreferences.mockResolvedValue({
        emailNotificationsEnabled: true,
        pushNotificationsEnabled: false,
        emailNotifications: true,
        courseUpdates: true,
        newMessages: true,
        marketingEmails: false,
        weeklyDigest: false,
      } as NotificationPreferences);

      // Act
      await store.login(credentials.username, credentials.password);

      // Assert Mocks
      expect(mockLogin).toHaveBeenCalledWith(credentials);
      expect(mockTokenSetTokens).toHaveBeenCalledWith(mockApiResponse.token);
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);

      // Assert State
      await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
      await waitFor(() => expect(useAuthStore.getState().user).toEqual(mockUser));
      await waitFor(() => expect(useAuthStore.getState().error).toBeNull());
      await waitFor(() => expect(useAuthStore.getState().isLoading).toBe(false));
    });

    it('should handle login failure', async () => {
      // Arrange Mocks
      const credentials: LoginCredentials = { username: 'test', password: 'wrong' };
      const mockError = createAxiosErrorResponse(401, 'Invalid credentials');
      mockLogin.mockRejectedValue(mockError);

      // Act
      // Login action now catches the error, so we don't expect it to throw
      await store.login(credentials.username, credentials.password);

      // Assert Mocks
      expect(mockLogin).toHaveBeenCalledWith(credentials);
      expect(mockTokenSetTokens).not.toHaveBeenCalled(); // Tokens should not be set
      expect(mockGetCurrentUser).not.toHaveBeenCalled(); // fetchUser should not be called
      expect(mockTokenClearTokens).toHaveBeenCalled(); // Tokens should be cleared on failure

      // Assert State
      // Check state AFTER the action completes
      await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
      await waitFor(() => expect(useAuthStore.getState().user).toBeNull());
      await waitFor(() => expect(useAuthStore.getState().error).toBe(mockError.message)); // Or specific msg
      await waitFor(() => expect(useAuthStore.getState().isLoading).toBe(false));
    });
  });

  describe('logout', () => {
    it('should handle logout correctly', async () => {
      // Arrange: Simulate logged-in state
      store.setDirectAuthState('test-token', true); // Use helper if available or set state directly
      useAuthStore.setState({ user: mockUser }); // Ensure user is set for logout logic if needed
      // Make sure token exists for clearTokens mock
      mockTokenGetToken.mockReturnValue('test-token');

      // Act
      await store.logout();

      // Assert Mocks
      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(mockTokenClearTokens).toHaveBeenCalledTimes(1);
      // expect(mockRedirectToLogin).toHaveBeenCalledTimes(1); // Redirect handled by UI usually

      // Assert State
      await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
      await waitFor(() => expect(useAuthStore.getState().user).toBeNull());
      await waitFor(() => expect(useAuthStore.getState().error).toBeNull());
    });
  });

  describe('initialization', () => {
    // TODO: Add tests for initializeFromStorage
    // - Test case: No token found
    // - Test case: Token found, getCurrentUser succeeds
    // - Test case: Token found, getCurrentUser fails (e.g., 401 even after interceptor)
  });

  // Add more tests for register, fetchUser, error handling, etc.
});
