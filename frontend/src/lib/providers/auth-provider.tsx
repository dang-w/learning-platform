'use client';

import React from 'react';
import { AuthContext } from '@/lib/store/contexts/auth-context';
import { useAuthStore } from '@/lib/store/auth-store';

/**
 * Provides the authentication state (Zustand store instance) to the application
 * using React Context.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Get the Zustand store instance. Note: This hook ensures the store is
  // only created once and its state persists across renders.
  const store = useAuthStore();

  return (
    <AuthContext.Provider value={store}>
      {children}
    </AuthContext.Provider>
  );
}