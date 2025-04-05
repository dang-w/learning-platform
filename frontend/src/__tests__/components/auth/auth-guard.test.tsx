import { screen, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth/auth-guard';
import { renderWithProviders } from '@/lib/utils/test-utils';
import { useAuthStore } from '@/lib/store/auth-store';

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
    useAuthStore.getState().reset();
  });

  it('should show loading screen while checking auth', () => {
    useAuthStore.setState({ isLoading: true, isAuthenticated: false });

    renderWithProviders(<AuthGuard>Protected Content</AuthGuard>);

    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
  });

  it('should render children when authenticated', async () => {
    renderWithProviders(<AuthGuard>Protected Content</AuthGuard>);

    act(() => {
      useAuthStore.setState({
        isLoading: false,
        isAuthenticated: true,
        isDashboardReady: true
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', async () => {
    useAuthStore.setState({ isLoading: false, isAuthenticated: false });

    renderWithProviders(<AuthGuard>Protected Content</AuthGuard>);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

    useAuthStore.setState({ isLoading: false, isAuthenticated: false });

    const { rerender } = renderWithProviders(<AuthGuard>Protected Content</AuthGuard>);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('should handle auth state changes', async () => {
    renderWithProviders(<AuthGuard>Protected Content</AuthGuard>);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });
  });
});