import React from 'react';
import { render } from '@testing-library/react';
import { AuthContext } from '@/lib/store/contexts/auth-context';
import { SessionContext } from '@/lib/store/contexts/session-context';
import { TokenContext } from '@/lib/store/contexts/token-context';
import type { MockAuthStoreOptions, EnhancedAuthStore } from '../auth-mocks';
import type { MockSessionServiceOptions } from '../session-mocks';
import { createMockAuthStore } from '../auth-mocks';
import { createMockSessionService } from '../session-mocks';
import { createMockTokenService } from '../auth-mocks';

export interface AuthTestProviderProps {
  children: React.ReactNode;
  mockAuthOptions?: MockAuthStoreOptions;
  mockSessionOptions?: MockSessionServiceOptions;
  mockTokenOptions?: {
    simulateRefreshDelay?: number;
    simulateTokenExpiry?: boolean;
  };
}

export const AuthTestProvider: React.FC<AuthTestProviderProps> = ({
  children,
  mockAuthOptions = {},
  mockSessionOptions = {},
  mockTokenOptions = {}
}) => {
  const mockAuth = createMockAuthStore({
    trackStateTransitions: true,
    simulateTokenRefreshDelay: mockTokenOptions.simulateRefreshDelay,
    simulateTokenExpiry: mockTokenOptions.simulateTokenExpiry,
    ...mockAuthOptions
  }) as EnhancedAuthStore;

  const mockSession = createMockSessionService({
    trackSessionActivity: true,
    ...mockSessionOptions
  });

  const mockToken = createMockTokenService();

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      mockAuth.cleanup();
      mockSession.cleanup();
      mockAuth.clearStateTransitions();
      mockSession.clearSessionTransitions();
    };
  }, [mockAuth, mockSession]);

  return (
    <AuthContext.Provider value={mockAuth}>
      <SessionContext.Provider value={mockSession}>
        <TokenContext.Provider value={mockToken}>
          {children}
        </TokenContext.Provider>
      </SessionContext.Provider>
    </AuthContext.Provider>
  );
};

// Test utilities for auth provider
export const renderWithAuth = (
  ui: React.ReactElement,
  options: {
    authOptions?: MockAuthStoreOptions;
    sessionOptions?: MockSessionServiceOptions;
    tokenOptions?: {
      simulateRefreshDelay?: number;
      simulateTokenExpiry?: boolean;
    };
  } = {}
) => {
  return render(
    <AuthTestProvider
      mockAuthOptions={options.authOptions}
      mockSessionOptions={options.sessionOptions}
      mockTokenOptions={options.tokenOptions}
    >
      {ui}
    </AuthTestProvider>
  );
};

// Helper to get mock instances from context
export const useMockAuth = () => {
  const mockAuth = React.useContext(AuthContext) as EnhancedAuthStore;
  const mockSession = React.useContext(SessionContext);
  const mockToken = React.useContext(TokenContext);

  if (!mockAuth || !mockSession || !mockToken) {
    throw new Error('Mock auth context not found - wrap your test in AuthTestProvider');
  }

  return {
    auth: mockAuth,
    session: mockSession,
    token: mockToken,
    getAuthTransitions: () => mockAuth.getStateTransitions(),
    getSessionTransitions: () => mockSession.getSessionTransitions(),
    clearTransitions: () => {
      mockAuth.clearStateTransitions();
      mockSession.clearSessionTransitions();
    }
  };
};