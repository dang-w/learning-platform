import { createContext, useContext } from 'react';
import type { AuthState } from '../types';

export const AuthContext = createContext<AuthState | null>(null);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};