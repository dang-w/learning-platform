"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { tokenService } from '@/lib/services/token-service';

interface TokenInfo {
  token: string;
  refreshToken: string;
  sessionId: string;
  isTokenExpired: boolean;
  shouldRefreshToken: boolean;
}

export default function AuthDebugPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({
    token: '',
    refreshToken: '',
    sessionId: '',
    isTokenExpired: false,
    shouldRefreshToken: false
  });

  useEffect(() => {
    // Get token information
    const token = tokenService.getToken();
    const refreshToken = tokenService.getRefreshToken();
    const isTokenExpired = tokenService.isTokenExpired();
    const shouldRefreshToken = tokenService.shouldRefreshToken();

    setTokenInfo({
      token: token || '',
      refreshToken: refreshToken || '',
      sessionId: '', // Session ID is now managed by the backend
      isTokenExpired,
      shouldRefreshToken
    });
  }, []);

  const handleClearAuth = () => {
    tokenService.clearTokens();
    window.location.reload();
  };

  if (typeof user === 'undefined') {
    return (
      <div className="flex min-h-screen flex-col items-center p-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Auth Debug Information</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Authentication State</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">Is Authenticated:</span>{' '}
            <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
              {isAuthenticated ? 'Yes' : 'No'}
            </span>
          </p>
          <p>
            <span className="font-medium">User:</span>{' '}
            {user ? JSON.stringify(user, null, 2) : 'Not logged in'}
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Token Information</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">Access Token:</span>{' '}
            <span className="font-mono text-sm">
              {tokenInfo.token ? `${tokenInfo.token.substring(0, 20)}...` : 'None'}
            </span>
          </p>
          <p>
            <span className="font-medium">Refresh Token:</span>{' '}
            <span className="font-mono text-sm">
              {tokenInfo.refreshToken ? `${tokenInfo.refreshToken.substring(0, 20)}...` : 'None'}
            </span>
          </p>
          <p>
            <span className="font-medium">Token Expired:</span>{' '}
            <span className={tokenInfo.isTokenExpired ? 'text-red-600' : 'text-green-600'}>
              {tokenInfo.isTokenExpired ? 'Yes' : 'No'}
            </span>
          </p>
          <p>
            <span className="font-medium">Should Refresh Token:</span>{' '}
            <span className={tokenInfo.shouldRefreshToken ? 'text-yellow-600' : 'text-green-600'}>
              {tokenInfo.shouldRefreshToken ? 'Yes' : 'No'}
            </span>
          </p>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handleClearAuth}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
        >
          Clear Auth State
        </button>
      </div>
    </div>
  );
}