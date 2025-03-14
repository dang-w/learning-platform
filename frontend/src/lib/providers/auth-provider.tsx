'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { usePathname, useRouter } from 'next/navigation';

interface AuthProviderProps {
  children: ReactNode;
}

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/resources',
  '/learning-path',
  '/reviews',
  '/progress',
];

// Auth routes that should redirect to dashboard if already authenticated
const authRoutes = [
  '/auth/login',
  '/auth/register',
];

export function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, fetchUser, refreshToken } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to refresh the token first
        const refreshed = await refreshToken();

        // If token refresh was successful or user is already authenticated, fetch user data
        if (refreshed || isAuthenticated) {
          await fetchUser();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [fetchUser, refreshToken, isAuthenticated]);

  useEffect(() => {
    if (isLoading) return;

    // Handle route protection on client side as well (in addition to middleware)
    const isProtectedRoute = protectedRoutes.some(route => pathname?.startsWith(route));
    const isAuthRoute = authRoutes.some(route => pathname?.startsWith(route));

    if (isProtectedRoute && !isAuthenticated) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(pathname || '')}`);
    } else if (isAuthRoute && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, pathname, router, isLoading]);

  // Show loading state while initializing auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}