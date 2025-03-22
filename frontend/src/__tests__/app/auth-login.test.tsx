import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LoginPage from '@/app/auth/login/page';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter, useSearchParams } from 'next/navigation';
import { expect } from '@jest/globals';

// Mock the auth store
jest.mock('@/lib/store/auth-store', () => {
  // Create a mock store object with the necessary methods and state
  const mockStore = {
    login: jest.fn(),
    error: null,
    clearError: jest.fn(),
    isLoading: false,
  };

  // Return a function that returns the mock store
  return {
    useAuthStore: jest.fn(() => mockStore),
  };
});

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockedLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockedLink.displayName = 'MockedLink';
  return MockedLink;
});

describe('LoginPage', () => {
  const mockLogin = jest.fn();
  const mockClearError = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock auth store
    ((useAuthStore as unknown) as jest.Mock).mockReturnValue({
      login: mockLogin,
      error: null,
      clearError: mockClearError,
    });

    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    // Mock search params
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('/dashboard'),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock localStorage for token check
    const localStorageMock = {
      getItem: jest.fn().mockReturnValue('mock-token'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 1,
      key: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // Mock auth store with successful login by default
    mockLogin.mockResolvedValue({ access_token: 'mock-token' });
    ((useAuthStore as unknown) as jest.Mock).mockReturnValue({
      login: mockLogin,
      error: null,
      clearError: mockClearError,
    });

    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    // Mock search params
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('/dashboard'),
    });
  });

  it('renders the login form correctly', () => {
    render(<LoginPage />);

    // Check if form elements are rendered
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

    // Check if the link to register is rendered
    const registerLink = screen.getByRole('link', { name: /create a new account/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/auth/register');
  });

  it('shows validation errors for empty fields', async () => {
    render(<LoginPage />);

    // Submit the form without filling in any fields
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Check if validation errors are shown
    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    // Verify login was not called
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login function with correct credentials on submit', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    // Fill in the form
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify login was called with correct credentials
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
    });

    // Verify navigation to dashboard with longer timeout
    // This needs to wait for the setTimeout in the onSubmit function
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 1500 });
  });

  it('shows error message when login fails', async () => {
    // Mock auth store with error
    ((useAuthStore as unknown) as jest.Mock).mockReturnValue({
      login: mockLogin.mockRejectedValueOnce(new Error('Invalid credentials')),
      error: 'Invalid credentials',
      clearError: mockClearError,
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    // Fill in the form
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify error message is shown
    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during login', async () => {
    // Mock login to return a promise that doesn't resolve immediately
    mockLogin.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    const user = userEvent.setup();
    render(<LoginPage />);

    // Fill in the form
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Check if loading state is shown
    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();

    // Wait for login to complete
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /signing in/i })).not.toBeInTheDocument();
    });
  });

  it('uses the callback URL from search params', async () => {
    // Mock search params with a custom callback URL
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('/learning-path'),
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    // Fill in the form
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify navigation to the callback URL
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/learning-path');
    });
  });
});