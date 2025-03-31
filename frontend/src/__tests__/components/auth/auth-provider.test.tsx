import { screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { renderWithProviders } from '@/lib/utils/test-utils';
import { expect } from '@jest/globals';
import type { User } from '@/lib/api/auth';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

const TestComponent = () => {
  const { isAuthenticated, user } = useAuthStore();
  return (
    <div>
      {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      {user && <div>User: {user.username}</div>}
    </div>
  );
};

describe('AuthProvider', () => {
  const mockRouter = {
    push: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    useAuthStore.getState().reset();
  });

  it('should provide authentication state to children', async () => {
    const mockUser: User = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: '2024-03-20T00:00:00Z',
      updatedAt: '2024-03-20T00:00:00Z',
      isActive: true,
      role: 'user'
    };
    useAuthStore.setState({ isAuthenticated: true, user: mockUser });

    renderWithProviders(<TestComponent />);

    expect(screen.getByText('Authenticated')).toBeInTheDocument();
    expect(screen.getByText('User: testuser')).toBeInTheDocument();
  });

  it('should handle unauthenticated state', () => {
    renderWithProviders(<TestComponent />);

    expect(screen.getByText('Not Authenticated')).toBeInTheDocument();
    expect(screen.queryByText(/User:/)).not.toBeInTheDocument();
  });

  it('should handle loading state', () => {
    useAuthStore.setState({ isLoading: true });
    renderWithProviders(<TestComponent />);

    expect(screen.getByText('Not Authenticated')).toBeInTheDocument();
  });

  it('should handle error state', () => {
    const errorMessage = 'Authentication failed';
    useAuthStore.setState({ error: errorMessage });
    renderWithProviders(<TestComponent />);

    expect(screen.getByText('Not Authenticated')).toBeInTheDocument();
  });
});