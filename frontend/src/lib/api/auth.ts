import axios from 'axios';
import { API_URL, BACKEND_API_URL } from '../config';

// Helper function to format token
function formatToken(token: string): string {
  if (!token) return '';
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
}

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

  // If token exists and is valid, include it in headers
  if (token && token.length > 20) {
    // Format token if needed
    const formattedToken = formatToken(token);

    // Update localStorage with formatted token if needed
    if (token !== formattedToken) {
      localStorage.setItem('token', formattedToken);
    }

    return {
      'Authorization': formattedToken,
      'Content-Type': 'application/json'
    };
  }

  // If token is not in localStorage, check cookies as fallback
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));

  if (tokenCookie) {
    const cookieToken = decodeURIComponent(tokenCookie.split('=')[1]);
    if (cookieToken && cookieToken.length > 20) {
      // Format and store token
      const formattedToken = formatToken(cookieToken);

      // Sync to localStorage for future use
      localStorage.setItem('token', formattedToken);

      return {
        'Authorization': formattedToken,
        'Content-Type': 'application/json'
      };
    }
  }

  return defaultHeaders;
}

// Helper function to clear auth state
export function clearAuthState() {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('token_expiry');
  localStorage.removeItem('sessionId');
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

// Helper function to redirect to login
export function redirectToLogin() {
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    const redirectUrl = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
    window.location.href = redirectUrl;
  }
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
  user: {
    id: number;
    username: string;
  };
  token: string;
  refresh_token: string;
  emailNotifications: boolean;
  courseUpdates: boolean;
  marketingEmails: boolean;
  totalCoursesEnrolled: number;
  completedCourses: number;
  averageScore: number;
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

// Synchronize token between localStorage and cookies with expiration
function syncToken(token: string | null): void {
  if (token) {
    // Ensure token has Bearer prefix
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    // Store in localStorage
    localStorage.setItem('token', formattedToken);

    // Set token expiration (1 hour from now)
    const expiryTime = Date.now() + 3600000;
    localStorage.setItem('token_expiry', expiryTime.toString());

    // Store in cookies
    if (typeof document !== 'undefined') {
      const expires = new Date(expiryTime);
      document.cookie = `token=${encodeURIComponent(formattedToken)}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    }
  } else {
    clearAuthState();
  }
}

export interface AuthAPI {
  login: (credentials: LoginCredentials) => Promise<{token: string, refreshToken?: string}>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<User>;
  refreshAuthToken: () => Promise<boolean>;
  updateSessionActivity: () => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<User>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  getUserStatistics: () => Promise<UserStatistics>;
  getNotificationPreferences: () => Promise<NotificationPreferences>;
  updateNotificationPreferences: (preferences: NotificationPreferences) => Promise<NotificationPreferences>;
  exportUserData: () => Promise<Blob>;
  deleteAccount: () => Promise<void>;
}

const authApi = {
  async login(credentials: LoginCredentials): Promise<{token: string, refreshToken?: string}> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        }),
        cache: 'no-store'
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Login failed:', error);
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();

      // Handle token from response
      const token = data.token;
      const refreshToken = data.refreshToken;

      if (!token) {
        console.error('No token in response:', data);
        throw new Error('Invalid login response - no token received');
      }

      // Format and store token
      const formattedToken = formatToken(token);
      localStorage.setItem('token', formattedToken);

      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }

      return {
        token: formattedToken,
        refreshToken
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
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
      clearAuthState();
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
      const error = await response.json().catch(() => ({ message: `Failed to get current user: ${response.status}` }));
      throw new Error(error.message);
    }

    return response.json();
  },

  async refreshAuthToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');

      const response = await fetch('/api/auth/token/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
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
    try {
      const headers = getAuthHeaders();

      // Try Next.js API route first
      try {
        const response = await fetch('/api/auth/statistics', {
          method: 'GET',
          headers,
          cache: 'no-store',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch statistics: ${response.status}`);
        }

        return await response.json();
      } catch (nextApiError) {
        console.log('Failed to fetch from Next.js API route:', nextApiError);

        // Fallback to direct backend call
        const backendResponse = await fetch(`${BACKEND_API_URL}/api/auth/statistics`, {
          method: 'GET',
          headers,
          cache: 'no-store',
          credentials: 'include'
        });

        if (!backendResponse.ok) {
          throw new Error(`Failed to fetch statistics from backend: ${backendResponse.status}`);
        }

        return await backendResponse.json();
      }
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      // Return default statistics on error
      return {
        totalCoursesEnrolled: 0,
        completedCourses: 0,
        averageScore: 0,
        totalTimeSpent: 0,
        lastActive: new Date().toISOString(),
        achievementsCount: 0
      };
    }
  },

  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    try {
      const headers = getAuthHeaders();

      // Try Next.js API route first
      try {
        const response = await fetch('/api/auth/notification-preferences', {
          method: 'GET',
          headers,
          cache: 'no-store',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch preferences: ${response.status}`);
        }

        return await response.json();
      } catch (nextApiError) {
        console.log('Failed to fetch from Next.js API route:', nextApiError);

        // Fallback to direct backend call
        const backendResponse = await fetch(`${BACKEND_API_URL}/api/auth/notification-preferences`, {
          method: 'GET',
          headers,
          cache: 'no-store',
          credentials: 'include'
        });

        if (!backendResponse.ok) {
          throw new Error(`Failed to fetch preferences from backend: ${backendResponse.status}`);
        }

        return await backendResponse.json();
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      // Return default preferences on error
      return {
        emailNotifications: true,
        courseUpdates: true,
        newMessages: true,
        marketingEmails: false,
        weeklyDigest: true
      };
    }
  },

  updateNotificationPreferences: async (preferences: NotificationPreferences): Promise<NotificationPreferences> => {
    try {
      const headers = getAuthHeaders();

      const response = await fetch('/api/auth/notification-preferences', {
        method: 'PUT',
        headers,
        body: JSON.stringify(preferences),
        cache: 'no-store',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to update preferences: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
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