import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/lib/providers/auth-provider';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter, usePathname } from 'next/navigation';

// Define a type for the user object
interface User {
  id: string;
  name: string;
  email?: string;
}

// Define a type for the auth store return value
interface MockAuthStore {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
  fetchUser: jest.Mock;
  refreshToken: jest.Mock;
  login: jest.Mock;
  logout: jest.Mock;
  register: jest.Mock;
  clearErrors: jest.Mock;
}

// Mock the auth store
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

describe('AuthProvider', () => {
  const fetchUser = jest.fn();
  const refreshToken = jest.fn();
  const login = jest.fn();
  const logout = jest.fn();
  const register = jest.fn();
  const clearErrors = jest.fn();
  const pushMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup router mock
    (useRouter as jest.Mock).mockReturnValue({
      push: pushMock,
    });

    // Default pathname
    (usePathname as jest.Mock).mockReturnValue('/');
  });

  it('should show loading spinner while initializing auth', () => {
    // Mock auth store with loading state
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: false,
      user: null,
      error: null,
      fetchUser,
      refreshToken,
      login,
      logout,
      register,
      clearErrors,
      isLoading: true,
    } as MockAuthStore);

    render(
      <AuthProvider>
        <div>Protected Content</div>
      </AuthProvider>
    );

    // Check if loading spinner is rendered
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');

    // Content should not be rendered yet
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children after auth initialization', async () => {
    // Mock successful token refresh
    refreshToken.mockResolvedValue(true);
    fetchUser.mockResolvedValue(undefined);

    // Mock auth store with authenticated state and not loading
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', name: 'Test User' },
      error: null,
      fetchUser,
      refreshToken,
      login,
      logout,
      register,
      clearErrors,
      isLoading: false,
    } as MockAuthStore);

    // Render with isLoading=false to skip the loading state
    const { rerender } = render(
      <AuthProvider>
        <div>Protected Content</div>
      </AuthProvider>
    );

    // Force a re-render to ensure the children are rendered
    rerender(
      <AuthProvider>
        <div>Protected Content</div>
      </AuthProvider>
    );

    // Content should be rendered now
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should redirect to login when accessing protected route while not authenticated', async () => {
    // Mock failed token refresh
    refreshToken.mockResolvedValue(false);

    // Mock auth store with unauthenticated state
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: false,
      user: null,
      error: null,
      fetchUser,
      refreshToken,
      login,
      logout,
      register,
      clearErrors,
      isLoading: false,
    } as MockAuthStore);

    // Mock protected route
    (usePathname as jest.Mock).mockReturnValue('/dashboard');

    render(
      <AuthProvider>
        <div>Dashboard Content</div>
      </AuthProvider>
    );

    // Should redirect to login
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/auth/login?callbackUrl=%2Fdashboard');
    });
  });

  it('should redirect to dashboard when accessing auth route while authenticated', async () => {
    // Mock successful token refresh
    refreshToken.mockResolvedValue(true);
    fetchUser.mockResolvedValue(undefined);

    // Mock auth store with authenticated state
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', name: 'Test User' },
      error: null,
      fetchUser,
      refreshToken,
      login,
      logout,
      register,
      clearErrors,
      isLoading: false,
    } as MockAuthStore);

    // Mock auth route
    (usePathname as jest.Mock).mockReturnValue('/auth/login');

    render(
      <AuthProvider>
        <div>Login Content</div>
      </AuthProvider>
    );

    // Should redirect to dashboard
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should initialize auth on mount', async () => {
    // Mock successful token refresh
    refreshToken.mockResolvedValue(true);
    fetchUser.mockResolvedValue(undefined);

    // Mock auth store
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: false,
      user: null,
      error: null,
      fetchUser,
      refreshToken,
      login,
      logout,
      register,
      clearErrors,
      isLoading: true,
    } as MockAuthStore);

    render(
      <AuthProvider>
        <div>Content</div>
      </AuthProvider>
    );

    // Should try to refresh token and fetch user
    expect(refreshToken).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(fetchUser).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle auth initialization error gracefully', async () => {
    // Mock failed token refresh with error
    refreshToken.mockRejectedValue(new Error('Failed to refresh token'));

    // Mock auth store
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: false,
      user: null,
      error: null,
      fetchUser,
      refreshToken,
      login,
      logout,
      register,
      clearErrors,
      isLoading: true,
    } as MockAuthStore);

    // Mock console.error
    const originalConsoleError = console.error;
    console.error = jest.fn();

    render(
      <AuthProvider>
        <div>Content</div>
      </AuthProvider>
    );

    // Should handle error and still finish loading
    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });

    // Restore console.error
    console.error = originalConsoleError;
  });
});