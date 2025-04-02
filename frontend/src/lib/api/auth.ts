import { tokenService } from '../services/token-service';
import apiClient from './client';
import { AxiosError } from 'axios';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
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
  confirmPassword: string;
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
  async login(credentials: LoginCredentials): Promise<{token: string}> {
    try {
      console.log("[authApi.login] Calling POST /auth/token with credentials:", { username: credentials.username });
      const response = await apiClient.post('/auth/token', credentials);

      if (!response.data.access_token) {
        console.error('No access_token in response:', response.data);
        throw new Error('Invalid login response - no access_token received');
      }

      return {
        token: response.data.access_token,
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async register(data: RegisterData): Promise<void> {
    console.log("[authApi.register] Calling POST /auth/register with data:", { username: data.username, email: data.email });

    // Map frontend data (firstName, lastName) to backend expected data (first_name, last_name)
    const backendData = {
      username: data.username,
      email: data.email,
      password: data.password,
      confirm_password: data.confirmPassword,
      first_name: data.firstName,
      last_name: data.lastName
    };

    // Pass the mapped data to the backend
    const response = await apiClient.post('/auth/register', backendData);

    // Check for successful backend response (adjust based on actual backend response)
    // The backend /register route now returns { access_token, token_type } on success
    if (!response || response.status < 200 || response.status >= 300 || !response.data.access_token) {
      const errorMessage = response?.data?.detail || 'Registration failed';
      console.error(`Registration failed: Status ${response?.status}, Message: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // Optionally, handle the returned access_token if needed immediately after register
    // For now, we assume the caller (auth-store) will handle login separately
    console.log("[authApi.register] Registration successful, backend returned token.");
    // No explicit return needed as function is Promise<void>
  },

  async logout(): Promise<void> {
    console.log("[authApi.logout] Calling POST /auth/logout");
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
      tokenService.clearTokens();
      throw error;
    }
    tokenService.clearTokens();
  },

  async getCurrentUser(): Promise<User> {
    let handledAs401 = false; // Flag to track if 401 logic ran
    console.log("[authApi.getCurrentUser] Calling GET /auth/me (Attempt 1)");
    try {
      const response = await apiClient.get('/auth/me');
      console.log("[authApi.getCurrentUser] Received data from /auth/me:", response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching current user:', error);

      if (error instanceof AxiosError && error.response?.status === 401) {
        handledAs401 = true; // Mark that we entered the 401 handling path
        try {
          const refreshResult = await tokenService.startTokenRefresh();
          if (refreshResult) {
            // Retry success: Return data and exit function
            console.log("[authApi.getCurrentUser] Calling GET /auth/me (Attempt 2 after refresh)");
            const retryResponse = await apiClient.get('/auth/me');
            console.log("[authApi.getCurrentUser] Received data from /auth/me on retry:", retryResponse.data);
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
    console.log("[authApi.updateProfile] Calling PATCH /api/users/me with data:", data);
    try {
      const response = await apiClient.patch('/api/users/me', data);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    console.log("[authApi.changePassword] Calling POST /auth/change-password");
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
    console.log("[authApi.getUserStatistics] Calling GET /auth/statistics");
    try {
      const response = await apiClient.get('/auth/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      throw error;
    }
  },

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    console.log("[authApi.getNotificationPreferences] Calling GET /auth/notification-preferences");
    try {
      const response = await apiClient.get('/auth/notification-preferences');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  },

  async updateNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
    console.log("[authApi.updateNotificationPreferences] Calling PUT /auth/notification-preferences with data:", preferences);
    try {
      await apiClient.put('/auth/notification-preferences', preferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  },

  async exportUserData(): Promise<Blob> {
    console.log("[authApi.exportUserData] Calling GET /auth/export");
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
    console.log("[authApi.deleteAccount] Calling DELETE /auth/account");
    try {
      await apiClient.delete('/auth/account');
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }
};

export default authApi;