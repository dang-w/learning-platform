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
  const { login, error, clearError } = useAuthStore();
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
    clearError();
    setLoginError(null);

    // Check if redirected from successful registration
    if (searchParams?.get('registered') === 'true') {
      setRegistrationSuccess(true);
    }
  }, [clearError, searchParams]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    clearError();
    setLoginError(null);

    try {
      console.log('Attempting login for user:', data.username);

      // First try clearing any existing auth data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('sessionId');

        // Also clear cookies
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }

      await login(data.username, data.password);

      // Double-check token was stored
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refresh_token');
      const sessionId = localStorage.getItem('sessionId');

      // Check if token is in cookies
      const tokenCookie = document.cookie.split(';').find(c => c.trim().startsWith('token='));
      const refreshTokenCookie = document.cookie.split(';').find(c => c.trim().startsWith('refresh_token='));

      console.log('Auth after login:', {
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        hasSessionId: !!sessionId,
        hasCookie: !!tokenCookie,
        hasRefreshCookie: !!refreshTokenCookie,
        token: token ? `${token.substring(0, 6)}...` : null
      });

      if (!token) {
        console.error('Login appeared successful but no token was stored');
        throw new Error('Login failed - authentication token not received');
      }

      // Set token in document.cookie for middleware if it's not there
      if (!tokenCookie) {
        console.log('Token not found in cookies, setting it now');
        document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
      }

      // Set refresh token in document.cookie for middleware if it's not there
      if (refreshToken && !refreshTokenCookie) {
        console.log('Refresh token not found in cookies, setting it now');
        document.cookie = `refresh_token=${refreshToken}; path=/; max-age=86400; SameSite=Lax`;
      }

      // Check authentication state in the store
      const authState = useAuthStore.getState();
      console.log('Auth state after login:', {
        isAuthenticated: authState.isAuthenticated,
        hasToken: !!authState.token,
        hasRefreshToken: !!authState.refreshToken,
        hasUser: !!authState.user
      });

      // Add a longer delay to ensure token and auth state are properly set before redirect
      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('Login successful, redirecting to:', callbackUrl);

      // Force a hard redirect instead of using router to ensure fresh state
      window.location.href = callbackUrl;
    } catch (error) {
      console.error('Login error:', error);

      // Create an error message based on the error type
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to login. Please check your credentials and try again.';

      // Use the proper error handling method
      clearError(); // Clear any existing errors first and set our local error state
      setLoginError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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