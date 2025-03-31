import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '@/app/page';
import { expect } from '@jest/globals';
import { AppRouterContextProviderMock } from '@/lib/utils/test-utils/test-providers/app-router-context-provider';
import { tokenService } from '@/lib/services/token-service';

// Mock tokenService
jest.mock('@/lib/services/token-service', () => ({
  tokenService: {
    clearTokens: jest.fn(),
  },
}));

// Mock router functions
const mockRouterPush = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

const renderWithProviders = (ui: React.ReactNode, { router = {} } = {}) => {
  return render(
    <AppRouterContextProviderMock router={router}>
      {ui}
    </AppRouterContextProviderMock>
  );
};

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears tokens and redirects to login page', () => {
    renderWithProviders(<HomePage />);

    // Check if tokenService.clearTokens was called
    expect(tokenService.clearTokens).toHaveBeenCalled();

    // Check if router.push was called with the correct path
    expect(mockRouterPush).toHaveBeenCalledWith('/auth/login');
  });
});