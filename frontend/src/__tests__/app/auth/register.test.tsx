/**
 * @jest-environment jsdom
 */

import { expect, describe, it } from '@jest/globals';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '@/app/auth/register/page';
import { renderWithProviders } from '@/lib/utils/test-utils/test-providers/test-providers';

describe('RegisterPage', () => {
  it('should show validation errors for empty fields', async () => {
    renderWithProviders(<RegisterPage />);

    // Get the form and submit it directly
    const form = screen.getByRole('form');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // Wait for validation errors to appear
    await waitFor(() => {
      expect(screen.getByTestId('error-fullname')).toHaveTextContent('Full name is required');
      expect(screen.getByTestId('error-username')).toHaveTextContent('Username is required');
      expect(screen.getByTestId('error-email')).toHaveTextContent('Email is required');
      expect(screen.getByTestId('error-password')).toHaveTextContent('Password is required');
    }, {
      timeout: 5000,
      interval: 50
    });
  }, 5000);

  it('should disable submit button during form submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    // Fill in form
    await user.type(screen.getByTestId('fullname-input'), 'Test User');
    await user.type(screen.getByTestId('username-input'), 'testuser');
    await user.type(screen.getByTestId('email-input'), 'test@example.com');
    await user.type(screen.getByTestId('password-input'), 'password123');

    const submitButton = screen.getByTestId('submit-button');
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Creating account...');
  });

  it('should show form fields with correct attributes', () => {
    renderWithProviders(<RegisterPage />);

    const fullnameInput = screen.getByTestId('fullname-input');
    const usernameInput = screen.getByTestId('username-input');
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');

    expect(fullnameInput).toHaveAttribute('type', 'text');
    expect(fullnameInput).toHaveAttribute('required');
    expect(usernameInput).toHaveAttribute('type', 'text');
    expect(usernameInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
  });

  it('should prevent multiple form submissions', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    // Fill in form
    await user.type(screen.getByTestId('fullname-input'), 'Test User');
    await user.type(screen.getByTestId('username-input'), 'testuser');
    await user.type(screen.getByTestId('email-input'), 'test@example.com');
    await user.type(screen.getByTestId('password-input'), 'password123');

    const submitButton = screen.getByTestId('submit-button');
    await user.click(submitButton);

    // Verify button is disabled
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Creating account...');

    // Try clicking again
    await user.click(submitButton);
    expect(submitButton).toBeDisabled();
  });
});