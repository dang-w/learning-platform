import { useEffect, useState } from 'react';
import authApi from '@/lib/api/auth';
import { User } from '@/lib/api/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage and cookies
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      try {
        // Check for token in localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found in localStorage');
          setIsAuthenticated(false);
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Validate token by fetching user data
        try {
          console.log('Token found, fetching user data');
          const userData = await authApi.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (userError) {
          console.error('Failed to fetch user data:', userError);

          // Token might be expired, try to refresh
          try {
            console.log('Trying to refresh token');

            // Try refreshing the token
            const refreshed = await authApi.refreshAuthToken();
            if (refreshed) {
              try {
                // Try fetching user data again with the new token
                const refreshedUserData = await authApi.getCurrentUser();
                setUser(refreshedUserData);
                setIsAuthenticated(true);
              } catch (refreshedUserError) {
                console.error('Failed to fetch user data after token refresh:', refreshedUserError);
                setIsAuthenticated(false);
                setUser(null);
              }
            } else {
              console.log('Token refresh failed');
              setIsAuthenticated(false);
              setUser(null);
            }
          } catch (refreshError) {
            console.error('Error during token refresh:', refreshError);
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.login({ username, password });
      if (result && result.token) {
        // Fetch user details after successful login
        const userData = await authApi.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to login. Please check your credentials.');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to logout');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    login,
    logout
  };
}

export default useAuth;