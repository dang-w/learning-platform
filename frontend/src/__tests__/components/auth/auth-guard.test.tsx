import { screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth/auth-guard';
import { renderWithProviders } from '@/lib/utils/test-utils';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn()
}));

describe('AuthGuard', () => {
  const mockRouter = {
    push: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('should show loading screen while checking auth', () => {
    renderWithProviders(<AuthGuard>Protected Content</AuthGuard>, {
      providerProps: {
        authOptions: {
          loginBehavior: 'loading',
          isAuthenticated: false
        }
      }
    });

    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
  });

  it('should render children when authenticated', () => {
    renderWithProviders(<AuthGuard>Protected Content</AuthGuard>, {
      providerProps: {
        authOptions: {
          loginBehavior: 'success',
          isAuthenticated: true
        }
      }
    });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', async () => {
    renderWithProviders(<AuthGuard>Protected Content</AuthGuard>, {
      providerProps: {
        authOptions: {
          loginBehavior: 'success',
          isAuthenticated: false
        }
      }
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should handle auth state changes', async () => {
    const { rerender } = renderWithProviders(<AuthGuard>Protected Content</AuthGuard>, {
      providerProps: {
        authOptions: {
          loginBehavior: 'success',
          isAuthenticated: false
        }
      }
    });

    rerender(
      <AuthGuard>Protected Content</AuthGuard>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });
  });
});