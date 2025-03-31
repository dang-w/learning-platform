import { useEffect } from 'react';
import { tokenService } from '@/lib/services/token-service';
import { useAuthStore } from '@/lib/store/auth-store';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    initializeFromStorage
  } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        await initializeFromStorage();
      } catch (error) {
        console.error('Error initializing auth:', error);
      }
    };

    // Initialize auth state
    initialize();

    // Set up token change listener
    const unsubscribe = tokenService.onTokenChange((token) => {
      if (!token && mounted) {
        // Token was removed, trigger re-initialization
        initialize();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [initializeFromStorage]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error
  };
}