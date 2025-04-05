'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/lib/store/contexts/auth-context';
import Navbar from './navbar';
import Sidebar from './sidebar';
import { tokenService } from '@/lib/services/token-service';

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * Check if we're in a Cypress test environment with auth bypass enabled
 */
const isCypressAuthBypass = () => {
  return !!tokenService.getMetadata('cypress_test_auth_bypass');
};

export default function MainLayout({ children }: MainLayoutProps) {
  const { initializeFromStorage, isAuthenticated, isLoading, error } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      // Skip auth check if we're in Cypress with auth bypass
      if (isCypressAuthBypass()) {
        console.log('Cypress auth bypass detected, skipping auth check');
        return;
      }

      // Check if we have a valid token
      const token = tokenService.getToken();
      console.log('Main layout mounted, token present:', !!token);

      if (token) {
        try {
          // Initialize auth state from storage
          await initializeFromStorage();
        } catch (error: unknown) {
          console.error('Error initializing auth state:', error instanceof Error ? error.message : 'Unknown error');
        }
      }

      setAuthChecked(true);
    };

    initAuth();
  }, [initializeFromStorage]);

  // Handle redirection with delay to avoid redirect loops
  useEffect(() => {
    // Skip redirection in Cypress tests
    if (isCypressAuthBypass()) {
      return;
    }

    let redirectTimeout: NodeJS.Timeout;

    if ((!authChecked || !isAuthenticated) && !pathname.startsWith('/auth') && pathname !== '/') {
      redirectTimeout = setTimeout(() => {
        router.push('/auth/login');
      }, 300); // Small delay to avoid race conditions
    } else if (authChecked && isAuthenticated && pathname.startsWith('/auth')) {
      redirectTimeout = setTimeout(() => {
        router.push('/dashboard');
      }, 300);
    }

    return () => {
      if (redirectTimeout) clearTimeout(redirectTimeout);
    };
  }, [authChecked, isAuthenticated, router, pathname]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center" data-testid="loading-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Show error state
  if (error && !pathname.startsWith('/auth')) {
    return (
      <div className="flex h-screen items-center justify-center" data-testid="error-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  // If we're on the auth pages, don't show the layout
  if (pathname.startsWith('/auth')) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}