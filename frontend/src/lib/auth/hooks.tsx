"use client";

import { useContext, createContext } from 'react';
import { User } from '../api/auth';
import { useAuthStore } from '../store/auth-store';

interface AuthContextType {
  isInitialized: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  user: User | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Hook to access auth context values
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to access the current user
 */
export function useCurrentUser() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  return { user, isAuthenticated, isLoading };
}

// Export the context for use in the main AuthProvider
export { AuthContext };