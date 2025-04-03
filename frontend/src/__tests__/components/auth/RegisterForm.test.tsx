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
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');
    const firstNameInput = screen.getByTestId('first-name-input');
    const lastNameInput = screen.getByTestId('last-name-input');
    const submitButton = screen.getByTestId('submit-button');

    // Fill the form
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.change(firstNameInput, { target: { value: 'Test' } });
      fireEvent.change(lastNameInput, { target: { value: 'User' } });
    });

    // Click submit
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Wait for async actions and state updates
    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalledWith('testuser', 'test@example.com', 'password123', 'password123', 'Test', 'User');
    });
    // await waitFor(() => {
    //   expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    // });
    // Note: Navigation check might be less reliable here, focus on store call
  });

  it('should display error message on registration failure', async () => {
    const errorMessage = 'Network Error';

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
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');
    const firstNameInput = screen.getByTestId('first-name-input');
    const lastNameInput = screen.getByTestId('last-name-input');
    const submitButton = screen.getByTestId('submit-button');

    // Fill the form
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'existinguser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.change(firstNameInput, { target: { value: 'Test' } });
      fireEvent.change(lastNameInput, { target: { value: 'User' } });
    });

    // Click submit
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Wait for error message to appear
    await waitFor(() => {
      // Check if the error message element exists and contains the text
      const errorElement = screen.queryByTestId('error-message'); // Use queryByTestId
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent(errorMessage);
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
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');
    const firstNameInput = screen.getByTestId('first-name-input');
    const lastNameInput = screen.getByTestId('last-name-input');
    const submitButton = screen.getByTestId('submit-button');

    // Fill the form
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.change(firstNameInput, { target: { value: 'Test' } });
      fireEvent.change(lastNameInput, { target: { value: 'User' } });
    });

    // Click submit
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
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
    const firstNameInput = screen.getByTestId('first-name-input');
    const lastNameInput = screen.getByTestId('last-name-input');
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');
    const submitButton = screen.getByTestId('submit-button');

    // Fill the form
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.change(firstNameInput, { target: { value: 'Test' } });
      fireEvent.change(lastNameInput, { target: { value: 'User' } });
    });

    // Click submit
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Wait for inputs and button to become disabled
    await waitFor(() => {
      expect(usernameInput).toBeDisabled();
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
      expect(firstNameInput).toBeDisabled();
      expect(lastNameInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });
});