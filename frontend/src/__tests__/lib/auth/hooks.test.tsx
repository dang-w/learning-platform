import { renderHook } from '@testing-library/react';
import { useAuth, useCurrentUser, AuthContext } from '@/lib/auth/hooks';
import { expect, jest } from '@jest/globals';
import React from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

interface AuthContextType {
  isInitialized: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  user: User | null;
}

interface MockStoreState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Create a mock store module
const mockStore = {
  getState: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false
  }),
  setState: (newState: Partial<MockStoreState>) => {
    Object.assign(mockStore.getState(), newState);
  }
};

// Mock useAuthStore implementation
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: () => mockStore.getState()
}));

describe('Auth Hooks', () => {
  beforeEach(() => {
    jest.resetModules();
    mockStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
  });

  describe('useAuth', () => {
    it('should throw error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });

    it('should return auth context values when used within AuthProvider', () => {
      const mockUser: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        createdAt: new Date().toISOString()
      };

      const mockAuthContext: AuthContextType = {
        isInitialized: true,
        isLoading: false,
        isAuthenticated: true,
        error: null,
        user: mockUser
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthContext.Provider value={mockAuthContext}>
          {children}
        </AuthContext.Provider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current).toEqual(mockAuthContext);
    });

    it('should reflect auth context updates', () => {
      const mockUser: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        createdAt: new Date().toISOString()
      };

      const initialContext: AuthContextType = {
        isInitialized: true,
        isLoading: true,
        isAuthenticated: false,
        error: null,
        user: null
      };

      const updatedContext: AuthContextType = {
        isInitialized: true,
        isLoading: false,
        isAuthenticated: true,
        error: null,
        user: mockUser
      };

      let contextValue = initialContext;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthContext.Provider value={contextValue}>
          {children}
        </AuthContext.Provider>
      );

      const { result, rerender } = renderHook(() => useAuth(), { wrapper });
      expect(result.current).toEqual(initialContext);

      contextValue = updatedContext;
      rerender();
      expect(result.current).toEqual(updatedContext);
    });
  });

  describe('useCurrentUser', () => {
    it('should return user data from auth store', () => {
      const mockUser: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        createdAt: new Date().toISOString()
      };

      mockStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false
      });

      const { result } = renderHook(() => useCurrentUser());
      expect(result.current).toEqual(mockStore.getState());
    });

    it('should handle unauthenticated state', () => {
      mockStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });

      const { result } = renderHook(() => useCurrentUser());
      expect(result.current).toEqual(mockStore.getState());
    });

    it('should handle loading state', () => {
      mockStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: true
      });

      const { result } = renderHook(() => useCurrentUser());
      expect(result.current).toEqual(mockStore.getState());
    });

    it('should reflect auth store updates', () => {
      const mockUser: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        createdAt: new Date().toISOString()
      };

      // Set initial state
      mockStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: true
      });

      const { result, rerender } = renderHook(() => useCurrentUser());
      expect(result.current).toEqual(mockStore.getState());

      // Update state
      mockStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false
      });

      rerender();
      expect(result.current).toEqual(mockStore.getState());
    });
  });
});