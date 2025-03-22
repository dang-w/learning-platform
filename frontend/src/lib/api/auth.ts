import axios from 'axios';
import { API_URL } from '@/config';

// Helper function to get auth headers for client-side requests
export function getAuthHeaders(): Record<string, string> {
  // Default headers
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  // Only execute localStorage operations on client side
  if (typeof window === 'undefined') {
    return defaultHeaders;
  }

  const token = localStorage.getItem('token');

  // If token exists, include it in headers
  if (token) {
    // Check if token looks valid (basic validation)
    if (token.length > 20) {
      console.log(`Using token from localStorage (prefix): ${token.substring(0, 10)}...`);

      // Update cookies to ensure consistency across the app
      document.cookie = `token=${token}; path=/; max-age=3600; SameSite=Lax`;

      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    } else {
      console.warn('Token found in localStorage but appears invalid');
    }
  } else {
    // If token is not in localStorage, check cookies as fallback
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));

    if (tokenCookie) {
      const cookieToken = tokenCookie.split('=')[1];
      if (cookieToken && cookieToken.length > 20) {
        console.log(`Using token from cookie (prefix): ${cookieToken.substring(0, 10)}...`);

        // Sync to localStorage for future use
        localStorage.setItem('token', cookieToken);

        return {
          'Authorization': `Bearer ${cookieToken}`,
          'Content-Type': 'application/json'
        };
      }
    }

    console.log('No valid token found in localStorage or cookies');
  }

  return defaultHeaders;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  email: string;
  firstName: string;
  lastName: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
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

// Synchronize token between localStorage and cookies
function syncToken(token: string | null): void {
  if (token) {
    localStorage.setItem('token', token);
    if (typeof document !== 'undefined') {
      document.cookie = `token=${token}; path=/; max-age=3600; SameSite=Lax`;
    }
  } else {
    localStorage.removeItem('token');
    if (typeof document !== 'undefined') {
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
  }
}

const authApi = {
  async login(credentials: LoginCredentials): Promise<{token: string, refreshToken?: string}> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials),
      cache: 'no-store'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    syncToken(data.token);
    return {
      token: data.token,
      refreshToken: data.refreshToken
    };
  },

  async register(data: RegisterData): Promise<void> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      cache: 'no-store'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const responseData = await response.json();
    syncToken(responseData.token);
  },

  async logout(): Promise<void> {
    const headers = getAuthHeaders();

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        cache: 'no-store'
      });

      if (!response.ok) {
        console.error('Logout API call failed:', await response.text());
      }
    } catch (error) {
      console.error('Error during logout API call:', error);
    } finally {
      // Always clear token state regardless of API response
      syncToken(null);
    }
  },

  async getCurrentUser(): Promise<User> {
    const headers = getAuthHeaders();

    const response = await fetch('/api/users/me', {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to get current user: ${response.status}`);
    }

    return response.json();
  },

  async refreshAuthToken(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/token/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: localStorage.getItem('refresh_token'),
        }),
        cache: 'no-store'
      });

      if (!response.ok) {
        console.error('Token refresh failed:', response.status);
        return false;
      }

      const data = await response.json();

      if (data.access_token || data.token) {
        const token = data.access_token || data.token;

        // Store tokens in localStorage
        localStorage.setItem('token', token);

        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }

        // Also set token in cookies for middleware
        if (typeof document !== 'undefined') {
          const tokenValue = token.replace(/^Bearer\s+/i, '');
          document.cookie = `token=${tokenValue}; path=/; max-age=3600; SameSite=Lax`;
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error refreshing token via API:', error);
      return false;
    }
  },

  async updateSessionActivity(): Promise<boolean> {
    try {
      const headers = getAuthHeaders();

      // Generate a stable session ID if we don't have one already
      let sessionId = localStorage.getItem('sessionId');

      if (!sessionId) {
        // We need to create a new session first
        console.log('No session ID exists, creating a new session');

        try {
          const response = await fetch('/api/sessions', {
            method: 'POST',
            headers,
            cache: 'no-store'
          });

          if (response.ok) {
            const sessionData = await response.json();
            sessionId = sessionData.session_id;
            if (sessionId) {
              localStorage.setItem('sessionId', sessionId);
              console.log(`Session created successfully with ID: ${sessionId}`);
            } else {
              console.error('Session ID is null in the response');
              return false;
            }
          } else {
            console.error('Failed to create session:', response.status);
            return false;
          }
        } catch (error) {
          console.error('Error creating session:', error);
          return false;
        }
      }

      if (!sessionId) {
        console.error('Could not create or retrieve a valid session ID');
        return false;
      }

      console.log(`Updating session activity for session: ${sessionId}`);
      console.log('Using headers:', headers);

      const response = await fetch(`/api/sessions/${sessionId}/activity`, {
        method: 'PUT',
        headers,
        cache: 'no-store'
      });

      if (!response.ok) {
        console.error('Failed to update session activity:', response.status);

        // If the session is not found (404), try to create a new one
        if (response.status === 404) {
          localStorage.removeItem('sessionId');
          // Retry once with a new session
          return await this.updateSessionActivity();
        }

        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating session activity:', error);
      return false;
    }
  },

  getUserStatistics: async (): Promise<UserStatistics> => {
    const response = await axios.get(`${API_URL}/api/auth/statistics`, {
      withCredentials: true,
    });
    return response.data;
  },

  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    const response = await axios.get(`${API_URL}/api/auth/notification-preferences`, {
      withCredentials: true,
    });
    return response.data;
  },

  updateNotificationPreferences: async (preferences: NotificationPreferences): Promise<NotificationPreferences> => {
    const response = await axios.put(
      `${API_URL}/api/auth/notification-preferences`,
      preferences,
      {
        withCredentials: true,
      }
    );
    return response.data;
  },

  exportUserData: async (): Promise<Blob> => {
    const response = await axios.get(`${API_URL}/api/auth/export-data`, {
      withCredentials: true,
      responseType: 'blob',
    });
    return response.data;
  },

  deleteAccount: async (): Promise<void> => {
    await axios.delete(`${API_URL}/api/auth/account`, {
      withCredentials: true,
    });
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const headers = getAuthHeaders();

    const response = await fetch('/api/users/me', {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      cache: 'no-store'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to update profile');
    }

    return response.json();
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const headers = getAuthHeaders();

    const response = await fetch('/api/users/me/change-password', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to change password');
    }
  },
};

export default authApi;