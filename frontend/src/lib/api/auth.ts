import { tokenService } from '../services/token-service';
import apiClient from './client';
import { AxiosError } from 'axios';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  role: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UserStatistics {
  totalCoursesEnrolled: number;
  completedCourses: number;
  averageScore: number;
  totalTimeSpent: number;
  lastAccessDate: string;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  courseUpdates: boolean;
  newMessages: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
}

/**
 * Redirects to the login page with an optional return URL
 */
export function redirectToLogin(returnUrl?: string) {
  if (typeof window !== 'undefined') {
    const loginPath = '/auth/login';
    const url = returnUrl ? `${loginPath}?returnUrl=${encodeURIComponent(returnUrl)}` : loginPath;
    window.location.href = url;
  }
}

const authApi = {
  async login(credentials: LoginCredentials): Promise<{token: string, refreshToken?: string}> {
    try {
      const response = await apiClient.post('/auth/login', credentials);

      if (!response.data.token) {
        console.error('No token in response:', response.data);
        throw new Error('Invalid login response - no token received');
      }

      return {
        token: response.data.token,
        refreshToken: response.data.refreshToken
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async register(data: RegisterData): Promise<void> {
    const response = await apiClient.post('/auth/register', data);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Registration failed');
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear tokens before throwing
      tokenService.clearTokens();
      throw error;
    }
    // Clear tokens on success
    tokenService.clearTokens();
  },

  async getCurrentUser(): Promise<User> {
    let handledAs401 = false; // Flag to track if 401 logic ran
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Error fetching current user:', error);

      if (error instanceof AxiosError && error.response?.status === 401) {
        handledAs401 = true; // Mark that we entered the 401 handling path
        try {
          const refreshResult = await tokenService.startTokenRefresh();
          if (refreshResult) {
            // Retry success: Return data and exit function
            const retryResponse = await apiClient.get('/auth/me');
            return retryResponse.data;
          }
          // Refresh resolved null: Clear tokens and re-throw original 401
          tokenService.clearTokens(); // Call #1 (Path A)
          throw error; // Exits via throw
        } catch (refreshError) {
          // Refresh failed (rejected): Log, clear tokens, and throw refresh error
          console.error('Token refresh failed:', refreshError);
          tokenService.clearTokens(); // Call #1 (Path B)
          throw refreshError; // Exits via throw
        }
      }

      // Fallback logic
      if (!handledAs401) { // Only run this if the error wasn't handled as a 401
        tokenService.clearTokens();
      }
      // Always re-throw the error that brought us to the catch block
      // (unless we returned successfully after retry)
      throw error;
    }
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.put('/auth/profile', data);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/auth/change-password', {
        oldPassword,
        newPassword
      });
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  async getUserStatistics(): Promise<UserStatistics> {
    try {
      const response = await apiClient.get('/auth/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      throw error;
    }
  },

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      const response = await apiClient.get('/auth/preferences/notifications');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  },

  async updateNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      await apiClient.put('/auth/preferences/notifications', preferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  },

  async exportUserData(): Promise<Blob> {
    try {
      const response = await apiClient.get('/auth/export', {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  },

  async deleteAccount(): Promise<void> {
    try {
      await apiClient.delete('/auth/account');
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }
};

export default authApi;