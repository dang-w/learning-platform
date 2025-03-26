import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/lib/providers/auth-provider';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { tokenService } from '@/lib/services/token-service';
import { expect } from '@jest/globals';

// Define a type for the user object
interface User {
  id: string;
  name: string;
  email?: string;
}

// Define a type for the auth store return value
interface PartialAuthState {
  isAuthenticated: boolean;
  isLoading?: boolean;
  user: User | null;
  token: string | null;
  error?: string | null;
  fetchUser: jest.Mock;
  refreshAuthToken: jest.Mock;
  setDirectAuthState?: jest.Mock;
  logout?: jest.Mock;
}

// Mock localStorage
beforeEach(() => {
  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
});

// Mock tokenService
jest.mock('@/lib/services/token-service', () => ({
  tokenService: {
    getToken: jest.fn(),
    getRefreshToken: jest.fn(),
    setTokens: jest.fn(),
    clearTokens: jest.fn(),
    isTokenExpired: jest.fn(),
    onTokenChange: jest.fn()
  }
}));

// Mock the auth store
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

// Mock the API module
jest.mock('@/lib/api/auth');

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe('AuthProvider', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  const mockSearchParams = {
    get: jest.fn(),
  };

  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks for navigation
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/');
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

    // Default mock for token service
    (tokenService.getToken as jest.Mock).mockReturnValue(null);
    (tokenService.isTokenExpired as jest.Mock).mockReturnValue(false);
    (tokenService.onTokenChange as jest.Mock).mockImplementation(() => () => {});
  });

  describe('Initialization', () => {
    it('should initialize auth state correctly with valid token', async () => {
      const mockToken = 'Bearer valid-token';
      (tokenService.getToken as jest.Mock).mockReturnValue(mockToken);
      (tokenService.isTokenExpired as jest.Mock).mockReturnValue(false);

      const mockInitializeFromStorage = jest.fn().mockResolvedValue(undefined);
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        initializeFromStorage: mockInitializeFromStorage,
      });

      render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockInitializeFromStorage).toHaveBeenCalled();
      });
    });

    it('should handle expired token during initialization', async () => {
      const mockToken = 'Bearer expired-token';
      (tokenService.getToken as jest.Mock).mockReturnValue(mockToken);
      (tokenService.isTokenExpired as jest.Mock).mockReturnValue(true);

      const mockLogout = jest.fn();
      const mockRefreshAuthToken = jest.fn().mockResolvedValue(false);

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        logout: mockLogout,
        refreshAuthToken: mockRefreshAuthToken
      });

      render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockRefreshAuthToken).toHaveBeenCalled();
        expect(tokenService.clearTokens).toHaveBeenCalled();
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should skip initialization on auth pages', async () => {
      (usePathname as jest.Mock).mockReturnValue('/auth/login');
      const mockInitializeFromStorage = jest.fn();

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        initializeFromStorage: mockInitializeFromStorage,
      });

      render(
        <AuthProvider>
          <div>Login Page</div>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockInitializeFromStorage).not.toHaveBeenCalled();
      });
    });
  });

  describe('Route Protection', () => {
    it('should redirect to login for protected routes when not authenticated', async () => {
      (usePathname as jest.Mock).mockReturnValue('/dashboard');
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });

      render(
        <AuthProvider>
          <div>Dashboard</div>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          '/auth/login?callbackUrl=%2Fdashboard'
        );
      });
    });

    it('should allow access to protected routes when authenticated', async () => {
      (usePathname as jest.Mock).mockReturnValue('/dashboard');
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Test User' },
        error: null,
      });

      render(
        <AuthProvider>
          <div data-testid="dashboard">Dashboard</div>
        </AuthProvider>
      );

      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('should redirect authenticated users away from auth pages', async () => {
      (usePathname as jest.Mock).mockReturnValue('/auth/login');
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Test User' },
        error: null,
      });

      render(
        <AuthProvider>
          <div>Login Page</div>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should respect callback URLs in login redirects', async () => {
      (usePathname as jest.Mock).mockReturnValue('/auth/login');
      mockSearchParams.get.mockReturnValue('/custom-page');
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Test User' },
        error: null,
      });

      render(
        <AuthProvider>
          <div>Login Page</div>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/custom-page');
      });
    });
  });

  describe('Token Change Handling', () => {
    it('should handle token removal by logging out', async () => {
      const mockLogout = jest.fn();
      let tokenChangeCallback: (token: string | null) => void;

      (tokenService.onTokenChange as jest.Mock).mockImplementation((callback) => {
        tokenChangeCallback = callback;
        return () => {};
      });

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Test User' },
        error: null,
        logout: mockLogout,
      });

      render(
        <AuthProvider>
          <div>Protected Content</div>
        </AuthProvider>
      );

      // Simulate token removal
      tokenChangeCallback!(null);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should not trigger logout on auth pages when token is removed', async () => {
      (usePathname as jest.Mock).mockReturnValue('/auth/login');
      const mockLogout = jest.fn();
      let tokenChangeCallback: (token: string | null) => void;

      (tokenService.onTokenChange as jest.Mock).mockImplementation((callback) => {
        tokenChangeCallback = callback;
        return () => {};
      });

      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        logout: mockLogout,
      });

      render(
        <AuthProvider>
          <div>Login Page</div>
        </AuthProvider>
      );

      // Simulate token removal
      tokenChangeCallback!(null);

      await waitFor(() => {
        expect(mockLogout).not.toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading screen during initialization', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
      });

      render(
        <AuthProvider>
          <div>Content</div>
        </AuthProvider>
      );

      expect(screen.getByText(/Initializing your session/i)).toBeInTheDocument();
    });

    it('should show children after initialization', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Test User' },
        error: null,
      });

      render(
        <AuthProvider>
          <div data-testid="content">Content</div>
        </AuthProvider>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });
});