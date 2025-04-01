import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, it, beforeEach } from '@jest/globals';
import LoginForm from '@/components/auth/LoginForm';
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

describe('LoginForm', () => {
  // Hold spies for store actions
  let loginSpy = jest.spyOn(useAuthStore.getState(), 'login');
  let clearErrorSpy = jest.spyOn(useAuthStore.getState(), 'clearError');
  let mockRouter: ReturnType<typeof createMockRouter>;

  beforeEach(() => {
    // Reset the store to initial state
    useAuthStore.setState(initialState);

    // Setup spies
    loginSpy = jest.spyOn(useAuthStore.getState(), 'login');
    clearErrorSpy = jest.spyOn(useAuthStore.getState(), 'clearError');

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

  it('should render the form', () => {
    renderWithRouter(<LoginForm />);
    expect(screen.getByTestId('username-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });

  it('should call login on submit with correct credentials', async () => {
    renderWithRouter(<LoginForm />);

    const usernameInput = screen.getByTestId('username-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');

    // Simulate user input and form submission
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
    });

    // Assertions
    expect(clearErrorSpy).toHaveBeenCalledTimes(1); // Component should clear error first
    expect(loginSpy).toHaveBeenCalledWith('testuser', 'password123');
    expect(loginSpy).toHaveBeenCalledTimes(1);
  });

  it('should display error message on login failure', async () => {
    const errorMessage = 'Invalid credentials';

    // Configure the login spy to simulate failure by setting state
    loginSpy.mockImplementation(async () => {
      act(() => {
        useAuthStore.setState({ error: errorMessage, isLoading: false });
      });
      // Optional: If the original store action throws, mimic that.
      // throw new Error(errorMessage);
    });

    renderWithRouter(<LoginForm />);

    const usernameInput = screen.getByTestId('username-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');

    // Simulate user input and submission
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);
    });

    // Assert error message is displayed
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
    });
    expect(loginSpy).toHaveBeenCalledWith('testuser', 'wrongpassword');
  });

  it('should show loading state during login', async () => {
    // Configure login spy to simulate entering loading state
    loginSpy.mockImplementation(async () => {
      act(() => {
        useAuthStore.setState({ isLoading: true });
      });
      // Keep the promise pending indefinitely
      await new Promise(() => {});
    });

    renderWithRouter(<LoginForm />);

    const usernameInput = screen.getByTestId('username-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');

    // Simulate user input and submission
     await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
     });

    // Assert inputs/button are disabled during loading
     await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
    expect(usernameInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
  });

});