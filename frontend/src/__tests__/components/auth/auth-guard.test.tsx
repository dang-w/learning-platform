import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthGuard from '@/components/auth/auth-guard';
import { useAuthStore } from '@/lib/store/auth-store';

// Define a partial auth store type for testing
interface PartialAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Mock the auth store
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

describe('AuthGuard Component', () => {
  const mockUseRouter = jest.requireMock('next/navigation').useRouter;

  beforeEach(() => {
    jest.clearAllMocks();
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

    const pushMock = jest.fn();
    mockUseRouter.mockReturnValue({
      push: pushMock,
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Check if redirect was called
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('/auth/login?callbackUrl='));

    // Check that children are not rendered
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});