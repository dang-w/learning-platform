import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authApi, { User, UserStatistics, NotificationPreferences } from '../api/auth';
import { tokenService as defaultTokenService } from '../services/token-service';
import type { AuthState } from './types';

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

      setStatistics: (stats: UserStatistics) => {
        set({ statistics: stats });
      },

      setNotificationPreferences: (prefs: NotificationPreferences) => {
        set({ notificationPreferences: prefs });
      },

      initializeFromStorage: async () => {
        const state = get();
        console.log('[AuthStore START] Initializing from storage...');

        // Prevent concurrent initialization
        if (state.isLoading) {
          console.log('[AuthStore SKIP] Initialization skipped - already in progress.');
          return;
        }

        console.log('[AuthStore STEP] Setting loading state.');
        set({ isLoading: true, error: null });

        try {
          console.log('[AuthStore STEP] Attempting to get token from tokenService.');
          const token = activeTokenService.getToken();

          if (!token) {
            console.log('[AuthStore FAIL] No token found. Clearing tokens and setting unauthenticated state.');
            // Ensure tokens are cleared if none found during init
            activeTokenService.clearTokens();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
              statistics: null,
              notificationPreferences: null,
            });
            return;
          }

          // Token exists, try fetching user data. Interceptor handles refresh.
          console.log('[AuthStore STEP] Token found. Attempting to fetch user data via authApi.getCurrentUser...');
          try {
            const user = await authApi.getCurrentUser();
            console.log('[AuthStore SUCCESS] User data fetched successfully via getCurrentUser. Setting authenticated state.', { userId: user?.id });
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            // Fetch associated data after successful authentication
            Promise.all([
              get().fetchStatistics(),
              get().getNotificationPreferences()
            ]).catch(error => {
              console.error('[AuthStore] Error initializing associated user data:', error);
              // Decide if this error should affect auth state - probably not
            });

          } catch (error: unknown) {
            // This catch block handles errors from getCurrentUser,
            // including potential ERR_AUTH_REFRESH_FAILED from the interceptor
            console.error('[AuthStore ERROR] Failed to fetch user during initialization (in getCurrentUser try-catch): Clearing tokens and setting unauthenticated state.', error);
            activeTokenService.clearTokens(); // Critical: Clear tokens on auth failure
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Authentication failed during initialization',
              statistics: null,
              notificationPreferences: null,
            });
          }
        } catch (error) {
          // Catch unexpected errors during the init process itself
          console.error('[AuthStore ERROR] Unexpected error during initialization (outer try-catch): Clearing tokens and setting unauthenticated state.', error);
          activeTokenService.clearTokens(); // Ensure clean state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to initialize auth state',
            statistics: null,
            notificationPreferences: null,
          });
        }
        console.log('[AuthStore END] Initialization finished.');
      },

      setDirectAuthState: (token: string, isAuth: boolean) => {
        // Caution: This bypasses fetching user data. Use only in specific scenarios (e.g., tests).
        activeTokenService.setTokens(token);
        set({ isAuthenticated: isAuth, isLoading: false, user: isAuth ? get().user : null }); // Keep user if setting auth, clear if unsetting
      },

      login: async (username: string, password: string) => {
        console.log('[AuthStore] Login attempt started.');
        set({ isLoading: true, error: null });

        try {
          // Call the login API endpoint with correct signature
          const response = await authApi.login({ username, password });
          console.log('[AuthStore] Login API call successful.');

          // Set ONLY the access token using TokenService
          // Refresh token is handled by HttpOnly cookie set by backend
          activeTokenService.setTokens(response.token);
          console.log('[AuthStore] Access token set via TokenService.');

          // Fetch user data immediately after successful login and token setting
          await get().fetchUser(); // fetchUser handles setting isAuthenticated
          console.log('[AuthStore] User data fetched after login.');

        } catch (error: unknown) {
          console.error('[AuthStore] Login failed:', error);
          activeTokenService.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
            statistics: null,
            notificationPreferences: null
          });
        }
      },

      logout: async () => {
        console.log('[AuthStore] Logout attempt started.');
        set({ isLoading: true });

        try {
          await authApi.logout();
          console.log('[AuthStore] Logout API call successful.');
        } catch (error) {
          // Log error but proceed with client-side logout regardless
          console.error('[AuthStore] Logout API call failed, proceeding with client logout:', error);
        } finally {
          // Always clear tokens and reset state
          activeTokenService.clearTokens(); // Ensure token service state is also cleared
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            statistics: null,
            notificationPreferences: null
            // reset other relevant states if necessary
          });
          console.log('[AuthStore] Tokens cleared and state reset.');
        }
      },

      fetchUser: async () => {
        console.log('[AuthStore] Attempting to fetch user data...');
        // Don't set isLoading here if it's called from login/init which already set it
        // set({ isLoading: true }); // Optional: Set loading if called independently

        try {
          const user = await authApi.getCurrentUser();
          console.log('[AuthStore] User data fetched successfully via fetchUser.');
          console.log('[AuthStore fetchUser] User object received:', user);
          set({
            user,
            isAuthenticated: true,
            isLoading: false, // Set loading false here
            error: null
          });

          // Fetch associated data after successful user fetch
          Promise.all([
            get().fetchStatistics(),
            get().getNotificationPreferences()
          ]).catch(error => {
            console.error('[AuthStore] Error fetching associated user data after fetchUser:', error);
          });

        } catch (error: unknown) {
          console.error('[AuthStore] Failed to fetch user data:', error);
          // Clear tokens and reset auth state if fetching user fails
          activeTokenService.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false, // Set loading false here
            error: error instanceof Error ? error.message : 'Failed to fetch user data',
            statistics: null,
            notificationPreferences: null
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      register: async (username: string, email: string, password: string, confirmPassword: string, firstName: string, lastName: string) => {
        console.log('[AuthStore] Registration attempt started.');
        set({ isLoading: true, error: null });
        try {
          // Basic validation (can be enhanced)
          if (password !== confirmPassword) {
            throw new Error("Passwords do not match");
          }

          // Call register API - ensure it includes confirmPassword if needed by API
          // Map frontend field names (firstName, lastName) to backend names (first_name, last_name) in api/auth.ts
          await authApi.register({
            username,
            email,
            password,
            confirmPassword, // Pass confirmPassword to the API layer
            firstName,
            lastName
          });
          console.log('[AuthStore] Registration API call successful.');

          // Registration successful, but user is NOT logged in yet.
          // Clear loading/error, but don't set auth state or fetch user.
          set({
            isLoading: false,
            error: null,
            // Do NOT set isAuthenticated or user here
          });

          // Optional: Maybe set a success message or flag for the UI?
          // set({ registrationSuccessMessage: 'Registration successful! Please log in.' });

        } catch (error: unknown) {
          console.error('[AuthStore] Registration failed:', error);
          // No tokens to clear on registration failure
          // activeTokenService.clearTokens();
          set({
            user: null,
            isAuthenticated: false, // Ensure user is not authenticated
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false,
            statistics: null,
            notificationPreferences: null
          });
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

      reset: () => {
        console.log('[AuthStore] Resetting auth store state.');
        activeTokenService.clearTokens();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          statistics: null,
          notificationPreferences: null,
          validationErrors: undefined
          // Reset any other state properties if needed
        });
      },

      fetchStatistics: async () => {
        set({ isLoading: true });
        try {
          const statistics = await authApi.getUserStatistics();
          console.log('User statistics fetched:', statistics);

          set({
            statistics: statistics,
            isLoading: false,
            // Always clear error on successful fetch
            error: null
          });
        } catch (error) {
          console.error('Failed to fetch user statistics:', error);
          // Set error state ONLY if the API call actually fails
          set({ isLoading: false, error: 'Failed to load statistics' });
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
        console.log('[AuthStore] Exporting user data...');
        try {
          const blob = await authApi.exportUserData();
          console.log('[AuthStore] User data export successful.');
          return blob;
        } catch (error: unknown) {
          console.error('[AuthStore] Failed to export user data:', error);
          // Keep error setting if needed for UI feedback
          set({ error: error instanceof Error ? error.message : 'Failed to export data' });
          throw error; // Re-throw error so component can catch it
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
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          const str = localStorage.getItem(name);
          if (!str) return null;
          try {
            // Get the persisted state, but don't use the 'state' variable directly yet
            const parsed = JSON.parse(str);
            return {
              state: {
                // SELECTIVE HYDRATION: Keep this empty or hydrate only non-auth state
              },
              version: parsed.version,
            };
          } catch (e) {
            console.error('Error parsing auth state from localStorage', e);
            localStorage.removeItem(name); // Clear corrupted state
            return null;
          }
        },
        setItem: (name, newValue) => {
          if (typeof window === 'undefined') return;
          try {
            const stateToPersist = {
              // SELECTIVE PERSISTENCE: Keep this empty or persist only non-auth state
            };
            localStorage.setItem(name, JSON.stringify({
              state: stateToPersist,
              version: newValue.version,
            }));
          } catch (e) {
            console.error('Error setting auth state in localStorage', e);
          }
        },
        removeItem: (name) => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(name);
          }
        },
      },
      onRehydrateStorage: () => {
        console.log('[AuthStore] Hydration from storage finished.');
        return (_, error) => { // Removed unused hydratedState parameter
          if (error) {
            console.error('[AuthStore] Error during rehydration:', error);
          } else {
            console.log('[AuthStore] Rehydration successful, triggering initialization.');
            // useAuthStore.getState().initializeFromStorage(); // <-- REMOVED THIS LINE
          }
        };
      },
      partialize: () => ({ // Removed unused state parameter
        // SELECTIVE PERSISTENCE: Keep this empty
      }),
    }
  )
);

// Optional: Export helper function for easy logout access
export const logoutUser = () => useAuthStore.getState().logout();