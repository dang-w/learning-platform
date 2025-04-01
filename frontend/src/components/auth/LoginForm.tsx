'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { LoadingScreen } from '@/components/ui/feedback/loading-screen';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const { login, error, clearError, isLoading: storeLoading, validationErrors: storeValidationErrors } = useAuthStore();

  // Sync store validation errors with local state
  useEffect(() => {
    if (storeValidationErrors) {
      setValidationErrors(storeValidationErrors);
    }
  }, [storeValidationErrors]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('[LoginForm DEBUG] 1. handleSubmit triggered.');

    // Set validation errors synchronously
    console.log('[LoginForm DEBUG] 2. Checking local validation...');
    const errors: Record<string, string> = {};
    if (!username) errors.username = 'Username is required';
    if (!password) errors.password = 'Password is required';
    console.log('[LoginForm DEBUG] 3. Local validation check done. Errors:', errors);

    // If there are validation errors, set them and return early
    if (Object.keys(errors).length > 0) {
      console.log('[LoginForm DEBUG] 4. Local validation FAILED. Returning early.');
      setValidationErrors(errors);
      return;
    }
    console.log('[LoginForm DEBUG] 4. Local validation PASSED.');

    setIsSubmitting(true);
    clearError();
    console.log('[LoginForm DEBUG] 5. Set isSubmitting=true, called clearError.');

    try {
      console.log('[LoginForm DEBUG] 6. Entering try block, about to call login()...');
      await login(username, password);
      console.log('[LoginForm SUCCESS] authStore.login completed. Navigating to dashboard...');
      router.push('/dashboard');
    } catch (error) {
      console.error('[LoginForm ERROR] Error during login call or navigation:', error);
    } finally {
      console.log('[LoginForm END] handleSubmit finished.');
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || storeLoading;
  const currentValidationErrors = { ...validationErrors, ...storeValidationErrors };

  return (
    <>
      {isLoading && <LoadingScreen data-testid="loading-screen" />}

      <form onSubmit={handleSubmit} className="space-y-4" role="form">
        {error && (
          <div className="p-4 bg-red-50 text-red-900 rounded" role="alert">
            <p data-testid="error-message">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setUsername(e.target.value);
                setValidationErrors(prev => ({ ...prev, username: '' }));
              }}
              disabled={isLoading}
              required
              className="w-full p-2 border rounded"
              data-testid="username-input"
              aria-invalid={!!currentValidationErrors.username}
            />
            {currentValidationErrors.username && (
              <p className="text-red-500 text-sm mt-1 error-message" data-testid="error-username">
                {currentValidationErrors.username}
              </p>
            )}
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPassword(e.target.value);
                setValidationErrors(prev => ({ ...prev, password: '' }));
              }}
              disabled={isLoading}
              required
              className="w-full p-2 border rounded"
              data-testid="password-input"
              aria-invalid={!!currentValidationErrors.password}
            />
            {currentValidationErrors.password && (
              <p className="text-red-500 text-sm mt-1 error-message" data-testid="error-password">
                {currentValidationErrors.password}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full p-2 bg-blue-600 text-white rounded disabled:opacity-50"
          data-testid="submit-button"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </>
  );
}