import '@testing-library/jest-dom';

// This file is automatically loaded by Jest before running tests
// It's used to set up the testing environment and extend Jest's expect

// Add missing type declarations for Jest's expect
interface CustomMatchers<R = unknown> {
  toHaveBeenCalledWith(...args: unknown[]): R;
  toHaveBeenCalledTimes(n: number): R;
  toEqual(expected: unknown): R;
  toHaveProperty(keyPath: string, value?: unknown): R;
  toMatchObject(obj: unknown): R;
  toBeCalledWith(...args: unknown[]): R;
  toBeCalled(): R;
  toHaveLength(number: number): R;
  toContain(item: unknown): R;
  toBeInTheDocument(): R;
  toBeVisible(): R;
  toHaveClass(className: string): R;
  toHaveTextContent(text: string | RegExp): R;
  toHaveAttribute(attr: string, value?: unknown): R;
  // Additional matchers that were missing
  toBeNull(): R;
  toBeDefined(): R;
  toBeUndefined(): R;
  toBeTruthy(): R;
  toBeFalsy(): R;
  toBeGreaterThan(n: number): R;
  toBeLessThan(n: number): R;
  toContainEqual(item: unknown): R;
  toHaveValue(value: unknown): R;
  toHaveStyle(css: Record<string, unknown>): R;
  toBeChecked(): R;
  toBeDisabled(): R;
  toBeEnabled(): R;
  toBeEmpty(): R;
  toBeEmptyDOMElement(): R;
  toBeInvalid(): R;
  toBeValid(): R;
  toBeRequired(): R;
  toMatchSnapshot(): R;
  toThrowError(error?: unknown): R;
}


declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // Add additional members to avoid "An interface declaring no members is equivalent to its supertype" errors
    interface Expect extends CustomMatchers {
      objectContaining<T>(expected: T): T;
      stringContaining(expected: string): string;
      stringMatching(expected: string | RegExp): string;
      arrayContaining<T>(expected: Array<T>): Array<T>;
      any(constructor: unknown): unknown;
    }
    interface Matchers<R> extends CustomMatchers<R> {
      // Add additional matcher-specific members
      not: Matchers<R>;
    }
    interface InverseAsymmetricMatchers extends CustomMatchers {
      // Add inverse asymmetric matcher members
      not: InverseAsymmetricMatchers;
    }
  }
}

// Mock the window.matchMedia function which might be used in some components
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {},
    addEventListener: function() {},
    removeEventListener: function() {},
    dispatchEvent: function() {
      return false;
    },
  };
};

// Mock IntersectionObserver which is used for lazy loading components
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = "0px";
  thresholds = [0];

  constructor(callback: IntersectionObserverCallback) {
    // Store the callback to simulate calling it later if needed
    this.callback = callback;
  }

  private callback: IntersectionObserverCallback;

  disconnect() {
    return null;
  }

  observe() {
    return null;
  }

  takeRecords() {
    return [];
  }

  unobserve() {
    return null;
  }
} as unknown as typeof IntersectionObserver;

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      token: 'mock-token',
      refresh_token: 'mock-refresh-token',
      user: { id: 1, username: 'testuser' },
      // Include other common response data
      totalCoursesEnrolled: 5,
      completedCourses: 3,
      averageScore: 85,
      emailNotifications: true,
      courseUpdates: true,
      marketingEmails: false
    })
  })
) as jest.Mock;

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  writable: true
});

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: ''
});

// Add any additional global mocks or setup required for tests
