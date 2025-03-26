import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { expect } from '@jest/globals';
import AuthGuard from '@/components/auth/auth-guard';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter, usePathname } from 'next/navigation';

// Mock the auth store
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock LoadingScreen component
jest.mock('@/components/ui/feedback/loading-screen', () => ({
  LoadingScreen: () => <div data-testid="loading-screen">Loading Screen</div>,
}));

describe('AuthGuard Component', () => {
  const pushMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: pushMock,
    });
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
  });

  it('should render loading screen when authentication is loading', () => {
    // Mock the auth store state
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    } as any);

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Check if loading screen is rendered
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when user is authenticated', () => {
    // Mock the auth store state
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as any);

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Check if children are rendered
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', () => {
    // Mock the auth store state
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    } as any);

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Check if redirect was called
    expect(pushMock).toHaveBeenCalledWith('/auth/login?callbackUrl=%2Fdashboard');

    // Check that children are not rendered
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});