import { useEffect, useRef } from 'react';
import authApi from '../api/auth';
import { useAuthStore } from '../store/auth-store';

/**
 * Hook to keep the user's session alive by periodically pinging
 * the server if the user is authenticated.
 *
 * @param intervalMs How often to update session activity (default: 5 minutes)
 * @returns void
 */
export function useSessionKeepAlive(intervalMs = 5 * 60 * 1000) {
  const { isAuthenticated } = useAuthStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only set up the timer if the user is authenticated
    if (isAuthenticated) {
      // Update session activity immediately
      authApi.updateSessionActivity();

      // Set up interval to update session activity
      timerRef.current = setInterval(async () => {
        await authApi.updateSessionActivity();
      }, intervalMs);
    }

    // Clean up timer on unmount or auth state change
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated, intervalMs]);
}

export default useSessionKeepAlive;