import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authApi, { User, UserStatistics, NotificationPreferences } from '../api/auth';
import { redirectToLogin } from '../api/auth';
import { tokenService } from '../services/token-service';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  statistics: UserStatistics | null;
  notificationPreferences: NotificationPreferences | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  refreshAuthToken: () => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  setDirectAuthState: (token: string, isAuth: boolean) => void;
  fetchStatistics: () => Promise<void>;
  getNotificationPreferences: () => Promise<NotificationPreferences>;
  updateNotificationPreferences: (preferences: NotificationPreferences) => Promise<void>;
  exportUserData: () => Promise<Blob>;
  deleteAccount: () => Promise<void>;
  reset: () => void;
  setRefreshToken: (refreshToken: string) => void;
  _lastTokenRefresh: number;
  _retryAfterTimestamp: number | null;
  _lastRefreshAttemptTimestamp: number | null;
  _refreshAttempts: number;
  _lastRefreshTimestamp: number | null;
  initializeFromStorage: () => void;
  setStatistics: (stats: UserStatistics) => void;
  setNotificationPreferences: (prefs: NotificationPreferences) => void;
  refreshToken: string | null;
}

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

      setStatistics: (stats: UserStatistics) => {
        set({ statistics: stats });
      },

      setNotificationPreferences: (prefs: NotificationPreferences) => {
        set({ notificationPreferences: prefs });
      },

      initializeFromStorage: async () => {
        console.log('Auth store: Initializing from storage');
        const token = tokenService.getToken();
        const refreshToken = tokenService.getRefreshToken();

        if (!token || !refreshToken) {
          console.log('Auth store: No tokens found during initialization');
          tokenService.clearTokens();
          set({
            isAuthenticated: false,
            user: null,
            error: null,
            statistics: null,
            notificationPreferences: null,
            isLoading: false,
            _lastTokenRefresh: 0,
            _refreshAttempts: 0,
            _lastRefreshTimestamp: null
          });
          return;
        }

        if (tokenService.isTokenExpired()) {
          console.log('Auth store: Token expired during initialization');
          const refreshed = await get().refreshAuthToken();
          if (!refreshed) {
            tokenService.clearTokens();
            set({
              isAuthenticated: false,
              user: null,
              error: 'Token expired and refresh failed',
              statistics: null,
              notificationPreferences: null,
              isLoading: false,
              _lastTokenRefresh: 0,
              _refreshAttempts: 0,
              _lastRefreshTimestamp: null
            });
            return;
          }
        }

        console.log('Auth store: Found valid tokens during initialization');
        set({
          isAuthenticated: true,
          isLoading: true,
          error: null
        });

        try {
          const user = await authApi.getCurrentUser();
          console.log('Auth store: Successfully fetched user data during initialization');
          set({
            user,
            isLoading: false,
            _lastTokenRefresh: Date.now(),
            _refreshAttempts: 0,
            _lastRefreshTimestamp: Date.now()
          });
        } catch (error: unknown) {
          console.error('Auth store: Error fetching user during initialization:', error);
          if (error instanceof Error && (error.message?.includes('401') || error.message?.includes('Unauthorized'))) {
            console.log('Auth store: Unauthorized during initialization, attempting token refresh');
            const refreshed = await get().refreshAuthToken();
            if (!refreshed) {
              console.log('Auth store: Token refresh failed, clearing auth state');
              tokenService.clearTokens();
              set({
                isAuthenticated: false,
                user: null,
                error: 'Failed to refresh token during initialization',
                statistics: null,
                notificationPreferences: null,
                isLoading: false,
                _lastTokenRefresh: 0,
                _refreshAttempts: 0,
                _lastRefreshTimestamp: null
              });
            }
          } else {
            set({
              error: error instanceof Error ? error.message : 'Failed to fetch user during initialization',
              isLoading: false
            });
          }
        }
      },

      setDirectAuthState: (token: string, isAuth: boolean) => {
        tokenService.setTokens(token);
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
          tokenService.clearTokens();
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

          console.log('Auth store: Token received and formatted');
          tokenService.setTokens(token, refreshToken);

          console.log('Auth store: Updating store state');
          set({
            isAuthenticated: true,
            error: null
          });

          try {
            console.log('Auth store: Fetching user details');
            const user = await authApi.getCurrentUser();
            console.log('Auth store: User details fetched successfully');
            set({ user });

            // Initialize user data after successful login
            console.log('Auth store: Initializing user data');
            await Promise.all([
              get().fetchStatistics(),
              get().getNotificationPreferences()
            ]).catch(error => {
              console.error('Auth store: Error initializing user data:', error);
              // Don't fail the login if these fail
            });

            console.log('Auth store: Login process complete');
            set({ isLoading: false });
          } catch (error: unknown) {
            console.error('Auth store: Error fetching user after login:', error);
            // Don't fail the login if user fetch fails
            set({ isLoading: false });
          }
        } catch (error: unknown) {
          console.error('Auth store: Login error:', error);
          // Clear any partial auth state
          tokenService.clearTokens();
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
        set({ isLoading: true });
        try {
          // Only call logout API if authenticated
          if (get().isAuthenticated) {
            await authApi.logout();
          }
          set({
            isAuthenticated: false,
            user: null,
            error: null,
            isLoading: false,
            statistics: null,
            notificationPreferences: null
          });
        } catch (error) {
          console.error('Logout error:', error);
          set({
            isAuthenticated: false,
            user: null,
            error: error instanceof Error ? error.message : 'Failed to logout',
            isLoading: false,
            statistics: null,
            notificationPreferences: null
          });
        } finally {
          tokenService.clearTokens();
          redirectToLogin();
        }
      },

      refreshAuthToken: async () => {
        const refreshToken = tokenService.getRefreshToken();

        // Check if token is expired first
        if (!tokenService.isTokenExpired()) {
          console.log('Auth store: Token not expired, skipping refresh');
          return true;
        }

        if (!refreshToken) {
          console.error('No refresh token available');
          tokenService.clearTokens();
          set({
            isAuthenticated: false,
            user: null,
            error: 'No refresh token available'
          });
          return false;
        }

        try {
          console.log('Auth store: Starting token refresh');
          const success = await authApi.refreshAuthToken();

          if (!success) {
            console.error('Auth store: Token refresh failed');
            tokenService.clearTokens();
            set({
              isAuthenticated: false,
              user: null,
              error: 'Token refresh failed'
            });
            return false;
          }

          // Update state with new token
          set({
            isAuthenticated: true,
            error: null,
            _lastTokenRefresh: Date.now(),
            _refreshAttempts: 0,
            _lastRefreshTimestamp: Date.now()
          });

          try {
            const user = await authApi.getCurrentUser();
            set({ user });
            console.log('Auth store: Token refresh successful');
            return true;
          } catch (error) {
            console.error('Auth store: Error fetching user after refresh:', error);
            // Don't clear tokens on user fetch failure
            // This allows retrying the user fetch later
            set({
              error: 'Failed to fetch user after token refresh'
            });
            return true;
          }
        } catch (error) {
          console.error('Auth store: Token refresh failed:', error);
          tokenService.clearTokens();
          set({
            isAuthenticated: false,
            user: null,
            error: error instanceof Error ? error.message : 'Token refresh failed'
          });
          return false;
        }
      },

      register: async (username: string, email: string, password: string, fullName: string) => {
        try {
          set({ isLoading: true, error: null });

          // Split fullName into firstName and lastName
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          await authApi.register({
            username,
            email,
            password,
            firstName,
            lastName
          });

          // Add a small delay before login to give the backend time to process
          await new Promise(resolve => setTimeout(resolve, 1000));

          try {
            // Auto login after registration
            await get().login(username, password);
          } catch (loginError) {
            // If auto-login fails, don't treat it as a registration error
            console.warn('Auto login after registration failed:', loginError);

            // Set a specific message for this case
            set({
              isLoading: false,
              error: 'Account created successfully. Please log in with your credentials.',
            });

            // Rethrow a specific error type to handle in the component
            throw new Error('AUTO_LOGIN_FAILED');
          }
        } catch (error) {
          // Only set error state if it's not the AUTO_LOGIN_FAILED case
          if (!(error instanceof Error) || error.message !== 'AUTO_LOGIN_FAILED') {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to register',
            });
          }
          throw error;
        }
      },

      fetchUser: async () => {
        set({ isLoading: true, error: null });
        try {
          const user = await authApi.getCurrentUser();
          set({ user, isLoading: false });
        } catch (error: unknown) {
          console.error('Error fetching user:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch user',
            isLoading: false
          });

          // Check if we already have a token in localStorage but not in state
          const token = tokenService.getToken();
          if (token && !get().isAuthenticated) {
            set({ isAuthenticated: true });
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
        });
      },

      setRefreshToken: (refreshToken: string) => {
        tokenService.setTokens(tokenService.getToken() ?? '', refreshToken);
      },

      fetchStatistics: async () => {
        try {
          set({ isLoading: true });
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
          set({ isLoading: true });
          console.log('Fetching notification preferences from backend...');

          const preferences = await authApi.getNotificationPreferences();
          console.log('Notification preferences fetched successfully');

          set({
            notificationPreferences: preferences,
            isLoading: false,
          });
          return preferences;
        } catch (error) {
          console.error('Failed to fetch notification preferences:', error);
          // Don't update error state to avoid UI disruption
          set({ isLoading: false });

          // Return default preferences
          return {
            emailNotifications: true,
            courseUpdates: true,
            newMessages: true,
            marketingEmails: false,
            weeklyDigest: true
          };
        }
      },

      updateNotificationPreferences: async (preferences: NotificationPreferences) => {
        try {
          set({ isLoading: true, error: null });
          const updatedPreferences = await authApi.updateNotificationPreferences(preferences);
          set({
            notificationPreferences: updatedPreferences,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: 'Failed to update notification preferences',
          });
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
          set({
            isLoading: false,
            error: 'Failed to export user data',
          });
          throw error;
        }
      },

      deleteAccount: async () => {
        try {
          set({ isLoading: true, error: null });
          await authApi.deleteAccount();
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