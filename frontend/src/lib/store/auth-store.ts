import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authApi, { User, UserStatistics, NotificationPreferences } from '../api/auth';
import { redirectToLogin } from '../api/auth';
import { tokenService as defaultTokenService } from '../services/token-service';
import type { AuthState } from './types';
import { useAuthContext } from './contexts/auth-context';

// --- Test-only Dependency Injection ---
let activeTokenService = defaultTokenService;
export function __injectTokenService(newTokenService: typeof defaultTokenService) {
  console.log('[DEBUG] Injecting token service:', newTokenService);
  activeTokenService = newTokenService;
}
export function __resetTokenService() {
  console.log('[DEBUG] Resetting token service to default');
  activeTokenService = defaultTokenService;
}
// --- End Test-only ---

export { useAuthContext };

export interface AuthStore {
  login(username: string, password: string): Promise<void>;
  register(username: string, email: string, password: string, fullName: string): Promise<void>;
  logout(): Promise<void>;
  clearError(): void;
  error: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Main Zustand store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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
      refreshToken: null,
      _inRefreshCycle: false,
      _refreshPromise: null,
      _refreshCallStack: [],

      setStatistics: (stats: UserStatistics) => {
        set({ statistics: stats });
      },

      setNotificationPreferences: (prefs: NotificationPreferences) => {
        set({ notificationPreferences: prefs });
      },

      initializeFromStorage: async () => {
        const state = get();
        console.log('[DEBUG] Called initializeFromStorage');

        // Add stronger initialization protection
        if (state.isLoading || state._inRefreshCycle || state._refreshPromise) {
          console.log('[DEBUG] Initialization skipped - already in progress or refresh cycle active');
          return;
        }

        // Set initialization flags immediately
        set({
          isLoading: true,
          _inRefreshCycle: false, // Don't set this yet
          error: null
        });

        try {
          console.log('[DEBUG] Starting initialization from storage');
          const token = activeTokenService.getToken();

          if (!token) {
            console.log('[DEBUG] No token found during initialization');
            activeTokenService.clearTokens();
            set({
              isAuthenticated: false,
              user: null,
              error: null,
              statistics: null,
              notificationPreferences: null,
              isLoading: false,
              _lastTokenRefresh: 0,
              _refreshAttempts: 0,
              _lastRefreshTimestamp: null,
              _inRefreshCycle: false,
              _refreshPromise: null
            });
            return;
          }

          // Check token validity without triggering a refresh
          const shouldRefresh = activeTokenService.shouldRefreshToken();
          if (shouldRefresh) {
            console.log('[DEBUG] Token needs refresh during initialization');
            // Don't trigger refresh here, just clear state
            activeTokenService.clearTokens();
            set({
              isAuthenticated: false,
              user: null,
              error: 'Token expired',
              statistics: null,
              notificationPreferences: null,
              isLoading: false,
              _lastTokenRefresh: 0,
              _refreshAttempts: 0,
              _lastRefreshTimestamp: null,
              _inRefreshCycle: false,
              _refreshPromise: null
            });
            return;
          }

          console.log('[DEBUG] Found valid token during initialization');
          set({
            isAuthenticated: true,
            error: null
          });

          try {
            const user = await authApi.getCurrentUser();
            console.log('[DEBUG] Successfully fetched user data during initialization');
            set({
              user,
              isLoading: false,
              _lastTokenRefresh: Date.now(),
              _refreshAttempts: 0,
              _lastRefreshTimestamp: Date.now(),
              _lastRefreshAttemptTimestamp: null,
              _inRefreshCycle: false,
              _refreshPromise: null
            });

            // Initialize user data without waiting
            Promise.all([
              get().fetchStatistics(),
              get().getNotificationPreferences()
            ]).catch(error => {
              console.error('[DEBUG] Error initializing user data:', error);
            });
          } catch (error: unknown) {
            console.error('[DEBUG] Error fetching user during initialization:', error);
            // Don't attempt refresh here, just clear state
            activeTokenService.clearTokens();
            set({
              isAuthenticated: false,
              user: null,
              error: error instanceof Error ? error.message : 'Failed to fetch user',
              statistics: null,
              notificationPreferences: null,
              isLoading: false,
              _lastTokenRefresh: 0,
              _refreshAttempts: 0,
              _lastRefreshTimestamp: null,
              _inRefreshCycle: false,
              _refreshPromise: null
            });
          }
        } catch (error) {
          console.error('[DEBUG] Error during initialization:', error);
          set({
            isAuthenticated: false,
            user: null,
            error: error instanceof Error ? error.message : 'Failed to initialize',
            statistics: null,
            notificationPreferences: null,
            isLoading: false,
            _lastTokenRefresh: 0,
            _refreshAttempts: 0,
            _lastRefreshTimestamp: null,
            _inRefreshCycle: false,
            _refreshPromise: null
          });
        }
      },

      setDirectAuthState: (token: string, isAuth: boolean) => {
        activeTokenService.setTokens(token);
        set({
          isAuthenticated: isAuth
        });
      },

      login: async (username: string, password: string) => {
        console.log('Auth store: Starting login process');
        set({ isLoading: true, error: null });

        try {
          // Clear any existing auth state first
          console.log('Auth store: Clearing existing auth state');
          activeTokenService.clearTokens();
          set({
            isAuthenticated: false,
            user: null,
            error: null
          });

          console.log('Auth store: Calling login API');
          const { token, refreshToken } = await authApi.login({ username, password });

          if (!token) {
            console.error('Auth store: No token received from login');
            throw new Error('No token received from login');
          }

          console.log('Auth store: Token received, storing tokens');
          activeTokenService.setTokens(token, refreshToken);

          console.log('Auth store: Updating store state');
          set({
            isAuthenticated: true,
            error: null
          });

          try {
            console.log('Auth store: Fetching user details');
            const user = await authApi.getCurrentUser();
            console.log('Auth store: User details fetched successfully');
            set({ user, isLoading: false });

            // Initialize user data after successful login
            console.log('Auth store: Initializing user data');
            await Promise.all([
              get().fetchStatistics(),
              get().getNotificationPreferences()
            ]).catch(error => {
              console.error('Auth store: Error initializing user data:', error);
            });

            console.log('Auth store: Login process complete');
          } catch (error: unknown) {
            console.error('Auth store: Error fetching user after login:', error);
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to fetch user',
              user: null,
              isAuthenticated: false
            });
          }
        } catch (error: unknown) {
          console.error('Auth store: Login error:', error);
          // Clear any partial auth state
          activeTokenService.clearTokens();
          set({
            isAuthenticated: false,
            user: null,
            error: error instanceof Error ? error.message : 'Failed to login',
            isLoading: false
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          // Only call logout API if authenticated
          if (get().isAuthenticated) {
            await authApi.logout();
          }

          // Reset state before clearing tokens
          set({
            isAuthenticated: false,
            user: null,
            error: null,
            isLoading: false,
            statistics: null,
            notificationPreferences: null,
            _lastTokenRefresh: 0,
            _refreshAttempts: 0,
            _lastRefreshTimestamp: null,
            _inRefreshCycle: false,
            _refreshPromise: null
          });

          activeTokenService.clearTokens();
          redirectToLogin();
        } catch (error) {
          console.error('Logout error:', error);
          // Still clear state on error
          set({
            isAuthenticated: false,
            user: null,
            error: error instanceof Error ? error.message : 'Failed to logout',
            isLoading: false,
            statistics: null,
            notificationPreferences: null,
            _lastTokenRefresh: 0,
            _refreshAttempts: 0,
            _lastRefreshTimestamp: null,
            _inRefreshCycle: false,
            _refreshPromise: null
          });
          activeTokenService.clearTokens();
          redirectToLogin();
        }
      },

      refreshAuthToken: async () => {
        const state = get();
        const now = Date.now();

        // Debug log with cycle detection
        const currentStack = new Error().stack?.split('\n').slice(1, 5) || [];
        console.log('[DEBUG] refreshAuthToken called', {
          timestamp: new Date(now).toISOString(),
          hasExistingPromise: !!state._refreshPromise,
          inRefreshCycle: state._inRefreshCycle,
          stackTrace: currentStack
        });

        // Prevent refresh if we're in a cycle or have an existing promise
        if (state._inRefreshCycle || state._refreshPromise) {
          console.log('[DEBUG] Refresh already in progress, skipping');
          return state._refreshPromise || Promise.resolve(false);
        }

        // Check cooldown period
        if (state._lastRefreshTimestamp && now - state._lastRefreshTimestamp < 5000) {
          console.log('[DEBUG] In cooldown period, skipping refresh');
          return Promise.resolve(false);
        }

        // Create new refresh promise with cycle protection
        const refreshPromise = (async () => {
          try {
            // Set cycle flags before starting refresh
            set({
              _inRefreshCycle: true,
              isLoading: true,
              error: null,
              _lastRefreshAttemptTimestamp: now,
              _refreshPromise: null // Clear any stale promise
            });

            // Wait for token service refresh
            const token = await activeTokenService.startTokenRefresh();

            if (!token) {
              console.log('[DEBUG] Token refresh failed - no token returned');
              activeTokenService.clearTokens();
              set({
                isAuthenticated: false,
                user: null,
                error: 'Token refresh failed',
                _inRefreshCycle: false,
                isLoading: false,
                _refreshPromise: null,
                _lastRefreshAttemptTimestamp: null
              });
              return false;
            }

            // --- Success path ---
            const existingRefreshToken = activeTokenService.getRefreshToken();
            activeTokenService.setTokens(token, existingRefreshToken ?? undefined);

            // Update state with new token auth status etc.
            set({
              isAuthenticated: true,
              error: null,
              _lastTokenRefresh: now,
              _refreshAttempts: 0,
              _lastRefreshTimestamp: now,
              _lastRefreshAttemptTimestamp: null,
              _inRefreshCycle: false,
              isLoading: false,
              _refreshPromise: null
            });

            console.log('[DEBUG] Token refresh successful, new token set');
            return true;
          } catch (error) {
            console.error('[DEBUG] Token refresh failed:', error);
            activeTokenService.clearTokens();
            const errorMessage = error instanceof Error ? error.message : 'Refresh failed';
            set({
              isAuthenticated: false,
              user: null,
              error: errorMessage,
              _lastRefreshAttemptTimestamp: null,
              _inRefreshCycle: false,
              isLoading: false,
              _refreshPromise: null
            });
            return false;
          }
        })();

        set({ _refreshPromise: refreshPromise });
        return refreshPromise;
      },

      register: async (username: string, email: string, password: string, fullName: string) => {
        try {
          set({ isLoading: true, error: null });

          // Split fullName into firstName and lastName
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const result = await authApi.register({
            username,
            email,
            password,
            firstName,
            lastName
          });

          set({
            isLoading: false,
            error: null
          });

          return result;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to register'
          });
          throw error;
        }
      },

      fetchUser: async () => {
        const state = get();

        // Don't fetch if we're already loading
        if (state.isLoading) {
          console.log('Auth store: Skipping user fetch - loading in progress');
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const user = await authApi.getCurrentUser();
          set({
            user,
            isLoading: false,
            error: null
          });
        } catch (error: unknown) {
          console.error('Error fetching user:', error);

          // Check if the error is due to an expired token
          const isAuthError = error instanceof Error &&
            (error.message.includes('unauthorized') || error.message.includes('token'));

          if (isAuthError && activeTokenService.shouldRefreshToken()) {
            try {
              const refreshed = await get().refreshAuthToken();
              if (refreshed) {
                // Retry fetching user once after successful token refresh
                try {
                  const user = await authApi.getCurrentUser();
                  set({
                    user,
                    isLoading: false,
                    error: null
                  });
                } catch (retryError) {
                  console.error('Error fetching user after token refresh:', retryError);
                  set({
                    error: 'Failed to fetch user after token refresh',
                    isLoading: false
                  });
                }
              } else {
                activeTokenService.clearTokens();
                set({
                  isAuthenticated: false,
                  isLoading: false,
                  error: 'Token refresh failed'
                });
              }
            } catch (refreshError) {
              console.error('Error during token refresh:', refreshError);
              activeTokenService.clearTokens();
              set({
                isAuthenticated: false,
                isLoading: false,
                error: 'Token refresh failed'
              });
            }
          } else {
            set({
              error: error instanceof Error ? error.message : 'Failed to fetch user',
              isLoading: false
            });
          }
        }
      },

      updateProfile: async (data: Partial<User>) => {
        try {
          set({ isLoading: true, error: null });

          const updatedUser = await authApi.updateProfile(data);

          set({
            user: updatedUser,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to update profile',
          });
          throw error;
        }
      },

      changePassword: async (oldPassword: string, newPassword: string) => {
        try {
          set({ isLoading: true, error: null });

          await authApi.changePassword(oldPassword, newPassword);

          set({ isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to change password',
          });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        activeTokenService.clearTokens();
        set({
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
          _inRefreshCycle: false,
          _refreshPromise: null,
          refreshToken: null
        });
      },

      setRefreshToken: (refreshToken: string) => {
        const token = activeTokenService.getToken();
        if (token) {
          activeTokenService.setTokens(token, refreshToken);
        }
      },

      fetchStatistics: async () => {
        try {
          set({ isLoading: true, error: null });
          console.log('Fetching user statistics from backend...');

          const statistics = await authApi.getUserStatistics();
          console.log('Statistics fetched successfully');

          // Only update state if we received valid data (not defaults)
          const hasRealData = statistics.totalCoursesEnrolled > 0 ||
                             statistics.completedCourses > 0 ||
                             statistics.averageScore > 0;

          set({
            statistics: statistics,
            isLoading: false,
            // Only set error state if we received defaults due to an error
            error: hasRealData ? null : 'Unable to load statistics'
          });
        } catch (error) {
          console.error('Failed to fetch user statistics:', error);
          // Don't update error state to avoid UI disruption
          set({ isLoading: false });
        }
      },

      getNotificationPreferences: async () => {
        try {
          const preferences = await authApi.getNotificationPreferences();
          set({ notificationPreferences: preferences });
          return preferences;
        } catch (error) {
          console.error('Failed to fetch notification preferences:', error);
          throw error;
        }
      },

      updateNotificationPreferences: async (preferences: NotificationPreferences) => {
        try {
          await authApi.updateNotificationPreferences(preferences);
          set({ notificationPreferences: preferences });
        } catch (error) {
          console.error('Failed to update notification preferences:', error);
          throw error;
        }
      },

      exportUserData: async () => {
        try {
          set({ isLoading: true, error: null });
          const data = await authApi.exportUserData();
          set({ isLoading: false });
          return data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      deleteAccount: async () => {
        try {
          set({ isLoading: true, error: null });
          await authApi.deleteAccount();
          activeTokenService.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            statistics: null,
            notificationPreferences: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: 'Failed to delete account',
          });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);