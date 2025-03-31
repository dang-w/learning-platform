/**
 * @jest-environment jsdom
 */

import { expect, describe, it } from '@jest/globals';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/auth/login/page';
import { renderWithProviders } from '@/lib/utils/test-utils/test-providers/test-providers';

describe('LoginPage', () => {
  it('should show validation errors for empty fields', async () => {
    renderWithProviders(<LoginPage />);

    // Get the form and submit it directly
    const form = screen.getByRole('form');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // Wait for validation errors to appear
    await waitFor(() => {
      expect(screen.getByTestId('error-username')).toHaveTextContent('Username is required');
      expect(screen.getByTestId('error-password')).toHaveTextContent('Password is required');
    }, {
      timeout: 5000,
      interval: 50
    });
  }, 5000);

  it('should disable submit button during form submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    // Fill in form
    await user.type(screen.getByTestId('username-input'), 'testuser');
    await user.type(screen.getByTestId('password-input'), 'password123');

    const submitButton = screen.getByTestId('submit-button');
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Logging in...');
  });

  it('should show form fields with correct attributes', () => {
    renderWithProviders(<LoginPage />);

    const usernameInput = screen.getByTestId('username-input');
    const passwordInput = screen.getByTestId('password-input');

    expect(usernameInput).toHaveAttribute('type', 'text');
    expect(usernameInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
  });

  it('should show registration success message when redirected', () => {
    renderWithProviders(<LoginPage />, {
      searchParams: { registered: 'true' }
    });

    expect(screen.getByText('Your account has been created. Please sign in with your credentials.')).toBeInTheDocument();
  });
});