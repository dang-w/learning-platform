import type { User, UserStatistics, NotificationPreferences } from '../api/auth';

export interface AuthState {
  // Core state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  statistics: UserStatistics | null;
  notificationPreferences: NotificationPreferences | null;
  refreshToken: string | null;
  validationErrors?: Record<string, string>;

  // Required methods
  initializeFromStorage: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName: string) => Promise<{ user: User }>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  refreshAuthToken: () => Promise<boolean>;
  clearError: () => void;

  // Additional methods
  updateProfile: (updates: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setDirectAuthState: (token: string, isAuthenticated: boolean) => void;
  fetchStatistics: () => Promise<void>;
  getNotificationPreferences: () => Promise<NotificationPreferences>;
  updateNotificationPreferences: (preferences: NotificationPreferences) => Promise<void>;
  exportUserData: () => Promise<Blob>;
  deleteAccount: () => Promise<void>;
  reset: () => void;
  setRefreshToken: (token: string) => void;
  setStatistics: (statistics: UserStatistics) => void;
  setNotificationPreferences: (preferences: NotificationPreferences) => void;

  // Internal state
  _lastTokenRefresh: number;
  _retryAfterTimestamp: number | null;
  _lastRefreshAttemptTimestamp: number | null;
  _refreshAttempts: number;
  _lastRefreshTimestamp: number | null;
  _inRefreshCycle: boolean;
  _refreshPromise: Promise<boolean> | null;
  _refreshCallStack: string[];
}