import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// Mock router implementation
const createMockRouter = (config: Partial<AppRouterInstance> = {}) => ({
  back: jest.fn(),
  forward: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  ...config
});

// Mock search params implementation
const createMockSearchParams = (config: Record<string, string> = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(config).forEach(([key, value]) => {
    searchParams.append(key, value);
  });

  return {
    get: jest.fn((key: string) => searchParams.get(key)),
    getAll: jest.fn((key: string) => searchParams.getAll(key)),
    has: jest.fn((key: string) => searchParams.has(key)),
    entries: jest.fn(() => searchParams.entries()),
    toString: jest.fn(() => searchParams.toString()),
    ...config
  };
};

// Mock pathname implementation
const createMockPathname = (pathname: string = '/') => () => pathname;

// Jest mock setup helper
export const mockNextNavigation = (config: {
  pathname?: string;
  router?: Partial<AppRouterInstance>;
  searchParams?: Record<string, string>;
} = {}) => {
  const mockRouter = createMockRouter(config.router);
  const mockSearchParams = createMockSearchParams(config.searchParams);
  const mockPathname = createMockPathname(config.pathname);

  jest.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
    useSearchParams: () => mockSearchParams,
    usePathname: mockPathname
  }));

  return {
    mockRouter,
    mockSearchParams,
    mockPathname
  };
};

// Export individual mock creators for more granular control
export {
  createMockRouter,
  createMockSearchParams,
  createMockPathname
};