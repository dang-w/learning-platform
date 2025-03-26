'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, error, clearError, isLoading: storeLoading } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Clear error when component mounts or when search params change
  useEffect(() => {
    console.log('Login page mounted, clearing states');
    clearError();
    setLoginError(null);
    setIsLoading(false);

    // Check if redirected from successful registration
    if (searchParams?.get('registered') === 'true') {
      setRegistrationSuccess(true);
    }

    // Debug current auth state
    const currentAuthState = useAuthStore.getState();
    console.log('Current auth state:', {
      isAuthenticated: currentAuthState.isAuthenticated,
      hasToken: !!currentAuthState.token,
      storeLoading: currentAuthState.isLoading
    });
  }, [clearError, searchParams]);

  // Monitor loading states and auth state changes
  useEffect(() => {
    const currentAuthState = useAuthStore.getState();
    console.log('State update:', {
      componentLoading: isLoading,
      storeLoading,
      error,
      loginError,
      isAuthenticated: currentAuthState.isAuthenticated,
      hasToken: !!currentAuthState.token
    });

    // If we somehow got authenticated but didn't redirect
    if (currentAuthState.isAuthenticated && currentAuthState.token) {
      console.log('Detected authenticated state, redirecting to:', callbackUrl);
      window.location.href = callbackUrl;
    }
  }, [isLoading, storeLoading, error, loginError, callbackUrl]);

  const onSubmit = async (data: LoginFormValues) => {
    console.log('Login form submitted');

    // Prevent multiple submissions
    if (isLoading || storeLoading) {
      console.log('Login already in progress, ignoring submission');
      return;
    }

    // Reset all states
    setIsLoading(true);
    clearError();
    setLoginError(null);

    try {
      console.log('Starting login process for user:', data.username);

      // Clear any existing auth data
      if (typeof window !== 'undefined') {
        console.log('Clearing existing auth data');
        localStorage.clear(); // Clear all localStorage to ensure clean state
      }

      console.log('Calling login function');
      await login(data.username, data.password);
      console.log('Login function completed successfully');

      // Verify auth state after login
      const authState = useAuthStore.getState();
      console.log('Auth state after login:', {
        isAuthenticated: authState.isAuthenticated,
        hasToken: !!authState.token,
        hasUser: !!authState.user,
        isLoading: authState.isLoading
      });

      // Check localStorage state
      const token = localStorage.getItem('token');
      const tokenExpiry = localStorage.getItem('token_expiry');
      console.log('localStorage after login:', {
        hasToken: !!token,
        hasTokenExpiry: !!tokenExpiry,
        token: token ? `${token.substring(0, 6)}...` : null
      });

      if (!token || !tokenExpiry) {
        throw new Error('Login failed - authentication token not stored');
      }

      if (!authState.isAuthenticated || !authState.token) {
        throw new Error('Login failed - authentication state not updated');
      }

      // If we get here, login was successful
      console.log('Login successful, redirecting to:', callbackUrl);
      window.location.href = callbackUrl;
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to login. Please check your credentials and try again.';

      // Log final state for debugging
      const finalAuthState = useAuthStore.getState();
      console.log('Final auth state after error:', {
        isAuthenticated: finalAuthState.isAuthenticated,
        hasToken: !!finalAuthState.token,
        isLoading: finalAuthState.isLoading,
        error: errorMessage
      });

      clearError();
      setLoginError(errorMessage);
      setIsLoading(false);
    }
  };

  // Show loading state with more debug info
  if (isLoading || storeLoading) {
    console.log('Rendering loading state, current states:', {
      componentLoading: isLoading,
      storeLoading,
      error,
      loginError
    });
    return (
      <div className="sm:mx-auto sm:w-full sm:max-w-md mt-8">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
          <p className="text-center mt-4 text-gray-600">Signing in...</p>
          {(error || loginError) && (
            <p className="text-center mt-2 text-sm text-red-600">
              {loginError || error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md mt-8">
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <div className="mt-1">
              <input
                id="username"
                type="text"
                autoComplete="username"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                {...register('username')}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600" data-testid="error-username">{errors.username.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600" data-testid="error-password">{errors.password.message}</p>
              )}
            </div>
          </div>

          {registrationSuccess && (
            <div className="rounded-md bg-green-50 p-4 mb-4" data-testid="registration-success">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Registration successful</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Your account has been created. Please log in with your credentials.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(error || loginError) && (
            <div className="rounded-md bg-red-50 p-4" data-testid="login-error">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Login failed</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{loginError || error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-center">
              <Link
                href="/auth/register"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Create a new account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}