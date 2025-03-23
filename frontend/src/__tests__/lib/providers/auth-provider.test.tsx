import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/lib/providers/auth-provider';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
  });

  it('renders children correctly', () => {
    // Mock auth store with authenticated state
    const mockRefreshAuthToken = jest.fn().mockResolvedValue(true);
    const mockFetchUser = jest.fn().mockResolvedValue(undefined);

    // Mock localStorage to return a token
    (window.localStorage.getItem as jest.Mock).mockReturnValue('valid-token');

    // Mock auth store with authenticated state
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', name: 'Test User' },
      token: 'valid-token',
      error: null,
      fetchUser: mockFetchUser,
      refreshAuthToken: mockRefreshAuthToken,
    } as PartialAuthState);

    // Render the component with children
    render(
      <AuthProvider>
        <div data-testid="child">Protected Content</div>
      </AuthProvider>
    );

    // Children should be rendered
    const childElement = screen.getByTestId('child');
    expect(childElement).toBeDefined();
  });

  it('should render children after auth initialization', async () => {
    // Mock successful token refresh
    const mockRefreshAuthToken = jest.fn().mockResolvedValue(true);
    const mockFetchUser = jest.fn().mockResolvedValue(undefined);

    // Mock localStorage to return a token
    (window.localStorage.getItem as jest.Mock).mockReturnValue('valid-token');

    // Mock auth store with authenticated state
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', name: 'Test User' },
      token: 'valid-token',
      error: null,
      fetchUser: mockFetchUser,
      refreshAuthToken: mockRefreshAuthToken,
    } as PartialAuthState);

    render(
      <AuthProvider>
        <div data-testid="child">Protected Content</div>
      </AuthProvider>
    );

    // Content should be rendered after initialization
    const childElement = await screen.findByTestId('child');
    expect(childElement).toBeDefined();
  });

  it('should redirect to login for protected routes when not authenticated', () => {
    // Mock unauthenticated state
    const mockRefreshAuthToken = jest.fn().mockResolvedValue(false);
    const mockFetchUser = jest.fn().mockResolvedValue(undefined);
    const mockLogout = jest.fn();

    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: false,
      user: null,
      token: null,
      error: null,
      fetchUser: mockFetchUser,
      refreshAuthToken: mockRefreshAuthToken,
      logout: mockLogout,
    } as PartialAuthState);

    // Mock pathname to be a protected route
    (usePathname as jest.Mock).mockReturnValue('/dashboard');

    render(
      <AuthProvider>
        <div>Dashboard Content</div>
      </AuthProvider>
    );

    // Should redirect to login
    expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?callbackUrl=%2Fdashboard');
  });

  it('should redirect to dashboard for auth routes when authenticated', async () => {
    // Mock authenticated state
    const mockRefreshAuthToken = jest.fn().mockResolvedValue(true);
    const mockFetchUser = jest.fn().mockResolvedValue(undefined);

    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', name: 'Test User' },
      token: 'valid-token',
      error: null,
      fetchUser: mockFetchUser,
      refreshAuthToken: mockRefreshAuthToken,
    } as PartialAuthState);

    // Mock pathname to be an auth route
    (usePathname as jest.Mock).mockReturnValue('/auth/login');

    // Mock setTimeout to execute immediately
    jest.useFakeTimers();

    render(
      <AuthProvider>
        <div>Login Content</div>
      </AuthProvider>
    );

    // Run any pending timers
    jest.runAllTimers();

    // Should redirect to dashboard
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');

    // Restore timers
    jest.useRealTimers();
  });

  it('should fetch user data when token exists', async () => {
    const mockRefreshAuthToken = jest.fn().mockResolvedValue(true);
    const mockFetchUser = jest.fn().mockResolvedValue(undefined);
    const mockSetDirectAuthState = jest.fn();

    // Mock localStorage to return a token
    (window.localStorage.getItem as jest.Mock).mockReturnValue('valid-token');

    // Mock auth state
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      user: null,
      token: null, // No token in state yet
      isAuthenticated: false,
      fetchUser: mockFetchUser,
      refreshAuthToken: mockRefreshAuthToken,
      setDirectAuthState: mockSetDirectAuthState,
    } as PartialAuthState);

    render(
      <AuthProvider>
        <div>Child Component</div>
      </AuthProvider>
    );

    // When token exists in localStorage but not in state, AuthProvider should set it
    await waitFor(() => {
      expect(mockSetDirectAuthState).toHaveBeenCalled();
    });
  });

  it('should handle auth initialization error gracefully', async () => {
    // Mock console.error
    const originalConsoleError = console.error;
    console.error = jest.fn();

    // Mock localStorage to return a token
    (window.localStorage.getItem as jest.Mock).mockReturnValue('valid-token');

    // Mock failed token refresh with error
    const mockFetchUser = jest.fn().mockImplementation(() => {
      throw new Error('Failed to fetch user');
    });
    const mockRefreshAuthToken = jest.fn().mockRejectedValue(new Error('Failed to refresh token'));
    const mockSetDirectAuthState = jest.fn();
    const mockLogout = jest.fn();

    // Mock auth store
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: false,
      user: null,
      token: null,
      error: null,
      fetchUser: mockFetchUser,
      refreshAuthToken: mockRefreshAuthToken,
      setDirectAuthState: mockSetDirectAuthState,
      logout: mockLogout,
    } as PartialAuthState);

    render(
      <AuthProvider>
        <div>Content</div>
      </AuthProvider>
    );

    // Should handle error and still render content
    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
      const contentElement = screen.getByText('Content');
      expect(contentElement).toBeDefined();
    });

    // Restore console.error
    console.error = originalConsoleError;
  });
});