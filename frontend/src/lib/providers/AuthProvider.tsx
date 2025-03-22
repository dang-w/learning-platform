import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth-store';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, token, fetchUser, refreshAuthToken } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [lastPathRefresh, setLastPathRefresh] = useState<{path: string, time: number} | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Main initialization effect
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('AuthProvider initializing...');
      setIsLoading(true);

      try {
        // Check if token exists but user is not loaded
        if (token && !user) {
          console.log('AuthProvider: Token exists but no user data, fetching user');
          await fetchUser().catch(error => {
            console.error('AuthProvider: Error fetching user:', error);
          });
        }

        // Check if we've recently refreshed for this path to prevent too many refresh requests
        const now = Date.now();
        const shouldRefreshForPath = !lastPathRefresh ||
          lastPathRefresh.path !== pathname ||
          (now - lastPathRefresh.time > 60000); // Only refresh once per minute per path

        // Proactively refresh the token when dashboard or private pages load
        if (isAuthenticated &&
            shouldRefreshForPath &&
            (pathname?.startsWith('/dashboard') ||
             pathname?.startsWith('/courses') ||
             pathname?.startsWith('/profile'))) {
          console.log('AuthProvider: Proactively refreshing token for protected route');
          const success = await refreshAuthToken();

          // Update last path refresh timestamp
          setLastPathRefresh({
            path: pathname || '',
            time: Date.now()
          });

          if (!success) {
            console.warn('AuthProvider: Token refresh failed, but continuing with existing token');
            // We'll continue even with refresh failure, the token might still be valid
          }
        }
      } catch (error) {
        console.error('AuthProvider initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [isAuthenticated, token, user, fetchUser, refreshAuthToken, pathname, router, lastPathRefresh]);

  // Set up periodic token refresh when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('AuthProvider: Setting up token refresh interval');
    const refreshInterval = setInterval(async () => {
      console.log('AuthProvider: Performing scheduled token refresh');
      await refreshAuthToken();
    }, 15 * 60 * 1000); // Refresh every 15 minutes (increased from 10 minutes)

    return () => {
      console.log('AuthProvider: Clearing token refresh interval');
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated, refreshAuthToken]);

  if (isLoading) {
    return <div className="loading">Loading authentication...</div>;
  }

  return <>{children}</>;
};