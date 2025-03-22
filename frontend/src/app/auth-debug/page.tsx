"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import authApi from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/hooks';

interface TokenInfo {
  token: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  hasToken: boolean;
  hasRefreshToken: boolean;
  hasSessionId: boolean;
}

// Add preset endpoints for testing
const API_ENDPOINTS = [
  { name: 'Get User Profile', url: '/api/users/me' },
  { name: 'Get Sessions', url: '/api/sessions' },
  { name: 'Resources Statistics', url: '/api/resources/statistics' },
  { name: 'Learning Path Progress', url: '/api/learning-path/progress' },
  { name: 'Review Statistics', url: '/api/reviews/statistics' },
  { name: 'Progress Metrics', url: '/api/progress/metrics/recent?days=7' },
];

export default function AuthDebugPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [apiResponse, setApiResponse] = useState<string>('');
  const [testEndpoint, setTestEndpoint] = useState<string>('/api/users/me');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('Get User Profile');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  // Get token information on page load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      const sessionId = localStorage.getItem('sessionId');

      setTokenInfo({
        token: token ? `${token.substring(0, 10)}...` : null,
        refreshToken: refreshToken ? `${refreshToken.substring(0, 10)}...` : null,
        sessionId,
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        hasSessionId: !!sessionId,
      });
    }
  }, [isAuthenticated]);

  const refreshTokenAction = async () => {
    setMessages(['Attempting to refresh token...']);

    try {
      const result = await authApi.refreshAuthToken();
      setMessages(prev => [...prev, `Token refresh ${result ? 'successful' : 'failed'}`]);
      return result;
    } catch (error) {
      setMessages(prev => [...prev, `Error refreshing token: ${error}`]);
      return false;
    }
  };

  const handleUpdateActivity = async () => {
    setIsLoading(true);
    try {
      await authApi.updateSessionActivity();
      setApiResponse('Session activity updated');
    } catch (error) {
      setApiResponse(`Error updating session: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to handle endpoint selection
  const handleEndpointSelect = (endpointName: string) => {
    const endpoint = API_ENDPOINTS.find(e => e.name === endpointName);
    if (endpoint) {
      setSelectedEndpoint(endpointName);
      setTestEndpoint(endpoint.url);
    }
  };

  const handleTestApi = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(testEndpoint);
      const data = await response.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setApiResponse(`API Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearTokens = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('sessionId');
      setTokenInfo({
        token: null,
        refreshToken: null,
        sessionId: null,
        hasToken: false,
        hasRefreshToken: false,
        hasSessionId: false,
      });
      setApiResponse('Tokens cleared from localStorage');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center p-8">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Auth Debug Page</h1>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1 bg-gray-50 p-4 rounded-md">
            <p className="font-medium">Authenticated:</p>
            <p className={`mt-1 ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
              {isAuthenticated ? 'Yes' : 'No'}
            </p>
          </div>

          <div className="col-span-2 md:col-span-1 bg-gray-50 p-4 rounded-md">
            <p className="font-medium">User:</p>
            <p className="mt-1 overflow-x-auto">{user ? user.username : 'Not logged in'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Token Information</h2>

        {tokenInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1 bg-gray-50 p-4 rounded-md">
                <p className="font-medium">Access Token:</p>
                <p className={`mt-1 ${tokenInfo.hasToken ? 'text-green-600' : 'text-red-600'}`}>
                  {tokenInfo.hasToken ? tokenInfo.token : 'No token'}
                </p>
              </div>

              <div className="col-span-2 md:col-span-1 bg-gray-50 p-4 rounded-md">
                <p className="font-medium">Refresh Token:</p>
                <p className={`mt-1 ${tokenInfo.hasRefreshToken ? 'text-green-600' : 'text-red-600'}`}>
                  {tokenInfo.hasRefreshToken ? tokenInfo.refreshToken : 'No refresh token'}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <p className="font-medium">Session ID:</p>
              <p className={`mt-1 ${tokenInfo.hasSessionId ? 'text-green-600' : 'text-red-600'}`}>
                {tokenInfo.hasSessionId ? tokenInfo.sessionId : 'No session ID'}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-4">
          <button
            onClick={refreshTokenAction}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
          >
            Refresh Token
          </button>

          <button
            onClick={handleUpdateActivity}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
          >
            Update Session Activity
          </button>

          <button
            onClick={handleClearTokens}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            Clear Tokens
          </button>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">API Test</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="endpoint-select" className="block mb-1 font-medium">Select Endpoint:</label>
            <select
              id="endpoint-select"
              value={selectedEndpoint}
              onChange={(e) => handleEndpointSelect(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              {API_ENDPOINTS.map(endpoint => (
                <option key={endpoint.name} value={endpoint.name}>
                  {endpoint.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="endpoint" className="block mb-1 font-medium">Custom Endpoint:</label>
            <input
              type="text"
              id="endpoint"
              value={testEndpoint}
              onChange={(e) => setTestEndpoint(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <button
            onClick={handleTestApi}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50"
          >
            Test API
          </button>

          {apiResponse && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Response:</h3>
              <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                {apiResponse}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
        >
          Dashboard
        </button>

        <button
          onClick={() => logout()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
        >
          Logout
        </button>
      </div>
    </div>
  );
}