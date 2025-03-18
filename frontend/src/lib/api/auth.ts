import apiClient from './client';

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

const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await apiClient.post<AuthResponse>('/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Store tokens in localStorage
    if (response.data.access_token && response.data.refresh_token && typeof window !== 'undefined') {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('refreshToken', response.data.refresh_token);
    }

    return response.data;
  },

  register: async (data: RegisterData): Promise<User> => {
    const response = await apiClient.post<User>('/users/', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/me/');
    return response.data;
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
      // Call the backend logout endpoint to invalidate the token
      await apiClient.post('/logout');
    } catch (error) {
      // Only log in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error('Logout API error:', error);
      }
    }

    // Remove tokens from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.put<User>('/users/me/', data);
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/users/me/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },
};

export default authApi;