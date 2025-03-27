import { screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/lib/store/auth-store';
import { renderWithAuth } from '@/lib/utils/test-utils';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

const TestComponent = () => {
  const { isAuthenticated, user } = useAuthContext();
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
  });

  it('should provide authentication state to children', async () => {
    renderWithAuth(<TestComponent />, {
      authOptions: {
        isAuthenticated: true,
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          createdAt: '2024-03-20T00:00:00Z',
          updatedAt: '2024-03-20T00:00:00Z',
          isActive: true,
          role: 'user'
        }
      }
    });

    expect(screen.getByText('Authenticated')).toBeInTheDocument();
    expect(screen.getByText('User: testuser')).toBeInTheDocument();
  });

  it('should handle unauthenticated state', () => {
    renderWithAuth(<TestComponent />, {
      authOptions: {
        isAuthenticated: false,
        user: null
      }
    });

    expect(screen.getByText('Not Authenticated')).toBeInTheDocument();
    expect(screen.queryByText(/User:/)).not.toBeInTheDocument();
  });

  it('should handle loading state', () => {
    renderWithAuth(<TestComponent />, {
      authOptions: {
        loginBehavior: 'loading'
      }
    });

    expect(screen.getByText('Not Authenticated')).toBeInTheDocument();
  });

  it('should handle error state', () => {
    const errorMessage = 'Authentication failed';
    renderWithAuth(<TestComponent />, {
      authOptions: {
        loginBehavior: 'error',
        error: errorMessage
      }
    });

    expect(screen.getByText('Not Authenticated')).toBeInTheDocument();
  });
});