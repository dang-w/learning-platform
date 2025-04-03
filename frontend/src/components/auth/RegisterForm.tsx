'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { LoadingScreen } from '@/components/ui/feedback/loading-screen';

export default function RegisterForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const { register, login, error, clearError, isLoading: storeLoading, validationErrors: storeValidationErrors } = useAuthStore();

  // Sync store validation errors with local state
  useEffect(() => {
    if (storeValidationErrors) {
      setValidationErrors(storeValidationErrors);
    }
  }, [storeValidationErrors]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('[RegisterForm START] handleSubmit triggered.');

    // Set validation errors synchronously
    const errors: Record<string, string> = {};
    if (!username) errors.username = 'Username is required';
    if (!email) errors.email = 'Email is required';
    if (!firstName) errors.firstName = 'First name is required';
    if (!lastName) errors.lastName = 'Last name is required';
    if (!password) errors.password = 'Password is required';
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm Password is required';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // If there are validation errors, set them and return early
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      console.log('[RegisterForm STEP] Calling authStore.register...', { username, email });
      await register(username, email, password, confirmPassword, firstName, lastName);
      console.log('[RegisterForm SUCCESS] authStore.register completed. Attempting login...');
      try {
        console.log('[RegisterForm STEP] Calling authStore.login...', { username });
        await login(username, password);
        console.log('[RegisterForm SUCCESS] authStore.login completed. Navigating to dashboard...');
        router.push('/dashboard');
      } catch {
        console.log('[RegisterForm INFO] Post-registration login failed. Navigating to login page.');
        router.push('/auth/login?registered=true');
      }
    } catch (error) {
      console.error('[RegisterForm ERROR] Error during registration call:', error);
    } finally {
      console.log('[RegisterForm END] handleSubmit finished.');
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
              placeholder="First Name"
              value={firstName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFirstName(e.target.value);
                setValidationErrors(prev => ({ ...prev, firstName: '' }));
              }}
              disabled={isLoading}
              required
              className="w-full p-2 border rounded"
              data-testid="first-name-input"
              aria-invalid={!!currentValidationErrors.firstName}
            />
            {currentValidationErrors.firstName && (
              <p className="text-red-500 text-sm mt-1 error-message" data-testid="error-first-name">
                {currentValidationErrors.firstName}
              </p>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setLastName(e.target.value);
                setValidationErrors(prev => ({ ...prev, lastName: '' }));
              }}
              disabled={isLoading}
              required
              className="w-full p-2 border rounded"
              data-testid="last-name-input"
              aria-invalid={!!currentValidationErrors.lastName}
            />
            {currentValidationErrors.lastName && (
              <p className="text-red-500 text-sm mt-1 error-message" data-testid="error-last-name">
                {currentValidationErrors.lastName}
              </p>
            )}
          </div>

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
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setEmail(e.target.value);
                setValidationErrors(prev => ({ ...prev, email: '' }));
              }}
              disabled={isLoading}
              required
              className="w-full p-2 border rounded"
              data-testid="email-input"
              aria-invalid={!!currentValidationErrors.email}
            />
            {currentValidationErrors.email && (
              <p className="text-red-500 text-sm mt-1 error-message" data-testid="error-email">
                {currentValidationErrors.email}
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
                setValidationErrors(prev => ({ ...prev, password: '', confirmPassword: '' }));
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

          <div>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setConfirmPassword(e.target.value);
                setValidationErrors(prev => ({ ...prev, confirmPassword: '' }));
              }}
              disabled={isLoading}
              required
              className="w-full p-2 border rounded"
              data-testid="confirm-password-input"
              aria-invalid={!!currentValidationErrors.confirmPassword}
            />
            {currentValidationErrors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1 error-message" data-testid="error-confirm-password">
                {currentValidationErrors.confirmPassword}
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
          {isLoading ? 'Creating account...' : 'Register'}
        </button>
      </form>
    </>
  );
}