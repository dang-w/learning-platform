import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authApi, { User } from '../api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          const response = await authApi.login({ username, password });

          set({
            token: response.access_token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Fetch user data
          await get().fetchUser();
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to login',
            isAuthenticated: false,
            token: null,
            user: null,
          });
          throw error;
        }
      },

      register: async (username: string, email: string, password: string, fullName: string) => {
        try {
          set({ isLoading: true, error: null });

          await authApi.register({
            username,
            email,
            password,
            full_name: fullName,
          });

          // Auto login after registration
          await get().login(username, password);
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to register',
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });

          await authApi.logout();

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Failed to logout',
          });
          throw error;
        }
      },

      fetchUser: async () => {
        try {
          set({ isLoading: true });

          const user = await authApi.getCurrentUser();

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: 'Failed to fetch user',
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      refreshToken: async () => {
        try {
          const response = await authApi.refreshToken();

          if (response) {
            set({
              token: response.access_token,
              isAuthenticated: true,
            });
            return true;
          }

          return false;
        } catch {
          set({
            isAuthenticated: false,
            token: null,
            user: null,
          });
          return false;
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
            error: 'Failed to update profile',
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
            error: 'Failed to change password',
          });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);