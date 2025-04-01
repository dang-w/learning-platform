/// <reference lib="dom" />

import type { User } from '@/lib/api/auth';
import type { AuthState } from '@/lib/store/types';

export interface StateTransition {
  from: Partial<AuthState>;
  to: Partial<AuthState>;
  trigger: string;
  timestamp: number;
}

export interface AuthStateTransition {
  from: Partial<AuthState>;
  to: Partial<AuthState>;
  trigger: string;
  timestamp: number;
}

export interface MockAuthStoreOptions {
  loginBehavior?: 'success' | 'error' | 'network-error' | 'loading' | 'validate';
  registerBehavior?: 'success' | 'error' | 'loading' | 'validate';
  error?: string;
  user?: User | null;
  isAuthenticated?: boolean;
  trackStateTransitions?: boolean;
  simulateTokenRefreshDelay?: number;
  simulateTokenExpiry?: boolean;
  simulateConcurrentRefresh?: boolean;
  simulateInitializationDelay?: number;
  validationErrors?: Record<string, string>;
  mockLoadingDuration?: number;
}

export interface EnhancedAuthStore extends AuthState {
  cleanup: () => void;
  getStateTransitions: () => StateTransition[];
  clearStateTransitions: () => void;
  getCurrentState: () => Partial<AuthState>;
}

export function createMockAuthStore(options: MockAuthStoreOptions = {}): EnhancedAuthStore {
  const stateTransitions: StateTransition[] = [];

  const trackTransition = (trigger: string, newState: Partial<AuthState>) => {
    if (!options.trackStateTransitions) return;

    const currentState: Partial<AuthState> = {
      user: mockStore.user,
      isAuthenticated: mockStore.isAuthenticated,
      isLoading: mockStore.isLoading,
      error: mockStore.error,
      statistics: mockStore.statistics,
      notificationPreferences: mockStore.notificationPreferences,
      validationErrors: mockStore.validationErrors
    };

    stateTransitions.push({
      from: { ...currentState },
      to: newState,
      trigger,
      timestamp: Date.now()
    });
  };

  const mockStore: EnhancedAuthStore = {
    // Core state
    user: options.user ?? null,
    isAuthenticated: options.isAuthenticated ?? false,
    isLoading: options.loginBehavior === 'loading' || options.registerBehavior === 'loading',
    error: options.error || null,
    statistics: null,
    notificationPreferences: null,
    validationErrors: options.validationErrors,

    // Required methods
    initializeFromStorage: jest.fn().mockImplementation(async () => {
      trackTransition('initialize_start', { isLoading: true });

      if (options.simulateInitializationDelay) {
        await new Promise(resolve => setTimeout(resolve, options.simulateInitializationDelay));
      }

      trackTransition('initialize_complete', { isLoading: false });
    }),

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    login: jest.fn().mockImplementation(async (username: string, password: string) => {
      mockStore.isLoading = true;
      trackTransition('login_start', { isLoading: true, error: null });

      // Handle validation behavior first
      if (options.loginBehavior === 'validate') {
        mockStore.isLoading = false;
        if (options.validationErrors) {
          mockStore.error = 'Validation failed';
          trackTransition('login_validate_error', {
            isLoading: false,
            error: 'Validation failed',
            validationErrors: options.validationErrors
          });
          throw new Error('Validation failed');
        }
        trackTransition('login_validate', { isLoading: false, error: null });
        return;
      }

      // Simulate loading state for configured duration
      const loadingDuration = options.mockLoadingDuration || 100;
      await new Promise(resolve => setTimeout(resolve, loadingDuration));

      if (options.loginBehavior === 'error') {
        const error = options.error || 'Invalid credentials';
        mockStore.error = error;
        mockStore.isAuthenticated = false;
        mockStore.user = null;
        mockStore.isLoading = false;
        trackTransition('login_error', { isLoading: false, error, isAuthenticated: false, user: null });
        return;
      }

      if (options.loginBehavior === 'loading') {
        mockStore.isLoading = true;
        trackTransition('login_loading', { isLoading: true });
        return new Promise(() => {}); // Never resolves
      }

      if (options.loginBehavior === 'success') {
        const user = options.user || {
          id: '1',
          username,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          role: 'user'
        };
        mockStore.isAuthenticated = true;
        mockStore.user = user;
        mockStore.error = null;
        mockStore.isLoading = false;
        trackTransition('login_success', {
          isLoading: false,
          error: null,
          isAuthenticated: true,
          user
        });
        return;
      }

      // Default behavior is validate
      mockStore.error = null;
      mockStore.isLoading = false;
      trackTransition('login_validate', { isLoading: false, error: null });
    }),

    register: jest.fn().mockImplementation(async (username: string, email: string, password: string, fullName: string) => {
      mockStore.isLoading = true;
      trackTransition('register_start', { isLoading: true, error: null });

      // Handle validation behavior first
      if (options.registerBehavior === 'validate') {
        mockStore.isLoading = false;
        if (options.validationErrors) {
          mockStore.error = 'Validation failed';
          trackTransition('register_validate_error', {
            isLoading: false,
            error: 'Validation failed',
            validationErrors: options.validationErrors
          });
          throw new Error('Validation failed');
        }
        trackTransition('register_validate', { isLoading: false, error: null });
        return;
      }

      // Simulate loading state for configured duration
      const loadingDuration = options.mockLoadingDuration || 100;
      await new Promise(resolve => setTimeout(resolve, loadingDuration));

      if (options.registerBehavior === 'error') {
        const error = options.error || 'Username already exists';
        mockStore.error = error;
        mockStore.isAuthenticated = false;
        mockStore.user = null;
        mockStore.isLoading = false;
        trackTransition('register_error', {
          isLoading: false,
          error,
          isAuthenticated: false,
          user: null
        });
        return;
      }

      if (options.registerBehavior === 'loading') {
        mockStore.isLoading = true;
        trackTransition('register_loading', { isLoading: true });
        return new Promise(() => {}); // Never resolves
      }

      if (options.registerBehavior === 'success') {
        const user = {
          id: '1',
          username,
          email,
          firstName: fullName.split(' ')[0],
          lastName: fullName.split(' ').slice(1).join(' '),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          role: 'user'
        };

        mockStore.isAuthenticated = true;
        mockStore.user = user;
        mockStore.error = null;
        mockStore.isLoading = false;
        trackTransition('register_success', {
          isLoading: false,
          error: null,
          isAuthenticated: true,
          user
        });
        return { user };
      }

      // Default behavior is validate
      mockStore.error = null;
      mockStore.isLoading = false;
      trackTransition('register_validate', { isLoading: false, error: null });
    }),

    logout: jest.fn().mockImplementation(async () => {
      trackTransition('logout_start', { isLoading: true });

      mockStore.isAuthenticated = false;
      mockStore.user = null;
      mockStore.error = null;
      mockStore.statistics = null;
      mockStore.notificationPreferences = null;
      mockStore.validationErrors = undefined;

      trackTransition('logout_complete', {
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: null,
        statistics: null,
        notificationPreferences: null,
        validationErrors: undefined
      });
    }),

    fetchUser: jest.fn().mockImplementation(async () => {
      trackTransition('fetch_user_start', { isLoading: true });
      trackTransition('fetch_user_complete', { isLoading: false });
    }),

    refreshAuthToken: jest.fn().mockImplementation(async () => {
      if (options.simulateConcurrentRefresh && mockStore._inRefreshCycle) {
        return mockStore._refreshPromise;
      }

      trackTransition('refresh_token_start', {
        _inRefreshCycle: true,
        _lastRefreshAttemptTimestamp: Date.now()
      });

      mockStore._inRefreshCycle = true;
      mockStore._refreshPromise = new Promise(resolve => {
        setTimeout(() => {
          mockStore._inRefreshCycle = false;
          mockStore._lastRefreshTimestamp = Date.now();
          trackTransition('refresh_token_complete', {
            _inRefreshCycle: false,
            _lastRefreshTimestamp: Date.now()
          });
          resolve(true);
        }, options.simulateTokenRefreshDelay ?? 100);
      });

      return mockStore._refreshPromise;
    }),

    clearError: jest.fn().mockImplementation(() => {
      mockStore.error = null;
      trackTransition('clear_error', { error: null });
    }),

    // Additional methods with state tracking
    updateProfile: jest.fn().mockImplementation(async (updates: Partial<User>) => {
      trackTransition('update_profile_start', { isLoading: true });
      if (mockStore.user) {
        mockStore.user = { ...mockStore.user, ...updates };
      }
      trackTransition('update_profile_complete', {
        isLoading: false,
        user: mockStore.user
      });
    }),

    changePassword: jest.fn().mockImplementation(async () => {
      trackTransition('change_password_start', { isLoading: true });
      trackTransition('change_password_complete', { isLoading: false });
    }),

    setDirectAuthState: jest.fn(),
    fetchStatistics: jest.fn().mockResolvedValue(undefined),
    getNotificationPreferences: jest.fn().mockResolvedValue({}),
    updateNotificationPreferences: jest.fn().mockResolvedValue(undefined),
    exportUserData: jest.fn().mockResolvedValue(new Blob()),
    deleteAccount: jest.fn().mockResolvedValue(undefined),

    reset: jest.fn(() => {
      trackTransition('reset_start', {});
      mockStore.user = null;
      mockStore.isAuthenticated = false;
      mockStore.isLoading = false;
      mockStore.error = null;
      mockStore.statistics = null;
      mockStore.notificationPreferences = null;
      mockStore.validationErrors = undefined;
      trackTransition('reset_complete', {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        statistics: null,
        notificationPreferences: null,
        validationErrors: undefined
      });
    }),

    setRefreshToken: jest.fn().mockImplementation((token: string) => {
      mockStore.refreshToken = token;
      trackTransition('set_refresh_token', { refreshToken: token });
    }),

    setStatistics: jest.fn(),
    setNotificationPreferences: jest.fn(),

    // Internal state
    _lastTokenRefresh: 0,
    _retryAfterTimestamp: null,
    _lastRefreshAttemptTimestamp: null,
    _refreshAttempts: 0,
    _lastRefreshTimestamp: null,
    _inRefreshCycle: false,
    _refreshPromise: null,
    _refreshCallStack: [],

    // Enhanced functionality
    getStateTransitions: () => [...stateTransitions],
    clearStateTransitions: () => {
      stateTransitions.length = 0;
    },
    getCurrentState: () => ({
      user: mockStore.user,
      isAuthenticated: mockStore.isAuthenticated,
      isLoading: mockStore.isLoading,
      error: mockStore.error,
      statistics: mockStore.statistics,
      notificationPreferences: mockStore.notificationPreferences,
      validationErrors: mockStore.validationErrors
    }),
    cleanup: () => {
      // Implementation of cleanup method
    }
  };

  return mockStore;
}

// Interface matching the real TokenService structure
export interface TokenServiceMockFns {
  // Existing Core Methods
  getToken: jest.Mock<() => string | null>;
  getRefreshToken: jest.Mock<() => string | null>;
  setTokens: jest.Mock<(token: string | null, refreshToken?: string | null) => void>;
  clearTokens: jest.Mock<() => void>;
  shouldRefreshToken: jest.Mock<() => boolean>;
  isRefreshingToken: jest.Mock<() => boolean>;
  startTokenRefresh: jest.Mock<() => Promise<string | null>>;
  // Added based on TokenService class
  isTokenExpired: jest.Mock<(threshold?: number) => boolean>;
  queueRequest: jest.Mock<(request: () => Promise<Response>) => Promise<Response>>;
  onTokenChange: jest.Mock<(callback: (token: string | null) => void) => () => void>;
  getMetadata: jest.Mock< <T>(key: string) => T | null>;
  setMetadata: jest.Mock< <T>(key: string, value: T) => void>;
  refreshToken: jest.Mock<() => Promise<string | null>>;
  reset: jest.Mock<() => void>;
}

// Updated factory function
export function createMockTokenService(): TokenServiceMockFns {
  let currentToken: string | null = null;
  let currentRefreshToken: string | null = null;
  let isRefreshing = false;
  let refreshPromise: Promise<string | null> | null = null;
  // Use unknown instead of any for queue item types
  const requestQueue: Array<{ resolve: (v: unknown) => void; reject: (r: unknown) => void; request: () => Promise<unknown> }> = [];
  const tokenChangeCallbacks: Array<(token: string | null) => void> = [];
  let metadataStore: Record<string, unknown> = {}; // Use unknown for metadata value too

  // Define mocks first, so reset can reference them
  const mockGetToken = jest.fn(() => currentToken);
  const mockGetRefreshToken = jest.fn(() => currentRefreshToken);
  const mockSetTokens = jest.fn((token: string | null, refreshToken?: string | null) => {
    console.log('[MOCK] setTokens called with:', token, refreshToken);
    const changed = currentToken !== token;
    currentToken = token;
    currentRefreshToken = refreshToken ?? null;
    if (changed) {
      tokenChangeCallbacks.forEach(cb => cb(currentToken));
    }
  });
  const mockClearTokens = jest.fn(() => {
    console.log('[MOCK] clearTokens called');
    const changed = currentToken !== null || currentRefreshToken !== null;
    currentToken = null;
    currentRefreshToken = null;
    isRefreshing = false;
    refreshPromise = null;
    requestQueue.length = 0;
    metadataStore = {};
    if (changed) {
      tokenChangeCallbacks.forEach(cb => cb(null));
    }
  });
  const mockShouldRefreshToken = jest.fn(() => false);
  const mockIsRefreshingToken = jest.fn(() => isRefreshing);
  const mockStartTokenRefresh = jest.fn().mockImplementation(async () => {
    console.log('[MOCK] startTokenRefresh called');
    if (isRefreshing && refreshPromise) {
      console.log('[MOCK] Refresh already in progress, returning existing promise');
      return refreshPromise;
    }
    if (!currentRefreshToken) {
      console.log('[MOCK] No refresh token, throwing error');
      throw new Error('No refresh token available');
    }
    console.log('[MOCK] Starting new refresh simulation');
    isRefreshing = true;
    refreshPromise = new Promise(async (resolve, reject) => {
      try {
        console.log('[MOCK] Simulating successful refresh (default)');
        await new Promise(res => setTimeout(res, 10));
        const newToken = 'mock-refreshed-access-token';
        currentToken = newToken;
        isRefreshing = false;
        refreshPromise = null;
        resolve(newToken);
      } catch (e) {
        isRefreshing = false;
        refreshPromise = null;
        reject(e);
      }
    });
    return refreshPromise;
  });
  const mockIsTokenExpired = jest.fn((threshold = 0) => false);
  const mockQueueRequest = jest.fn().mockImplementation(async (request: () => Promise<Response>) => {
    if (isRefreshing && refreshPromise) {
      await refreshPromise;
    }
    return request();
  });
  const mockOnTokenChange = jest.fn((callback: (token: string | null) => void) => {
    tokenChangeCallbacks.push(callback);
    return () => {
      const index = tokenChangeCallbacks.indexOf(callback);
      if (index > -1) {
        tokenChangeCallbacks.splice(index, 1);
      }
    };
  });
  const mockGetMetadata = jest.fn(<T>(key: string): T | null => {
    return (metadataStore[key] as T) ?? null;
  });
  const mockSetMetadata = jest.fn(<T>(key: string, value: T): void => {
    metadataStore[key] = value;
  });
  const mockRefreshToken = jest.fn().mockImplementation(async () => mockStartTokenRefresh());

  // Reset method implementation
  const mockReset = jest.fn(() => {
    console.log('[MOCK] Resetting TokenService Mock');
    // Reset internal state variables
    currentToken = null;
    currentRefreshToken = null;
    isRefreshing = false;
    refreshPromise = null;
    requestQueue.length = 0;
    tokenChangeCallbacks.length = 0;
    metadataStore = {};

    // Clear all mock function history
    mockGetToken.mockClear();
    mockGetRefreshToken.mockClear();
    mockSetTokens.mockClear();
    mockClearTokens.mockClear();
    mockShouldRefreshToken.mockClear();
    mockIsRefreshingToken.mockClear();
    mockStartTokenRefresh.mockClear();
    mockIsTokenExpired.mockClear();
    mockQueueRequest.mockClear();
    mockOnTokenChange.mockClear();
    mockGetMetadata.mockClear();
    mockSetMetadata.mockClear();
    mockRefreshToken.mockClear();

    // Optionally reset default implementations if needed
    mockShouldRefreshToken.mockImplementation(() => false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mockIsTokenExpired.mockImplementation((threshold = 0) => false);
    // Be careful resetting startTokenRefresh implementation if default is complex
  });

  const mockFns = {
    // --- Core Methods ---
    getToken: mockGetToken,
    getRefreshToken: mockGetRefreshToken,
    setTokens: mockSetTokens,
    clearTokens: mockClearTokens,
    shouldRefreshToken: mockShouldRefreshToken,
    isRefreshingToken: mockIsRefreshingToken,
    startTokenRefresh: mockStartTokenRefresh,
    isTokenExpired: mockIsTokenExpired,
    queueRequest: mockQueueRequest,
    onTokenChange: mockOnTokenChange,
    getMetadata: mockGetMetadata,
    setMetadata: mockSetMetadata,
    refreshToken: mockRefreshToken,
    reset: mockReset,
  };

  return mockFns as unknown as TokenServiceMockFns;
}

export function simulateSuccessfulLogin(mockStore: AuthState, username: string = 'testuser') {
  mockStore.isAuthenticated = true;
  mockStore.refreshToken = 'mock-refresh-token';
  mockStore.user = {
    id: '1',
    username,
    email: `${username}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    role: 'user'
  };
  mockStore.error = null;
}

export function simulateFailedLogin(mockStore: AuthState, error: string = 'Invalid credentials') {
  mockStore.isAuthenticated = false;
  mockStore.refreshToken = null;
  mockStore.user = null;
  mockStore.error = error;
}