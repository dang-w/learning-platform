import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { renderWithAuth } from '@/lib/utils/test-utils';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

describe('LoginForm', () => {
  const mockRouter = {
    push: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('should handle successful login', async () => {
    renderWithAuth(<LoginForm />, {
      authOptions: {
        loginBehavior: 'success'
      }
    });

    const usernameInput = screen.getByTestId('username-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should display error message on login failure', async () => {
    const errorMessage = 'Invalid credentials';

    renderWithAuth(<LoginForm />, {
      authOptions: {
        loginBehavior: 'error',
        error: errorMessage
      }
    });

    const usernameInput = screen.getByTestId('username-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
    });
  });

  it('should show loading state during login', async () => {
    renderWithAuth(<LoginForm />, {
      authOptions: {
        loginBehavior: 'loading'
      }
    });

    const usernameInput = screen.getByTestId('username-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitButton);

    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
  });

  it('should disable form inputs during submission', async () => {
    renderWithAuth(<LoginForm />, {
      authOptions: {
        loginBehavior: 'loading'
      }
    });

    const usernameInput = screen.getByTestId('username-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitButton);

    expect(usernameInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });
});