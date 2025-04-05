import { render, screen, waitFor } from '@testing-library/react';
import MainLayout from '@/components/layout/main-layout';
import { TestProviders } from '@/lib/utils/test-utils/test-providers/test-providers';
import { MockAuthStoreOptions } from '@/lib/utils/test-utils/auth-mocks';
import '@testing-library/jest-dom';
import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals';
import React from 'react';

// Mock router functions
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn()
};

// Mock token service with proper typing
const mockTokenService = {
  getToken: jest.fn<() => string | null>(),
  getMetadata: jest.fn<() => boolean>(),
  clearTokens: jest.fn(),
  shouldRefreshToken: jest.fn(),
  startTokenRefresh: jest.fn()
};

jest.mock('@/lib/services/token-service', () => ({
  tokenService: mockTokenService,
}));

const renderWithProviders = (ui: React.ReactNode, { pathname = '/dashboard', authOptions = {} as MockAuthStoreOptions } = {}) => {
  return render(
    <TestProviders
      router={{
        ...mockRouter,
        pathname
      }}
      authOptions={authOptions}
    >
      {ui}
    </TestProviders>
  );
};

describe('MainLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to login when not authenticated', async () => {
    // Ensure we're in an unauthenticated state
    mockTokenService.getToken.mockReturnValue(null);

    renderWithProviders(<MainLayout>Test Content</MainLayout>, {
      authOptions: {
        isAuthenticated: false,
        user: null,
        loginBehavior: 'error',
        error: 'Not authenticated'
      }
    });

    // Wait for auth check and redirect
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('renders layout components and children when authenticated', async () => {
    // Set up authenticated state
    mockTokenService.getToken.mockReturnValue('valid-token');

    renderWithProviders(<MainLayout>Test Content</MainLayout>, {
      authOptions: {
        isAuthenticated: true,
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          role: 'user'
        },
        loginBehavior: 'success'
      }
    });

    // Verify main content
    expect(await screen.findByText('Test Content')).toBeInTheDocument();

    // Verify navbar elements
    expect(screen.getByRole('heading', { name: 'AI/ML Learning', level: 2 })).toBeInTheDocument();
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    expect(screen.getByText('View notifications')).toBeInTheDocument();

    // Verify sidebar elements
    expect(screen.getByText('Open sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('nav-library')).toBeInTheDocument();
  });

  it('renders children without layout on auth pages', async () => {
    mockTokenService.getToken.mockReturnValue('valid-token');

    renderWithProviders(<MainLayout>Test Content</MainLayout>, {
      pathname: '/auth/login',
      authOptions: {
        isAuthenticated: true,
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          role: 'user'
        },
        loginBehavior: 'success'
      }
    });

    expect(await screen.findByText('Test Content')).toBeInTheDocument();
    expect(screen.queryByText('AI/ML Learning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-dashboard')).not.toBeInTheDocument();
  });

  it('handles loading state correctly', async () => {
    mockTokenService.getToken.mockReturnValue('valid-token');

    const { rerender } = renderWithProviders(<MainLayout>Test Content</MainLayout>, {
      authOptions: {
        isAuthenticated: false,
        user: null,
        loginBehavior: 'loading'
      }
    });

    // Verify loading screen is shown
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();

    // Update the auth state to authenticated
    rerender(
      <TestProviders
        router={mockRouter}
        authOptions={{
          isAuthenticated: true,
          user: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
            role: 'user'
          },
          loginBehavior: 'success'
        }}
      >
        <MainLayout>Test Content</MainLayout>
      </TestProviders>
    );

    // Wait for loading screen to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    }, { timeout: 1000 });

    // Verify content is shown
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('handles auth errors correctly', async () => {
    mockTokenService.getToken.mockReturnValue(null);

    renderWithProviders(<MainLayout>Test Content</MainLayout>, {
      authOptions: {
        isAuthenticated: false,
        user: null,
        loginBehavior: 'error',
        error: 'Authentication failed'
      }
    });

    expect(await screen.findByText('Authentication failed')).toBeInTheDocument();

    // Wait for the redirect timeout
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    }, { timeout: 500 });
  });
});