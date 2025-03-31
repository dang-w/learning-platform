'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { LoadingScreen } from '@/components/ui/feedback/loading-screen';

export default function RegisterForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
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

    // Set validation errors synchronously
    const errors: Record<string, string> = {};
    if (!username) errors.username = 'Username is required';
    if (!email) errors.email = 'Email is required';
    if (!fullName) errors.fullname = 'Full name is required';
    if (!password) errors.password = 'Password is required';

    // If there are validation errors, set them and return early
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      await register(username, email, password, fullName);
      try {
        await login(username, password);
        router.push('/dashboard');
      } catch {
        router.push('/auth/login?registered=true');
      }
    } catch (error) {
      console.error('Registration error:', error);
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
              placeholder="Full Name"
              value={fullName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFullName(e.target.value);
                setValidationErrors(prev => ({ ...prev, fullname: '' }));
              }}
              disabled={isLoading}
              required
              className="w-full p-2 border rounded"
              data-testid="fullname-input"
              aria-invalid={!!currentValidationErrors.fullname}
            />
            {currentValidationErrors.fullname && (
              <p className="text-red-500 text-sm mt-1 error-message" data-testid="error-fullname">
                {currentValidationErrors.fullname}
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
          {isLoading ? 'Creating account...' : 'Register'}
        </button>
      </form>
    </>
  );
}