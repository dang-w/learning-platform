import apiClient, { withBackoff } from './client';
import { AxiosError } from 'axios';
import axios from 'axios';
import { API_URL, BACKEND_API_URL } from '@/config';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
}

export interface UserStatistics {
  totalCoursesEnrolled: number;
  completedCourses: number;
  averageScore: number;
  totalTimeSpent: number;
  lastActive: string;
  achievementsCount: number;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  courseUpdates: boolean;
  newMessages: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
}

// Extended API error interface
interface ApiErrorResponse {
  detail?: string;
  username?: string[];
  email?: string[];
  password?: string[];
}

const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    try {
      // Make direct request to the backend auth token endpoint
      const response = await withBackoff(() =>
        axios.post<AuthResponse>(`${BACKEND_API_URL}/auth/token`, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      // Store tokens in localStorage
      if (response.data.access_token && response.data.refresh_token && typeof window !== 'undefined') {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('refreshToken', response.data.refresh_token);

        // Create a session for this login
        try {
          // Use direct backend URL for session creation too
          const sessionResponse = await axios.post(`${BACKEND_API_URL}/sessions/`, {}, {
            headers: {
              'Authorization': `Bearer ${response.data.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (sessionResponse.data && sessionResponse.data.session_id) {
            localStorage.setItem('sessionId', sessionResponse.data.session_id);
          }
        } catch (sessionError) {
          console.warn('Failed to create session:', sessionError);
          // Don't fail the login process if session creation fails
        }
      } else if (!response.data.access_token) {
        console.error('Login response missing access_token', response.data);
        throw new Error('Authentication failed: Invalid server response');
      }

      return response.data;
    } catch (error) {
      console.error('Login API error:', error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 401) {
        // Check if this is a "user not found" error after registration
        if (axiosError.response?.data?.detail?.includes('user not found')) {
          throw new Error('Account created. Please wait a moment and try logging in again.');
        }
        throw new Error('Invalid username or password. Please try again.');
      } else if (axiosError.response?.data?.detail) {
        // Check if this is a "user not found" error after registration
        if (axiosError.response.data.detail.includes('user not found')) {
          throw new Error('Account created. Please wait a moment and try logging in again.');
        }
        throw new Error(`Authentication failed: ${axiosError.response.data.detail}`);
      } else {
        throw new Error('Authentication failed. Please try again later.');
      }
    }
  },

  register: async (data: RegisterData): Promise<User> => {
    try {
      // Make direct request to the backend users endpoint
      const response = await axios.post<User>(`${BACKEND_API_URL}/users/`, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Registration API error:', error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      // More detailed logging to help debug registration issues
      if (axiosError.response) {
        console.log('Registration error response:', {
          status: axiosError.response.status,
          data: axiosError.response.data,
        });
      }

      if (axiosError.response?.status === 400 && axiosError.response?.data) {
        // Extract validation error details
        const details = axiosError.response.data;

        // Check for specific error messages
        if (details.detail) {
          if (typeof details.detail === 'string') {
            if (details.detail.includes("Username already registered")) {
              throw new Error(`Username is already taken. Please choose another username.`);
            }
            if (details.detail.includes("Email already registered")) {
              throw new Error(`Email is already registered. Please use another email address.`);
            }
            if (details.detail.includes("Password too weak")) {
              throw new Error(`Password is too weak. It must include uppercase, lowercase, number, and special character.`);
            }

            // If it's another known error, return it directly
            throw new Error(details.detail);
          }
        }

        // Generic error handling for field-specific errors
        if (details.username && Array.isArray(details.username)) throw new Error(`Username: ${details.username[0]}`);
        if (details.email && Array.isArray(details.email)) throw new Error(`Email: ${details.email[0]}`);
        if (details.password && Array.isArray(details.password)) throw new Error(`Password: ${details.password[0]}`);
      }

      throw new Error('Registration failed. Please try again later.');
    }
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      // Create a custom request directly to the backend
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Make a direct request to the backend - use path without trailing slash to avoid 307 redirects
      const response = await fetch(`${BACKEND_API_URL}/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your session has expired. Please login again.');
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to get user information');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get current user API error:', error);
      throw error instanceof Error ? error : new Error('Failed to get user information');
    }
  },

  refreshToken: async (): Promise<AuthResponse | null> => {
    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

      if (!refreshToken) {
        return null;
      }

      // Match the API path expected by tests - use a consistent path
      const response = await apiClient.post<AuthResponse>('/auth/token/refresh', {
        refresh_token: refreshToken
      });

      // Store tokens in localStorage
      if (response.data.access_token && response.data.refresh_token && typeof window !== 'undefined') {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('refreshToken', response.data.refresh_token);
      }

      return response.data;
    } catch (error) {
      // Only log in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to refresh token:', error);
      }
      return null;
    }
  },

  logout: async (): Promise<void> => {
    try {
      // Get session ID if available
      const sessionId = typeof window !== 'undefined' ? localStorage.getItem('sessionId') : null;
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      // Exit early if no token is available
      if (!token) {
        console.log('No token available for logout, skipping API call');
        return;
      }

      // Use API client for consistency with tests
      if (sessionId) {
        await apiClient.post('/auth/logout', {}, {
          headers: {
            'x-session-id': sessionId
          }
        });
      } else {
        await apiClient.post('/auth/logout');
      }
    } catch (error) {
      // Only log in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error('Logout API error:', error);
      }
      // Don't throw error to allow logout to complete even if API call fails
    }

    // Remove tokens and session from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('sessionId');
    }
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    try {
      const response = await apiClient.put<User>('/users/me/', data);
      return response.data;
    } catch (error) {
      console.error('Update profile API error:', error);
      throw new Error('Failed to update profile. Please try again later.');
    }
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    try {
      await apiClient.post('/users/me/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
    } catch (error) {
      console.error('Change password API error:', error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 400 && axiosError.response?.data?.detail) {
        throw new Error(axiosError.response.data.detail);
      }

      throw new Error('Failed to change password. Please try again later.');
    }
  },

  updateSessionActivity: async (): Promise<void> => {
    try {
      const sessionId = typeof window !== 'undefined' ? localStorage.getItem('sessionId') : null;

      if (sessionId) {
        await apiClient.put(`/sessions/${sessionId}/activity`);
      }
    } catch (error) {
      // Just log a warning but don't make this a critical operation
      console.warn('Failed to update session activity:', error);
    }
  },

  getUserStatistics: async (): Promise<UserStatistics> => {
    const response = await axios.get(`${API_URL}/auth/statistics`, {
      withCredentials: true,
    });
    return response.data;
  },

  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    const response = await axios.get(`${API_URL}/auth/notification-preferences`, {
      withCredentials: true,
    });
    return response.data;
  },

  updateNotificationPreferences: async (preferences: NotificationPreferences): Promise<NotificationPreferences> => {
    const response = await axios.put(
      `${API_URL}/auth/notification-preferences`,
      preferences,
      {
        withCredentials: true,
      }
    );
    return response.data;
  },

  exportUserData: async (): Promise<Blob> => {
    const response = await axios.get(`${API_URL}/auth/export-data`, {
      withCredentials: true,
      responseType: 'blob',
    });
    return response.data;
  },

  deleteAccount: async (): Promise<void> => {
    await axios.delete(`${API_URL}/auth/account`, {
      withCredentials: true,
    });
  },
};

export default authApi;