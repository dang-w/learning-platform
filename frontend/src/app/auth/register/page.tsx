'use client';

import { useEffect } from 'react';
import { tokenService } from '@/lib/services/token-service';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  useEffect(() => {
    // Clear any existing tokens on the register page
    tokenService.clearTokens();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Create your account
          </h2>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}