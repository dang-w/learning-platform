'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';

export function AuthInitializer({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    // Call initializeFromStorage directly from the store state
    useAuthStore.getState().initializeFromStorage();
  }, []); // Empty dependency array ensures this runs only once on mount

  // This component now just handles initialization
  // The actual provider will wrap this
  return <>{children}</>;
}