'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Full name is required'),
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

export default function ProfilePage() {
  const { user, updateProfile, changePassword, error, clearError } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || '',
      full_name: user?.full_name || '',
    },
  });

  const {
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsProfileLoading(true);
    setProfileSuccess(false);
    clearError();

    try {
      await updateProfile({
        email: data.email,
        full_name: data.full_name,
      });
      setProfileSuccess(true);
    } catch (error) {
      console.error('Profile update error:', error);
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

  const handleDeleteAccount = () => {
    // Simulated account deletion
    setShowDeleteDialog(false);
    router.push('/auth/login');
  };

  if (!user) {
    // Redirect to login if not authenticated
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="border-b border-gray-200">
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
                  className={cn(
                    activeTab === 'profile'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                    'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                  )}
                  onClick={() => setActiveTab('profile')}
                  data-testid="profile-tab"
                >
                  Profile
                </button>
                <button
                  className={cn(
                    activeTab === 'password'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                    'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                  )}
                  onClick={() => setActiveTab('password')}
                  data-testid="change-password-tab"
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
                  data-testid="account-statistics-tab"
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
                  data-testid="data-export-tab"
                >
                  Data Export
                </button>
              </nav>
            </div>
          </div>
        </div>

        {activeTab === 'profile' && (
          <div>
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
              <p className="mt-1 text-sm text-gray-500">Update your personal information.</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <form onSubmit={handleProfileSubmit(onProfileSubmit)} data-testid="profile-form">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={user.username}
                      disabled
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 cursor-not-allowed"
                      data-testid="username-field"
                    />
                    <p className="mt-1 text-sm text-gray-500">Username cannot be changed.</p>
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      {...registerProfile('email')}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      data-testid="email-field"
                    />
                    {profileErrors.email && (
                      <p className="mt-1 text-sm text-red-600" data-testid="email-error">{profileErrors.email.message}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="full_name"
                      {...registerProfile('full_name')}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      data-testid="fullname-field"
                    />
                    {profileErrors.full_name && (
                      <p className="mt-1 text-sm text-red-600" data-testid="fullname-error">{profileErrors.full_name.message}</p>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-md bg-red-50 p-4" data-testid="profile-error">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Update failed</h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{error}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {profileSuccess && (
                  <div className="mt-4 rounded-md bg-green-50 p-4" data-testid="profile-success">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Profile updated</h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>Your profile has been updated successfully.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isProfileLoading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="save-profile-button"
                  >
                    {isProfileLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div>
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Change Password</h2>
              <p className="mt-1 text-sm text-gray-500">Update your password.</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} data-testid="password-form">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="current_password"
                      name="current_password"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      data-testid="current-password-field"
                    />
                  </div>
                  <div>
                    <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="new_password"
                      name="new_password"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      data-testid="new-password-field"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirm_password"
                      name="confirm_password"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      data-testid="confirm-password-field"
                    />
                  </div>
                </div>

                {passwordSuccess && (
                  <div className="mt-4 rounded-md bg-green-50 p-4" data-testid="password-success">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Password updated</h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>Your password has been updated successfully.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="change-password-button"
                  >
                    {isPasswordLoading ? 'Updating...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="px-4 py-5 sm:p-6" data-testid="account-statistics">
            <h2 className="text-lg font-medium text-gray-900">Account Statistics</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Resources</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed Resources</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="px-4 py-5 sm:p-6" data-testid="notification-preferences">
            <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
            <div className="mt-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="email_notifications"
                      name="email_notifications"
                      type="checkbox"
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="email_notifications" className="font-medium text-gray-700">
                      Email Notifications
                    </label>
                    <p className="text-gray-500">Receive email notifications about your learning progress.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900">Data Export</h2>
            <div className="mt-6">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => {/* TODO: Implement data export */}}
                data-testid="export-data-button"
              >
                Export My Data
              </button>
              <p className="mt-2 text-sm text-gray-500">
                Download a copy of your personal data including your profile information, learning progress, and activity history.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="px-4 py-5 sm:p-6">
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

      {/* Add success notification */}
      {(profileSuccess || passwordSuccess) && (
        <div className="fixed bottom-0 inset-x-0 pb-2 sm:pb-5" data-testid="success-notification">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
            <div className="p-2 rounded-lg bg-green-600 shadow-lg sm:p-3">
              <div className="flex items-center justify-between flex-wrap">
                <div className="w-0 flex-1 flex items-center">
                  <p className="ml-3 font-medium text-white truncate">
                    <span className="md:hidden">
                      {profileSuccess ? 'Profile updated!' : 'Password changed!'}
                    </span>
                    <span className="hidden md:inline">
                      {profileSuccess ? 'Your profile has been updated successfully!' : 'Your password has been changed successfully!'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}