import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthGuard from '@/components/auth/auth-guard';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter, usePathname } from 'next/navigation';

// Define a partial auth store type for testing
interface PartialAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Mock the auth store
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
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

  it('should render loading spinner when authentication is loading', () => {
    // Mock the auth store state
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    } as PartialAuthState);

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Check if loading spinner is rendered
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when user is authenticated', () => {
    // Mock the auth store state
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as PartialAuthState);

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Check if children are rendered
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', () => {
    // Mock the auth store state
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    } as PartialAuthState);

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