'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import Navbar from './navbar';
import Sidebar from './sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { isAuthenticated, fetchUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');

    // If we have a token but no user, fetch the user
    if (token && !isAuthenticated) {
      fetchUser();
    }

    // If we're not on the auth pages and not authenticated, redirect to login
    if (!isAuthenticated && !pathname.startsWith('/auth') && pathname !== '/') {
      router.push('/auth/login');
    }

    // If we're on the auth pages and authenticated, redirect to dashboard
    if (isAuthenticated && pathname.startsWith('/auth')) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, fetchUser, router, pathname]);

  // If we're on the auth pages, don't show the layout
  if (pathname.startsWith('/auth') || pathname === '/') {
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