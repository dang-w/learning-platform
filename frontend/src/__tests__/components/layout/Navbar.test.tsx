import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '@/components/layout/navbar';
import { useAuthStore } from '@/lib/store/auth-store';
import { expect } from '@jest/globals';

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Assign the mock to global before tests run
beforeAll(() => {
  global.ResizeObserver = MockResizeObserver;
});

// Mock the auth store
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => {
  const MockedLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockedLink.displayName = 'MockedLink';
  return MockedLink;
});

describe('Navbar', () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the navbar with app title', () => {
    ((useAuthStore as unknown) as jest.Mock).mockReturnValue({
      user: { username: 'testuser' },
      logout: mockLogout,
    });

    render(<Navbar />);

    expect(screen.getByText('AI/ML Learning')).toBeInTheDocument();
    expect(screen.getByText('AI/ML Learning').closest('a')).toHaveAttribute('href', '/dashboard');
  });

  it('displays the user name when available', () => {
    ((useAuthStore as unknown) as jest.Mock).mockReturnValue({
      user: { full_name: 'Test User', username: 'testuser' },
      logout: mockLogout,
    });

    render(<Navbar />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('displays the username when full name is not available', () => {
    ((useAuthStore as unknown) as jest.Mock).mockReturnValue({
      user: { username: 'testuser' },
      logout: mockLogout,
    });

    render(<Navbar />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('opens the profile dropdown when clicking the user menu button', () => {
    ((useAuthStore as unknown) as jest.Mock).mockReturnValue({
      user: { username: 'testuser' },
      logout: mockLogout,
    });

    render(<Navbar />);

    // Initially, dropdown items should not be visible
    expect(screen.queryByText('Your Profile')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument();

    // Click the user menu button
    fireEvent.click(screen.getByText('testuser'));

    // Now dropdown items should be visible
    expect(screen.getByText('Your Profile')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('navigates to profile page when clicking Your Profile', () => {
    ((useAuthStore as unknown) as jest.Mock).mockReturnValue({
      user: { username: 'testuser' },
      logout: mockLogout,
    });

    render(<Navbar />);

    // Open the dropdown
    fireEvent.click(screen.getByText('testuser'));

    // Check that the profile link has the correct href
    expect(screen.getByText('Your Profile').closest('a')).toHaveAttribute('href', '/profile');
  });

  it('calls logout function when clicking Sign out', () => {
    ((useAuthStore as unknown) as jest.Mock).mockReturnValue({
      user: { username: 'testuser' },
      logout: mockLogout,
    });

    render(<Navbar />);

    // Open the dropdown
    fireEvent.click(screen.getByText('testuser'));

    // Click the sign out button
    fireEvent.click(screen.getByText('Sign out'));

    // Check that logout was called
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});