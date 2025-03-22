'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface AuthProviderProps {
  children: React.ReactNode;
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

export function AuthProvider({ children }: AuthProviderProps) {
  const {
    isAuthenticated,
    token,
    fetchUser,
    refreshAuthToken,
    logout,
    setDirectAuthState
  } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auth routes that don't require authentication
  const authRoutes = useMemo(() => ['/auth/login', '/auth/register', '/auth/forgot-password'], []);
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  // Flag to determine if we're on an auth page
  const isOnAuthPage = pathname.includes('/auth/');

  // Skip loading indicator for auth-related pages
  useEffect(() => {
    if (isOnAuthPage) {
      setIsLoading(false);
    }
  }, [isOnAuthPage]);

  useEffect(() => {
    // Skip token refresh if already set or on auth pages
    const isAuthPage = pathname.includes('/auth/');

    if (isAuthenticated && token && !isAuthPage) {
      console.log('AuthProvider: Already authenticated with token, skipping setup');
      setIsLoading(false);
      return;
    }

    const checkAndSetTokens = async () => {
      try {
        // Check localStorage first
        const storedToken = localStorage.getItem('token');

        if (storedToken) {
          console.log('AuthProvider: Token found in localStorage, verifying...');

          // Set token in state if not already set
          if (!token) {
            console.log('AuthProvider: Setting token in auth state from localStorage');
            setDirectAuthState(storedToken, true);
          }

          // Verify token by fetching user data
          try {
            console.log('AuthProvider: Verifying token by fetching user data');
            await fetchUser();
            console.log('AuthProvider: User data fetched successfully, token is valid');
          } catch (error) {
            console.error('AuthProvider: Token verification failed, attempting refresh', error);

            // If token verification fails, try to refresh
            try {
              console.log('AuthProvider: Attempting token refresh');
              const refreshed = await refreshAuthToken();

              if (refreshed) {
                console.log('AuthProvider: Token refresh successful');
                await fetchUser();
              } else {
                console.warn('AuthProvider: Token refresh failed, clearing auth state');
                logout();
              }
            } catch (refreshError) {
              console.error('AuthProvider: Token refresh failed, clearing auth state', refreshError);
              logout();
            }
          }
        } else if (!isAuthPage) {
          console.warn('AuthProvider: No token found in localStorage and not on auth page');
        }
      } catch (error) {
        console.error('AuthProvider: Error during token setup:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Run token check
    if (!isAuthPage) {
      checkAndSetTokens();
    } else {
      setIsLoading(false);
    }
  }, [pathname, token, isAuthenticated, fetchUser, refreshAuthToken, logout, setDirectAuthState]);

  useEffect(() => {
    if (isLoading) return;

    // If login is being processed manually via form, don't interfere with redirects
    if (pathname?.includes('/auth/login?callbackUrl=')) {
      console.log('Login with callback in progress, skipping automatic redirects');
      return;
    }

    // Get the callback URL from searchParams
    const targetUrl = pathname?.startsWith('/auth/login') ? callbackUrl : '/dashboard';

    // Handle route protection on client side as well (in addition to middleware)
    const isProtectedRoute = protectedRoutes.some(route => pathname?.startsWith(route));
    const isAuthRoute = authRoutes.some(route => pathname?.startsWith(route));

    if (isProtectedRoute && !isAuthenticated) {
      console.log('Protected route detected, redirecting to login');
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(pathname || '')}`);
    } else if (isAuthRoute && isAuthenticated && !pathname?.includes('?callbackUrl=')) {
      console.log('Auth route with authenticated user, redirecting to:', targetUrl);

      // Add a small delay to avoid race conditions with other redirects
      setTimeout(() => {
        router.push(targetUrl);
      }, 100);
    }
  }, [isAuthenticated, pathname, router, isLoading, callbackUrl, authRoutes]);

  // Show loading state while initializing auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}