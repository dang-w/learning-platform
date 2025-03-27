'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { tokenService } from '@/lib/services/token-service';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');

  useEffect(() => {
    // Clear any existing tokens on the login page
    tokenService.clearTokens();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
          {registered && (
            <div className="mt-4 p-4 rounded-md bg-green-50">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3" data-testid="registration-success">
                  <h3 className="text-sm font-medium text-green-800">Registration successful</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Your account has been created. Please sign in with your credentials.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <LoginForm />
      </div>
    </div>
  );
}