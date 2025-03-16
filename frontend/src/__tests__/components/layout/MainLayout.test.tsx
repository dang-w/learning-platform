import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainLayout from '@/components/layout/main-layout';
import { expect } from '@jest/globals';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter, usePathname } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
  }),
  usePathname: jest.fn(),
}));

// Mock auth store
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

// Mock components
jest.mock('@/components/layout/navbar', () => {
  return function MockedNavbar() {
    return <div data-testid="navbar">Navbar</div>;
  };
});

jest.mock('@/components/layout/sidebar', () => {
  return function MockedSidebar() {
    return <div data-testid="sidebar">Sidebar</div>;
  };
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('MainLayout', () => {
  const mockFetchUser = jest.fn();
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();

    // Reset mocks
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      fetchUser: mockFetchUser,
    });

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
  });

  it('renders the layout with navbar and sidebar when authenticated', () => {
    render(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>
    );

    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('does not render navbar and sidebar on auth pages', () => {
    (usePathname as jest.Mock).mockReturnValue('/auth/login');

    render(
      <MainLayout>
        <div>Auth Content</div>
      </MainLayout>
    );

    expect(screen.queryByTestId('navbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.getByText('Auth Content')).toBeInTheDocument();
  });

  it('does not render navbar and sidebar on the root page', () => {
    (usePathname as jest.Mock).mockReturnValue('/');

    render(
      <MainLayout>
        <div>Root Content</div>
      </MainLayout>
    );

    expect(screen.queryByTestId('navbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.getByText('Root Content')).toBeInTheDocument();
  });

  it('redirects to login if not authenticated and not on auth pages', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      fetchUser: mockFetchUser,
    });

    render(
      <MainLayout>
        <div>Dashboard Content</div>
      </MainLayout>
    );

    expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
  });

  it('redirects to dashboard if authenticated and on auth pages', () => {
    (usePathname as jest.Mock).mockReturnValue('/auth/login');

    render(
      <MainLayout>
        <div>Auth Content</div>
      </MainLayout>
    );

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  it('fetches user if token exists but not authenticated', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      fetchUser: mockFetchUser,
    });

    localStorageMock.setItem('token', 'test-token');

    render(
      <MainLayout>
        <div>Content</div>
      </MainLayout>
    );

    expect(mockFetchUser).toHaveBeenCalled();
  });
});