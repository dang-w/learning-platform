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

    // Set validation errors synchronously
    const errors: Record<string, string> = {};
    if (!username) errors.username = 'Username is required';
    if (!password) errors.password = 'Password is required';

    // If there are validation errors, set them and return early
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      await login(username, password);
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
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