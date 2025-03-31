/**
 * @jest-environment jsdom
 */

import { expect, describe, it } from '@jest/globals';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '@/app/auth/register/page';
import { renderWithProviders } from '@/lib/utils/test-utils/test-providers/test-providers';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';

// Mock next navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('RegisterPage', () => {
  // Let TypeScript infer the spy type
  let registerSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    // Reset mocks before each test
    if (registerSpy) {
      registerSpy.mockClear();
    }
    // Reset store state
    useAuthStore.getState().reset();
    // Mock useRouter
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
  });

  afterEach(() => {
    // Restore mocks
    if (registerSpy) {
      registerSpy.mockRestore();
    }
  });

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
    // Mock the STORE ACTION to return a pending promise
    registerSpy = jest
      .spyOn(useAuthStore.getState(), 'register')
      .mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<RegisterPage />);

    // Fill in form
    await user.type(screen.getByTestId('fullname-input'), 'Test User');
    await user.type(screen.getByTestId('username-input'), 'testuser');
    await user.type(screen.getByTestId('email-input'), 'test@example.com');
    await user.type(screen.getByTestId('password-input'), 'password123');

    const submitButton = screen.getByTestId('submit-button');

    // Wrap click and waitFor in act
    await act(async () => {
      await user.click(submitButton);
    });

    // Wait for the button to become disabled and text to change
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Creating account...');
    });
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
    // Mock the STORE ACTION to return a pending promise
    registerSpy = jest
      .spyOn(useAuthStore.getState(), 'register')
      .mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<RegisterPage />);

    // Fill in form
    await user.type(screen.getByTestId('fullname-input'), 'Test User');
    await user.type(screen.getByTestId('username-input'), 'testuser');
    await user.type(screen.getByTestId('email-input'), 'test@example.com');
    await user.type(screen.getByTestId('password-input'), 'password123');

    const submitButton = screen.getByTestId('submit-button');

    // Wrap first click and waitFor in act
    await act(async () => {
      await user.click(submitButton);
    });

    // Verify button is disabled and STORE ACTION called once after first click
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Creating account...');
      expect(registerSpy).toHaveBeenCalledTimes(1); // Check store action spy
    });

    // Try clicking again (this should ideally do nothing as button is disabled)
    // Wrap in act just in case, though ideally unnecessary if truly disabled
    await act(async () => {
      await user.click(submitButton);
    });

    // Verify the STORE ACTION was *still* only called once after the second click attempt
    expect(registerSpy).toHaveBeenCalledTimes(1); // Check store action spy
  });
});