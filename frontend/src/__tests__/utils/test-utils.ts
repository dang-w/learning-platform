/// <reference lib="dom" />
import { jest } from '@jest/globals';
import { AxiosResponse } from 'axios';

// Helper to create a properly typed mock Response
export const createMockResponse = (
  body: string | null = null,
  options: ResponseInit = { status: 200 }
): Response => {
  return new Response(body, options);
};

// Type-safe response creator for JSON responses
export const createJsonResponse = <T>(data: T, options: ResponseInit = { status: 200 }): Response => {
  return createMockResponse(JSON.stringify(data), options);
};

// Helper to create a properly typed mock fetch
export const createMockFetch = () => {
  const mockFn = jest.fn<typeof fetch>();
  mockFn.mockImplementation(async () => createMockResponse(null));
  return jest.mocked(mockFn, { shallow: true });
};

// Type-safe mock implementation for token service
export interface TokenServiceMockFns {
  getToken(): string | null;
  getRefreshToken(): string | null;
  startTokenRefresh(): Promise<string | null>;
  isRefreshingToken(): boolean;
  queueRequest<T = unknown>(fn: () => Promise<AxiosResponse<T>>): Promise<AxiosResponse<T>>;
  clearTokens(): void;
  setTokens(token: string, refreshToken?: string): void;
}

// Helper to create a properly typed mock token service
export const createMockTokenService = () => {
  const mock = {
    getToken: jest.fn<() => string | null>(),
    getRefreshToken: jest.fn<() => string | null>(),
    startTokenRefresh: jest.fn<() => Promise<string | null>>(),
    isRefreshingToken: jest.fn<() => boolean>(),
    queueRequest: jest.fn<
      <T = unknown>(fn: () => Promise<AxiosResponse<T>>) => Promise<AxiosResponse<T>>
    >(),
    clearTokens: jest.fn<() => void>(),
    setTokens: jest.fn<(token: string, refreshToken?: string) => void>()
  };

  return jest.mocked(mock, { shallow: true });
};