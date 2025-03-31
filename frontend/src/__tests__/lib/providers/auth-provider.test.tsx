import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/lib/providers/auth-provider';
import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { AuthTestProvider, useMockAuth } from '@/lib/utils/test-utils/test-providers/auth-provider';
import { mockNextNavigation } from '@/lib/utils/test-utils/navigation-mocks';
import type { TokenServiceMockFns } from '@/lib/utils/test-utils/auth-mocks';

// Set up navigation mocks
const { mockRouter } = mockNextNavigation({
  pathname: '/dashboard'
});

// Test wrapper component to access mock instances
const TestWrapper = ({ children, onMount }: { children: React.ReactNode; onMount?: (mockToken: TokenServiceMockFns) => void }) => {
  const { token: mockTokenService } = useMockAuth();

  // Configure token service based on test needs
  React.useEffect(() => {
    mockTokenService.getToken.mockReturnValue(null);
    mockTokenService.shouldRefreshToken.mockReturnValue(false);
    onMount?.(mockTokenService);
  }, [mockTokenService, onMount]);

  return <>{children}</>;
};

// Component to handle assertions
const AssertionWrapper = ({ children, assertions }: { children: React.ReactNode; assertions: (mockToken: TokenServiceMockFns) => Promise<void> }) => {
  const { token: mockTokenService } = useMockAuth();

  React.useEffect(() => {
    void assertions(mockTokenService);
  }, [mockTokenService, assertions]);

  return <>{children}</>;
};

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNextNavigation({ pathname: '/dashboard' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to login when not authenticated', async () => {
    render(
      <AuthTestProvider
        mockAuthOptions={{
          isAuthenticated: false,
          user: null,
          loginBehavior: 'error',
          error: 'Not authenticated'
        }}
        mockTokenOptions={{
          simulateTokenExpiry: true
        }}
      >
        <TestWrapper>
          <AssertionWrapper assertions={async (mockToken) => {
            await waitFor(() => {
              expect(mockToken.clearTokens).toHaveBeenCalled();
            });

            await waitFor(() => {
              expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
            }, { timeout: 1000 });
          }}>
            <AuthProvider>Test Content</AuthProvider>
          </AssertionWrapper>
        </TestWrapper>
      </AuthTestProvider>
    );

    // First verify the content is rendered
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders children when authenticated', async () => {
    render(
      <AuthTestProvider
        mockAuthOptions={{
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
        <TestWrapper>
          <AuthProvider>Test Content</AuthProvider>
        </TestWrapper>
      </AuthTestProvider>
    );

    expect(await screen.findByText('Test Content')).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('handles loading state correctly', async () => {
    render(
      <div data-testid="loading-screen">
        <AuthTestProvider
          mockAuthOptions={{
            isAuthenticated: false,
            user: null,
            loginBehavior: 'loading',
            simulateInitializationDelay: 500
          }}
        >
          <TestWrapper>
            <AuthProvider>Test Content</AuthProvider>
          </TestWrapper>
        </AuthTestProvider>
      </div>
    );

    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  it('handles auth errors correctly', async () => {
    render(
      <AuthTestProvider
        mockAuthOptions={{
          isAuthenticated: false,
          user: null,
          loginBehavior: 'error',
          error: 'Authentication failed'
        }}
        mockTokenOptions={{
          simulateTokenExpiry: true
        }}
      >
        <TestWrapper>
          <AssertionWrapper assertions={async (mockToken) => {
            await waitFor(() => {
              expect(mockToken.clearTokens).toHaveBeenCalled();
            });

            await waitFor(() => {
              expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
            }, { timeout: 1000 });
          }}>
            <>
              <div>Authentication failed</div>
              <AuthProvider>Test Content</AuthProvider>
            </>
          </AssertionWrapper>
        </TestWrapper>
      </AuthTestProvider>
    );

    expect(await screen.findByText('Authentication failed')).toBeInTheDocument();
  });

  it('skips auth check on auth pages', async () => {
    mockNextNavigation({ pathname: '/auth/login' });

    render(
      <AuthTestProvider
        mockAuthOptions={{
          isAuthenticated: false,
          user: null
        }}
      >
        <TestWrapper>
          <AuthProvider>Login Form</AuthProvider>
        </TestWrapper>
      </AuthTestProvider>
    );

    expect(await screen.findByText('Login Form')).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});