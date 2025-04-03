import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfilePage from '@/app/profile/page';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { expect } from '@jest/globals';
import authApi from '@/lib/api/auth';

// Mock the auth store
jest.mock('@/lib/store/auth-store');

// Mock the auth API
jest.mock('@/lib/api/auth');

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('ProfilePage', () => {
  const mockRouter = {
    push: jest.fn()
  };

  const mockUser = {
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  };

  const mockStatistics = {
    totalCoursesEnrolled: 5,
    completedCourses: 3,
    averageScore: 85
  };

  const mockNotificationPreferences = {
    emailNotifications: true,
    courseUpdates: true,
    marketingEmails: false
  };

  const mockAuthStore = {
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    statistics: mockStatistics,
    notificationPreferences: mockNotificationPreferences,
    initializeFromStorage: jest.fn().mockResolvedValue(undefined),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    clearError: jest.fn(),
    setStatistics: jest.fn(),
    setNotificationPreferences: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as unknown as jest.Mock).mockReturnValue(mockAuthStore);

    // Mock auth API calls
    (authApi.getUserStatistics as jest.Mock).mockResolvedValue(mockStatistics);
    (authApi.getNotificationPreferences as jest.Mock).mockResolvedValue(mockNotificationPreferences);
  });

  it('renders the profile page with user data', async () => {
    render(<ProfilePage />);

    // Wait for API calls to complete
    await waitFor(() => {
      expect(authApi.getUserStatistics).toHaveBeenCalled();
      expect(authApi.getNotificationPreferences).toHaveBeenCalled();
    });

    // Wait for loading spinner to disappear
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Now check for profile info
    expect(screen.getByTestId('profile-page')).toBeInTheDocument();
    expect(screen.getByTestId('profile-form')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('User')).toBeInTheDocument();
  });

  it('submits the profile form with updated data', async () => {
    render(<ProfilePage />);

    // Wait for initialization and API calls to complete
    await waitFor(() => {
      expect(authApi.getUserStatistics).toHaveBeenCalled();
      expect(authApi.getNotificationPreferences).toHaveBeenCalled();
    });

    // Wait for loading spinner to disappear
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const emailInput = screen.getByTestId('profile-email');
    const firstNameInput = screen.getByTestId('profile-first-name');
    const lastNameInput = screen.getByTestId('profile-last-name');
    const submitButton = screen.getByTestId('save-profile-button');

    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });
    fireEvent.change(firstNameInput, { target: { value: 'New' } });
    fireEvent.change(lastNameInput, { target: { value: 'Name' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAuthStore.updateProfile).toHaveBeenCalledWith({
        email: 'newemail@example.com',
        firstName: 'New',
        lastName: 'Name'
      });
    });
  });

  it('submits the password form with new password', async () => {
    render(<ProfilePage />);

    // Wait for initialization and API calls to complete
    await waitFor(() => {
      expect(authApi.getUserStatistics).toHaveBeenCalled();
      expect(authApi.getNotificationPreferences).toHaveBeenCalled();
    });

    // Wait for loading spinner to disappear
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Switch to password tab
    const passwordTab = screen.getByTestId('password-tab');
    fireEvent.click(passwordTab);

    // Wait for password form to be visible
    await waitFor(() => {
      expect(screen.getByTestId('password-form')).toBeInTheDocument();
    });

    const currentPasswordInput = screen.getByTestId('current-password-input');
    const newPasswordInput = screen.getByTestId('new-password-input');
    const confirmPasswordInput = screen.getByTestId('confirm-password-input');
    const submitButton = screen.getByTestId('save-password-button');

    fireEvent.change(currentPasswordInput, { target: { value: 'oldpass123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAuthStore.changePassword).toHaveBeenCalledWith('oldpass123', 'newpass123');
    });
  });

  it('shows error message when profile update fails', async () => {
    const errorMessage = 'Failed to update profile';
    const mockStoreWithError = {
      ...mockAuthStore,
      error: errorMessage,
      updateProfile: jest.fn().mockRejectedValue(new Error(errorMessage))
    };
    (useAuthStore as unknown as jest.Mock).mockReturnValue(mockStoreWithError);

    render(<ProfilePage />);

    // Wait for initialization and API calls to complete
    await waitFor(() => {
      expect(authApi.getUserStatistics).toHaveBeenCalled();
      expect(authApi.getNotificationPreferences).toHaveBeenCalled();
    });

    // Wait for loading spinner to disappear
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const emailInput = screen.getByTestId('profile-email');
    const submitButton = screen.getByTestId('save-profile-button');

    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('profile-error')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});