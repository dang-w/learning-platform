import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, it, beforeEach } from '@jest/globals';
import RegisterForm from '@/components/auth/RegisterForm';
import { useAuthStore } from '@/lib/store/auth-store';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// Create a mock router
const createMockRouter = (push = jest.fn()) => ({
  back: jest.fn(),
  forward: jest.fn(),
  push,
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
});

// Get the initial state before any tests run/modify it
const initialState = useAuthStore.getState();

describe('RegisterForm', () => {
  // Hold spies for store actions
  let registerSpy = jest.spyOn(useAuthStore.getState(), 'register');
  let mockRouter: ReturnType<typeof createMockRouter>;

  beforeEach(() => {
    // Reset the store to initial state
    useAuthStore.setState(initialState);

    // Setup spies
    registerSpy = jest.spyOn(useAuthStore.getState(), 'register');

    // Create a fresh router for each test
    mockRouter = createMockRouter();
  });

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(
      <AppRouterContext.Provider value={mockRouter}>
        {ui}
      </AppRouterContext.Provider>
    );
  };

  it('should handle successful registration', async () => {
    // Configure register spy to simulate success
    registerSpy.mockImplementation(async () => {
      act(() => {
        useAuthStore.setState({ isAuthenticated: true, error: null });
      });
      return Promise.resolve();
    });

    renderWithRouter(<RegisterForm />);

    const usernameInput = screen.getByTestId('username-input');
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const fullNameInput = screen.getByTestId('fullname-input');
    const submitButton = screen.getByTestId('submit-button');

    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(fullNameInput, { target: { value: 'Test User' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
    expect(registerSpy).toHaveBeenCalledWith('testuser', 'test@example.com', 'password123', 'Test User');
  });

  it('should display error message on registration failure', async () => {
    const errorMessage = 'Failed to obtain valid token before request.';

    // Configure register spy to simulate failure
    registerSpy.mockImplementation(async () => {
      act(() => {
        useAuthStore.setState({ error: errorMessage, isLoading: false });
      });
      throw new Error(errorMessage);
    });

    renderWithRouter(<RegisterForm />);

    const usernameInput = screen.getByTestId('username-input');
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const fullNameInput = screen.getByTestId('fullname-input');
    const submitButton = screen.getByTestId('submit-button');

    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'existinguser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(fullNameInput, { target: { value: 'Test User' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
    });
  });

  it('should show loading state during registration', async () => {
    // Configure register spy to simulate loading state
    registerSpy.mockImplementation(async () => {
      act(() => {
        useAuthStore.setState({ isLoading: true });
      });
      // Keep the promise pending indefinitely
      await new Promise(() => {});
    });

    renderWithRouter(<RegisterForm />);

    const usernameInput = screen.getByTestId('username-input');
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const fullNameInput = screen.getByTestId('fullname-input');
    const submitButton = screen.getByTestId('submit-button');

    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(fullNameInput, { target: { value: 'Test User' } });
      fireEvent.click(submitButton);
    });

    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
  });

  it('should disable form inputs during submission', async () => {
    // Configure register spy to simulate loading state
    registerSpy.mockImplementation(async () => {
      act(() => {
        useAuthStore.setState({ isLoading: true });
      });
      // Keep the promise pending indefinitely
      await new Promise(() => {});
    });

    renderWithRouter(<RegisterForm />);

    const usernameInput = screen.getByTestId('username-input');
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const fullNameInput = screen.getByTestId('fullname-input');
    const submitButton = screen.getByTestId('submit-button');

    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(fullNameInput, { target: { value: 'Test User' } });
      fireEvent.click(submitButton);
    });

    expect(usernameInput).toBeDisabled();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(fullNameInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });
});