import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfilePage from '@/app/profile/page';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { expect } from '@jest/globals';

// Mock the auth store
jest.mock('@/lib/store/auth-store');

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      totalCoursesEnrolled: 5,
      completedCourses: 3,
      averageScore: 85,
      emailNotifications: true,
      courseUpdates: true,
      marketingEmails: false
    })
  })
) as jest.Mock;

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

  const mockAuthStore = {
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    statistics: {
      totalCoursesEnrolled: 5,
      completedCourses: 3,
      averageScore: 85
    },
    notificationPreferences: {
      emailNotifications: true,
      courseUpdates: true,
      marketingEmails: false
    },
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
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          totalCoursesEnrolled: 5,
          completedCourses: 3,
          averageScore: 85,
          emailNotifications: true,
          courseUpdates: true,
          marketingEmails: false
        })
      })
    );
  });

  it('renders the profile page with user data', async () => {
    render(<ProfilePage />);

    // Wait for initialization and loading to complete
    await waitFor(() => {
      expect(mockAuthStore.initializeFromStorage).toHaveBeenCalled();
    });

    // Wait for loading spinner to disappear
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Now check for profile info
    expect(screen.getByTestId('profile-info')).toBeInTheDocument();
    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
  });

  it('submits the profile form with updated data', async () => {
    render(<ProfilePage />);

    // Wait for initialization and loading to complete
    await waitFor(() => {
      expect(mockAuthStore.initializeFromStorage).toHaveBeenCalled();
    });

    // Wait for loading spinner to disappear
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const emailInput = screen.getByTestId('profile-email');
    const fullNameInput = screen.getByTestId('profile-full-name');
    const submitButton = screen.getByTestId('save-profile-button');

    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });
    fireEvent.change(fullNameInput, { target: { value: 'New Name' } });
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

    // Wait for initialization and loading to complete
    await waitFor(() => {
      expect(mockAuthStore.initializeFromStorage).toHaveBeenCalled();
    });

    // Wait for loading spinner to disappear
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Switch to password tab
    const passwordTab = screen.getByTestId('password-tab');
    fireEvent.click(passwordTab);

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

    // Wait for initialization and loading to complete
    await waitFor(() => {
      expect(mockStoreWithError.initializeFromStorage).toHaveBeenCalled();
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