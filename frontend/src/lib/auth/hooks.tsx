"use client";

import { createContext, useContext, ReactNode, useEffect } from 'react';
import useAuth from '@/lib/hooks/useAuth';

// Create auth context
type AuthContextType = ReturnType<typeof useAuth>;

const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  // This effect ensures the token is synchronized across tabs
  useEffect(() => {
    const syncTokenHandler = (event: StorageEvent) => {
      if (event.key === 'token') {
        if (event.newValue && event.newValue !== event.oldValue) {
          // Token was updated in another tab
          document.cookie = `token=${event.newValue}; path=/; max-age=3600; SameSite=Lax`;
        } else if (!event.newValue) {
          // Token was removed in another tab
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        }
      }
    };

    window.addEventListener('storage', syncTokenHandler);
    return () => window.removeEventListener('storage', syncTokenHandler);
  }, []);

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for components to use auth context
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Export a wrapped auth hook that combines our context with the current user
export function useCurrentUser() {
  const { user, isAuthenticated, isLoading } = useAuthContext();
  return { user, isAuthenticated, isLoading };
}