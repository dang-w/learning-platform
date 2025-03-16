import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '@/lib/providers/AuthProvider';
import * as authApi from '@/lib/api/authApi';

// Mock the API
jest.mock('@/lib/api/authApi');

// Test component that uses the auth context
const TestComponent = () => {
  const { user, isAuthenticated, login, logout, register } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      {user && <div data-testid="user-email">{user.email}</div>}
      <button onClick={() => login({ email: 'test@example.com', password: 'password' })}>
        Login
      </button>
      <button onClick={() => register({ email: 'new@example.com', password: 'password', full_name: 'New User' })}>
        Register
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Clear localStorage
    localStorage.clear();
  });

  it('provides authentication context to children', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('handles login correctly', async () => {
    const mockUser = { id: '1', email: 'test@example.com', full_name: 'Test User' };
    (authApi.login as jest.Mock).mockResolvedValue({ user: mockUser, token: 'fake-token' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password' });
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });
  });

  it('handles login errors correctly', async () => {
    const mockError = new Error('Invalid credentials');
    (authApi.login as jest.Mock).mockRejectedValue(mockError);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password' });
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });

  it('handles registration correctly', async () => {
    const mockUser = { id: '2', email: 'new@example.com', full_name: 'New User' };
    (authApi.register as jest.Mock).mockResolvedValue({ user: mockUser, token: 'fake-token' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password',
        full_name: 'New User'
      });
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-email')).toHaveTextContent('new@example.com');
    });
  });

  it('handles logout correctly', async () => {
    // First login
    const mockUser = { id: '1', email: 'test@example.com', full_name: 'Test User' };
    (authApi.login as jest.Mock).mockResolvedValue({ user: mockUser, token: 'fake-token' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    // Then logout
    (authApi.logout as jest.Mock).mockResolvedValue({ success: true });

    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(authApi.logout).toHaveBeenCalled();
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });

  it('restores authentication from localStorage on mount', async () => {
    // Set up localStorage with user data
    const mockUser = { id: '1', email: 'test@example.com', full_name: 'Test User' };
    localStorage.setItem('user', JSON.stringify(mockUser));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });
  });
});