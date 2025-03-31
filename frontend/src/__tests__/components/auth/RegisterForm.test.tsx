import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import RegisterForm from '@/components/auth/RegisterForm';
import { renderWithAuth } from '@/lib/utils/test-utils';
import { expect } from '@jest/globals';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

describe('RegisterForm', () => {
  const mockRouter = {
    push: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('should handle successful registration', async () => {
    renderWithAuth(<RegisterForm />, {
      authOptions: {
        registerBehavior: 'success'
      }
    });

    const usernameInput = screen.getByTestId('username-input');
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const fullNameInput = screen.getByTestId('fullname-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(fullNameInput, { target: { value: 'Test User' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should display error message on registration failure', async () => {
    const errorMessage = 'Failed to obtain valid token before request.';

    renderWithAuth(<RegisterForm />, {
      authOptions: {
        registerBehavior: 'error',
        error: errorMessage
      }
    });

    const usernameInput = screen.getByTestId('username-input');
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const fullNameInput = screen.getByTestId('fullname-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(usernameInput, { target: { value: 'existinguser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(fullNameInput, { target: { value: 'Test User' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
    });
  });

  it('should show loading state during registration', async () => {
    renderWithAuth(<RegisterForm />, {
      authOptions: {
        registerBehavior: 'loading'
      }
    });

    const usernameInput = screen.getByTestId('username-input');
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const fullNameInput = screen.getByTestId('fullname-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(fullNameInput, { target: { value: 'Test User' } });

    fireEvent.click(submitButton);

    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
  });

  it('should disable form inputs during submission', async () => {
    renderWithAuth(<RegisterForm />, {
      authOptions: {
        registerBehavior: 'loading'
      }
    });

    const usernameInput = screen.getByTestId('username-input');
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const fullNameInput = screen.getByTestId('fullname-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(fullNameInput, { target: { value: 'Test User' } });

    fireEvent.click(submitButton);

    expect(usernameInput).toBeDisabled();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(fullNameInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });
});