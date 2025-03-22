'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import Link from 'next/link';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  useEffect(() => {
    // Skip if still loading
    if (isLoading) return;

    // If already authenticated, redirect to callbackUrl or dashboard
    if (isAuthenticated) {
      console.log('Auth layout detected authenticated state, redirecting to:', callbackUrl);
      router.push(callbackUrl);
    }
  }, [isAuthenticated, isLoading, router, callbackUrl]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/">
          <h2 className="text-center text-3xl font-extrabold text-gray-900 cursor-pointer">
            AI/ML Learning Platform
          </h2>
        </Link>
      </div>

      {children}
    </div>
  );
}