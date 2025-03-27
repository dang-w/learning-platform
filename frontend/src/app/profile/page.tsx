'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import authApi from '@/lib/api/auth';

const profileSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(1, 'Full name is required'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(6, 'New password must be at least 6 characters'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

// Define TabType with all possible tab values
type TabType = 'profile' | 'password' | 'account' | 'statistics' | 'notifications' | 'export';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ProfilePageProps {
  // Add any props if needed
}

const ProfilePage: React.FC<ProfilePageProps> = () => {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    initializeFromStorage,
    updateProfile,
    changePassword,
    clearError,
    statistics,
    notificationPreferences,
    getNotificationPreferences,
    updateNotificationPreferences,
    exportUserData,
    deleteAccount,
    isLoading: storeLoading,
    setStatistics,
    setNotificationPreferences
  } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || '',
      fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    // Initialize auth state from storage
    initializeFromStorage();
  }, [initializeFromStorage]);

  useEffect(() => {
    const initializeProfile = async () => {
      if (!isAuthenticated && !isLoading) {
        router.push('/auth/login');
        return;
      }

      if (!isAuthenticated || !user) {
        return;
      }

      setIsPageLoading(true);
      setPageError(null);

      try {
        // Fetch statistics and preferences in parallel
        const [stats, prefs] = await Promise.all([
          authApi.getUserStatistics(),
          authApi.getNotificationPreferences()
        ]);

        // Update store with fetched data
        setStatistics(stats);
        setNotificationPreferences(prefs);
      } catch (err) {
        console.error('Error loading profile data:', err);
        setPageError('Failed to load profile data. Please try again.');
      } finally {
        setIsPageLoading(false);
      }
    };

    initializeProfile();
  }, [isAuthenticated, isLoading, user, router, setStatistics, setNotificationPreferences]);

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsProfileLoading(true);
    setProfileSuccess(false);
    setFormError(null);
    clearError();

    try {
      // Split fullName into firstName and lastName
      const nameParts = data.fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      await updateProfile({
        email: data.email,
        firstName,
        lastName
      });
      setProfileSuccess(true);
    } catch (error) {
      console.error('Profile update error:', error);
      setFormError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsPasswordLoading(true);
    setPasswordSuccess(false);
    clearError();

    try {
      await changePassword(data.current_password, data.new_password);
      setPasswordSuccess(true);
      resetPassword();
    } catch (error) {
      console.error('Password change error:', error);
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const blob = await exportUserData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      setShowDeleteDialog(false);
      router.push('/auth/login');
    } catch (error) {
      console.error('Delete account error:', error);
    }
  };

  if (isLoading || isPageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">{pageError}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return null; // Router will handle redirect
  }

  const renderStatisticsTab = () => (
    <div data-testid="account-statistics">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900">Account Statistics</h2>
        <p className="mt-1 text-sm text-gray-500">View your account activity and learning progress.</p>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Courses Enrolled</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{statistics?.totalCoursesEnrolled || 0}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Completed Courses</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{statistics?.completedCourses || 0}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Average Score</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{statistics?.averageScore || 0}%</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Time Spent</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{Math.round(statistics?.totalTimeSpent || 0)} hrs</dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExportTab = () => (
    <div className="px-4 py-5 sm:p-6" data-testid="data-export">
      <h2 className="text-lg font-medium text-gray-900">Data Export</h2>
      <div className="mt-6">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={handleExportData}
          disabled={isExporting}
          data-testid="export-data-button"
        >
          {isExporting ? 'Exporting...' : 'Export My Data'}
        </button>
        <p className="mt-2 text-sm text-gray-500">
          Download a copy of your personal data including your profile information, learning progress, and activity history.
        </p>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div data-testid="notifications-settings">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
        <p className="mt-1 text-sm text-gray-500">Manage your notification settings.</p>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
        {storeLoading && (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        )}
        {!storeLoading &&
          <div className="space-y-4">
            {notificationPreferences ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Email Notifications</h3>
                    <p className="text-sm text-gray-500">Receive notifications via email.</p>
                  </div>
                  <button
                    type="button"
                    className={cn(
                      "relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
                      notificationPreferences.emailNotifications ? "bg-indigo-600" : "bg-gray-200"
                    )}
                    role="switch"
                    aria-checked={notificationPreferences.emailNotifications}
                    onClick={() => updateNotificationPreferences({
                      ...notificationPreferences,
                      emailNotifications: !notificationPreferences.emailNotifications,
                    })}
                    data-testid="email-notifications-toggle"
                  >
                    <span className="sr-only">Enable email notifications</span>
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200",
                        notificationPreferences.emailNotifications ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Course Updates</h3>
                    <p className="text-sm text-gray-500">Get notified about course updates and new content.</p>
                  </div>
                  <button
                    type="button"
                    className={cn(
                      "relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
                      notificationPreferences.courseUpdates ? "bg-indigo-600" : "bg-gray-200"
                    )}
                    role="switch"
                    aria-checked={notificationPreferences.courseUpdates}
                    onClick={() => updateNotificationPreferences({
                      ...notificationPreferences,
                      courseUpdates: !notificationPreferences.courseUpdates,
                    })}
                    data-testid="course-updates-toggle"
                  >
                    <span className="sr-only">Enable course updates</span>
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200",
                        notificationPreferences.courseUpdates ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Notification preferences unavailable</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Your notification preferences couldn&apos;t be loaded at this time.</p>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => getNotificationPreferences()}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        }
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-start" data-testid="profile-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h1 className="text-lg font-medium leading-6 text-gray-900">Profile Settings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your account settings and preferences
            </p>
          </div>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
            <div className="border-b border-gray-200" data-testid="profile-tabs">
              <div className="sm:hidden">
                <label htmlFor="tabs" className="sr-only">Select a tab</label>
                <select
                  id="tabs"
                  name="tabs"
                  className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as TabType)}
                >
                  <option value="profile">Profile</option>
                  <option value="password">Password</option>
                  <option value="account">Account</option>
                  <option value="statistics">Statistics</option>
                  <option value="notifications">Notifications</option>
                  <option value="export">Export</option>
                </select>
              </div>
              <div className="hidden sm:block">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                      data-testid="profile-tab"
                      onClick={() => setActiveTab('profile')}
                      className={cn(
                        activeTab === 'profile'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                        'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
                      )}
                    >
                      Profile
                    </button>
                    <button
                      data-testid="password-tab"
                      onClick={() => setActiveTab('password')}
                      className={cn(
                        activeTab === 'password'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                        'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
                      )}
                    >
                      Password
                    </button>
                    <button
                      className={cn(
                        activeTab === 'account'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                        'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                      )}
                      onClick={() => setActiveTab('account')}
                      data-testid="account-tab"
                    >
                      Account
                    </button>
                    <button
                      className={cn(
                        activeTab === 'statistics'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                        'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                      )}
                      onClick={() => setActiveTab('statistics')}
                      data-testid="statistics-tab"
                    >
                      Account Statistics
                    </button>
                    <button
                      className={cn(
                        activeTab === 'notifications'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                        'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                      )}
                      onClick={() => setActiveTab('notifications')}
                      data-testid="notifications-tab"
                    >
                      Notifications
                    </button>
                    <button
                      className={cn(
                        activeTab === 'export'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                        'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                      )}
                      onClick={() => setActiveTab('export')}
                      data-testid="export-tab"
                    >
                      Data Export
                    </button>
                  </nav>
                </div>
              </div>
            </div>

            {activeTab === 'profile' && (
              <div data-testid="profile-form">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
                  <p className="mt-1 text-sm text-gray-500">Update your personal information.</p>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                  <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        data-testid="profile-email"
                        type="email"
                        {...registerProfile('email')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                      {profileErrors.email && (
                        <p className="mt-2 text-sm text-red-600">{profileErrors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                        Full Name
                      </label>
                      <input
                        data-testid="profile-full-name"
                        type="text"
                        {...registerProfile('fullName')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                      {profileErrors.fullName && (
                        <p className="mt-2 text-sm text-red-600">{profileErrors.fullName.message}</p>
                      )}
                    </div>

                    <button
                      data-testid="save-profile-button"
                      type="submit"
                      disabled={isProfileLoading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      {isProfileLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                  {formError && (
                    <div data-testid="profile-error" className="mt-4 rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-red-800">{formError}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'password' && (
              <div data-testid="password-form">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg font-medium text-gray-900">Change Password</h2>
                  <p className="mt-1 text-sm text-gray-500">Update your password.</p>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                  <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
                    <div>
                      <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
                        Current Password
                      </label>
                      <input
                        data-testid="current-password-input"
                        type="password"
                        {...registerPassword('current_password')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                      {passwordErrors.current_password && (
                        <p className="mt-2 text-sm text-red-600">{passwordErrors.current_password.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <input
                        data-testid="new-password-input"
                        type="password"
                        {...registerPassword('new_password')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                      {passwordErrors.new_password && (
                        <p className="mt-2 text-sm text-red-600">{passwordErrors.new_password.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                        Confirm Password
                      </label>
                      <input
                        data-testid="confirm-password-input"
                        type="password"
                        {...registerPassword('confirm_password')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                      {passwordErrors.confirm_password && (
                        <p className="mt-2 text-sm text-red-600">{passwordErrors.confirm_password.message}</p>
                      )}
                    </div>

                    <button
                      data-testid="save-password-button"
                      type="submit"
                      disabled={isPasswordLoading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      {isPasswordLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'statistics' && renderStatisticsTab()}

            {activeTab === 'notifications' && renderNotificationsTab()}

            {activeTab === 'export' && renderExportTab()}

            {activeTab === 'account' && (
              <div className="px-4 py-5 sm:p-6" data-testid="delete-account-section">
                <div className="space-y-6">
                  <div data-testid="delete-account-section">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Delete Account</h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-500">
                      <p>
                        Once you delete your account, you will lose all data associated with it.
                      </p>
                    </div>
                    <div className="mt-5">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
                        onClick={() => setShowDeleteDialog(true)}
                        data-testid="delete-account-button"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Account Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed z-10 inset-0 overflow-y-auto" data-testid="delete-account-confirmation">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Account
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete your account? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm"
                    onClick={handleDeleteAccount}
                    data-testid="confirm-delete-button"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                    onClick={() => setShowDeleteDialog(false)}
                    data-testid="cancel-delete-button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {(profileSuccess || passwordSuccess) && (
          <div className="rounded-md bg-green-50 p-4 mt-6" data-testid="success-notification">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  {profileSuccess ? 'Profile updated successfully!' : 'Password changed successfully!'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;