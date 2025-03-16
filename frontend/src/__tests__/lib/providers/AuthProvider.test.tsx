import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/lib/providers/auth-provider';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter, usePathname } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/api/auth');
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

describe('AuthProvider', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockAuthStore = {
    isAuthenticated: false,
    fetchUser: jest.fn().mockResolvedValue(undefined),
    refreshToken: jest.fn().mockResolvedValue(false),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/');
    (useAuthStore as unknown as jest.Mock).mockReturnValue(mockAuthStore);
  });

  it('renders children when loaded', async () => {
    render(
      <AuthProvider>
        <div data-testid="child-component">Child Component</div>
      </AuthProvider>
    );

    // Wait for auth initialization to complete
    await waitFor(() => {
      expect(screen.getByTestId('child-component')).toBeInTheDocument();
    });

    expect(mockAuthStore.refreshToken).toHaveBeenCalled();
  });

  it('shows loading state initially', () => {
    // Mock implementation to delay resolution
    mockAuthStore.refreshToken.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(false), 100)));

    render(
      <AuthProvider>
        <div data-testid="child-component">Child Component</div>
      </AuthProvider>
    );

    // Should show loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('redirects to login for protected routes when not authenticated', async () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    mockAuthStore.isAuthenticated = false;

    render(
      <AuthProvider>
        <div>Protected Content</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?callbackUrl=%2Fdashboard');
    });
  });

  it('redirects to dashboard for auth routes when authenticated', async () => {
    (usePathname as jest.Mock).mockReturnValue('/auth/login');
    mockAuthStore.isAuthenticated = true;

    render(
      <AuthProvider>
        <div>Login Page</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('fetches user data when token refresh is successful', async () => {
    mockAuthStore.refreshToken.mockResolvedValue(true);

    render(
      <AuthProvider>
        <div>Content</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockAuthStore.fetchUser).toHaveBeenCalled();
    });
  });
});