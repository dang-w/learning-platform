'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LoadingScreen } from '@/components/ui/feedback/loading-screen';
import { tokenService } from '@/lib/services/token-service';
import { AuthContext } from '@/lib/auth/hooks';

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
    isLoading: storeLoading,
    initializeFromStorage,
    logout,
    user,
    error,
    refreshAuthToken
  } = useAuthStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auth routes that don't require authentication
  const authRoutes = useMemo(() => ['/auth/login', '/auth/register', '/auth/forgot-password'], []);
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  // Flag to determine if we're on an auth page
  const isOnAuthPage = pathname.includes('/auth/');

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Skip initialization if already done
        if (isInitialized) {
          console.log('AuthProvider: Already initialized');
          return;
        }

        // Skip initialization on auth pages
        if (isOnAuthPage) {
          console.log('AuthProvider: Skipping initialization on auth page');
          setIsInitialized(true);
          return;
        }

        console.log('AuthProvider: Starting initialization');
        const token = tokenService.getToken();
        console.log('AuthProvider: Token status:', token ? 'present' : 'absent');

        if (token && !tokenService.isTokenExpired()) {
          console.log('AuthProvider: Valid token found, initializing auth store');
          await initializeFromStorage();
        } else if (token) {
          console.log('AuthProvider: Found expired token, attempting refresh');
          const refreshed = await refreshAuthToken();
          if (!refreshed) {
            console.log('AuthProvider: Token refresh failed, clearing auth state');
            tokenService.clearTokens();
            logout();
          }
        } else {
          console.log('AuthProvider: No token found, starting fresh');
          tokenService.clearTokens();
        }

        if (mounted) {
          console.log('AuthProvider: Initialization complete');
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('AuthProvider: Error during initialization:', error);
        if (mounted) {
          tokenService.clearTokens();
          setIsInitialized(true);
        }
      }
    };

    initialize();

    // Set up token change listener
    const unsubscribe = tokenService.onTokenChange((token) => {
      console.log('AuthProvider: Token changed:', token ? 'present' : 'absent');
      if (!token && !isOnAuthPage) {
        logout();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [isInitialized, isOnAuthPage, initializeFromStorage, logout, refreshAuthToken]);

  // Handle route protection
  useEffect(() => {
    if (!isInitialized) {
      console.log('AuthProvider: Waiting for initialization before handling routes');
      return;
    }

    // If login is being processed manually via form, don't interfere with redirects
    if (pathname?.includes('/auth/login?callbackUrl=')) {
      console.log('AuthProvider: Login with callback in progress, skipping redirects');
      return;
    }

    // Get the callback URL from searchParams
    const targetUrl = pathname?.startsWith('/auth/login') ? callbackUrl : '/dashboard';

    // Handle route protection on client side as well (in addition to middleware)
    const isProtectedRoute = protectedRoutes.some(route => pathname?.startsWith(route));
    const isAuthRoute = authRoutes.some(route => pathname?.startsWith(route));

    if (isProtectedRoute && !isAuthenticated) {
      console.log('AuthProvider: Protected route detected, redirecting to login');
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(pathname || '')}`);
    } else if (isAuthRoute && isAuthenticated && !pathname?.includes('?callbackUrl=')) {
      console.log('AuthProvider: Auth route with authenticated user, redirecting to:', targetUrl);
      router.push(targetUrl);
    }
  }, [isAuthenticated, pathname, router, isInitialized, callbackUrl, authRoutes]);

  // Show loading state while initializing auth
  if (!isInitialized || storeLoading) {
    console.log('AuthProvider: Showing loading screen', { isInitialized, storeLoading });
    return (
      <LoadingScreen
        message="Initializing your session..."
        submessage="Please wait while we set up your workspace"
      />
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isInitialized,
        isLoading: storeLoading,
        isAuthenticated,
        error,
        user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}