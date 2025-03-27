/// <reference lib="dom" />

interface MockResponseInit {
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
}

/**
 * Creates a mock Response object with proper typing
 */
export const createMockResponse = (
  body: string | null = null,
  options: ResponseInit = { status: 200 }
): Response => {
  return new Response(body, options);
};

/**
 * Creates a mock Response object with JSON body
 */
export const createJsonResponse = <T>(data: T, options: ResponseInit = { status: 200 }): Response => {
  return createMockResponse(JSON.stringify(data), options);
};

/**
 * Creates a mock fetch response object for testing
 */
export const createMockFetchResponse = <T>(data: T, init: MockResponseInit = {}) => {
  const {
    ok = true,
    status = ok ? 200 : 400,
    statusText = ok ? 'OK' : 'Bad Request',
    headers = { 'Content-Type': 'application/json' }
  } = init;

  return {
    ok,
    status,
    statusText,
    headers: new Headers(headers),
    json: jest.fn().mockResolvedValue(data)
  };
};

/**
 * Creates a properly typed mock fetch function
 */
export const createMockFetch = () => {
  const mockFn = jest.fn<Promise<Response>, [input: RequestInfo | URL, init?: RequestInit | undefined]>();
  mockFn.mockImplementation(async () => createMockResponse(null));
  return jest.mocked(mockFn, { shallow: true });
};

/**
 * Sets up a mock fetch implementation that returns the provided response
 */
export const mockFetch = <T>(response: T, init: MockResponseInit = {}) => {
  const mockResponse = createMockFetchResponse(response, init);
  global.fetch = jest.fn().mockResolvedValue(mockResponse);
  return global.fetch as jest.Mock;
};

/**
 * Sets up a mock fetch implementation that throws an error
 */
export const mockFetchError = (error: Error | string = 'Network error') => {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  global.fetch = jest.fn().mockRejectedValue(errorObj);
  return global.fetch as jest.Mock;
};

/**
 * Creates a mock fetch that returns different responses based on the URL
 */
export const mockFetchWithRoutes = (routes: Record<string, { response: unknown; init?: MockResponseInit }>) => {
  global.fetch = jest.fn().mockImplementation((url: string | URL) => {
    const urlString = url.toString();
    const route = Object.entries(routes).find(([pattern]) => urlString.includes(pattern));

    if (route) {
      const [, { response, init }] = route;
      return Promise.resolve(createMockFetchResponse(response, init));
    }

    return Promise.reject(new Error(`No mock response found for URL: ${urlString}`));
  });

  return global.fetch as jest.Mock;
};

/**
 * Helper to verify fetch calls
 */
export const verifyFetchCalls = (mockFn: jest.Mock, expectedCalls: Array<{ url: string; init?: RequestInit }>) => {
  expect(mockFn).toHaveBeenCalledTimes(expectedCalls.length);

  expectedCalls.forEach((expected, index) => {
    const [actualUrl, actualInit] = mockFn.mock.calls[index];
    expect(actualUrl).toContain(expected.url);

    if (expected.init) {
      expect(actualInit).toMatchObject(expected.init);
    }
  });
};

/**
 * Restores the original fetch implementation
 */
export const restoreFetch = () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });
};