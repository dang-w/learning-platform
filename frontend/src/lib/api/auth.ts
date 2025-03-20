import apiClient, { withBackoff } from './client';
import { AxiosError } from 'axios';

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
  username: string;
  email: string;
  full_name: string;
  disabled: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
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
      const response = await withBackoff(() =>
        apiClient.post<AuthResponse>('/token', formData, {
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
          const sessionResponse = await apiClient.post('/sessions/');
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
        throw new Error('Invalid username or password. Please try again.');
      } else if (axiosError.response?.data?.detail) {
        throw new Error(`Authentication failed: ${axiosError.response.data.detail}`);
      } else {
        throw new Error('Authentication failed. Please try again later.');
      }
    }
  },

  register: async (data: RegisterData): Promise<User> => {
    try {
      const response = await apiClient.post<User>('/users/', data);
      return response.data;
    } catch (error) {
      console.error('Registration API error:', error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 400 && axiosError.response?.data) {
        // Extract validation error details
        const details = axiosError.response.data;
        if (details.username) throw new Error(`Username: ${details.username}`);
        if (details.email) throw new Error(`Email: ${details.email}`);
        if (details.password) throw new Error(`Password: ${details.password}`);
        if (details.detail) throw new Error(details.detail);
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

      // Make a direct request to the backend
      const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/users/me/`, {
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

      const response = await apiClient.post<AuthResponse>('/token/refresh', {
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

      // Call the backend logout endpoint to invalidate the token and session
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
};

export default authApi;