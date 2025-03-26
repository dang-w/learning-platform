/// <reference lib="dom" />

import { expect, jest } from '@jest/globals';
import { tokenService } from '@/lib/services/token-service';
import { fetchWithAuth, fetchJsonWithAuth, getServerAuthToken } from '@/lib/utils/api';
import { createMockResponse, createJsonResponse, createMockFetch } from '@/__tests__/utils/test-utils';

// Mock tokenService
jest.mock('@/lib/services/token-service');

describe('API Utils', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = createMockFetch();
    global.fetch = mockFetch;
  });

  describe('fetchWithAuth', () => {
    it('should add auth token to request headers', async () => {
      jest.spyOn(tokenService, 'getToken').mockReturnValue('Bearer test-token');
      mockFetch.mockResolvedValueOnce(createMockResponse());

      await fetchWithAuth('/test');

      const calls = mockFetch.mock.calls;
      console.log('Mock fetch calls:', JSON.stringify(calls, null, 2));

      expect(mockFetch).toHaveBeenCalledWith('/test', expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      }));
    });

    it('should handle 401 response by refreshing token', async () => {
      jest.spyOn(tokenService, 'getToken')
        .mockReturnValueOnce('Bearer old-token')
        .mockReturnValueOnce('Bearer new-token');
      jest.spyOn(tokenService, 'startTokenRefresh')
        .mockResolvedValueOnce('Bearer new-token');
      mockFetch
        .mockResolvedValueOnce(createMockResponse(null, { status: 401 }))
        .mockResolvedValueOnce(createMockResponse('success'));

      const response = await fetchWithAuth('/test');
      expect(response.status).toBe(200);
      expect(tokenService.startTokenRefresh).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should queue requests during token refresh', async () => {
      jest.spyOn(tokenService, 'isRefreshingToken').mockReturnValue(true);
      jest.spyOn(tokenService, 'queueRequest').mockImplementation(async (fn) => {
        jest.spyOn(tokenService, 'isRefreshingToken').mockReturnValue(false);
        return fn();
      });
      mockFetch.mockResolvedValueOnce(createMockResponse(null, { status: 401 }));

      await fetchWithAuth('/test');

      expect(tokenService.queueRequest).toHaveBeenCalled();
    });

    it('should throw error when token refresh fails', async () => {
      jest.spyOn(tokenService, 'getToken').mockReturnValueOnce('Bearer old-token');
      jest.spyOn(tokenService, 'startTokenRefresh').mockResolvedValueOnce(null);
      jest.spyOn(tokenService, 'isRefreshingToken').mockReturnValue(false);
      mockFetch
        .mockResolvedValueOnce(createMockResponse(null, { status: 401 }))
        .mockResolvedValueOnce(createMockResponse(null, { status: 401 }));

      await expect(fetchWithAuth('/test')).rejects.toThrow('Authentication failed');
    });
  });

  describe('fetchJsonWithAuth', () => {
    it('should parse JSON response', async () => {
      const mockData = { test: 'data' };
      jest.spyOn(tokenService, 'getToken').mockReturnValue('Bearer test-token');
      mockFetch.mockResolvedValueOnce(createJsonResponse(mockData));

      const result = await fetchJsonWithAuth('/test');

      expect(result).toEqual(mockData);
    });

    it('should handle non-JSON response', async () => {
      jest.spyOn(tokenService, 'getToken').mockReturnValue('Bearer test-token');
      mockFetch.mockResolvedValueOnce(createMockResponse('not json'));

      await expect(fetchJsonWithAuth('/test')).rejects.toThrow();
    });
  });

  describe('getServerAuthToken', () => {
    it('should get token from Authorization header', () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue('Bearer test-token')
        }
      } as unknown as Request;

      const token = getServerAuthToken(req);
      expect(token).toBe('test-token');
    });

    it('should get token from cookie if header not present', () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue(null)
        },
        cookies: {
          'auth-token': 'cookie-token'
        }
      } as unknown as Request;

      const token = getServerAuthToken(req);
      expect(token).toBe('cookie-token');
    });

    it('should return null if no token found', () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue(null)
        },
        cookies: {}
      } as unknown as Request;

      const token = getServerAuthToken(req);
      expect(token).toBeNull();
    });
  });
});