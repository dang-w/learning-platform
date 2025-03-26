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

// Mock Response if not available
if (typeof Response === 'undefined') {
  global.Response = class Response {
    private body: string;
    public status: number;
    public ok: boolean;
    private headers: Map<string, string>;

    constructor(body?: BodyInit | null, init: ResponseInit = {}) {
      this.body = body?.toString() || '';
      this.status = init.status || 200;
      this.ok = this.status >= 200 && this.status < 300;
      this.headers = new Map(Object.entries(init.headers || {}));
    }

    async json() {
      return JSON.parse(this.body);
    }

    async text() {
      return this.body;
    }

    clone() {
      return new Response(this.body, {
        status: this.status,
        headers: Object.fromEntries(this.headers)
      });
    }
  } as unknown as typeof Response;
}

// Mock Headers if not available
if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    private map: Map<string, string>;

    constructor(init?: Record<string, string> | Headers | string[][] | undefined) {
      this.map = new Map();
      if (init) {
        if (init instanceof Headers) {
          Array.from(init.entries()).forEach(([key, value]) => this.map.set(key.toLowerCase(), value));
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.map.set(key.toLowerCase(), value));
        } else {
          Object.entries(init).forEach(([key, value]) => this.map.set(key.toLowerCase(), value));
        }
      }
    }

    append(name: string, value: string): void {
      this.map.set(name.toLowerCase(), value);
    }

    delete(name: string): void {
      this.map.delete(name.toLowerCase());
    }

    get(name: string): string | null {
      return this.map.get(name.toLowerCase()) || null;
    }

    has(name: string): boolean {
      return this.map.has(name.toLowerCase());
    }

    set(name: string, value: string): void {
      this.map.set(name.toLowerCase(), value);
    }

    forEach(callback: (value: string, key: string) => void): void {
      this.map.forEach((value, key) => callback(value, key));
    }

    *entries(): IterableIterator<[string, string]> {
      yield* this.map.entries();
    }

    *keys(): IterableIterator<string> {
      yield* this.map.keys();
    }

    *values(): IterableIterator<string> {
      yield* this.map.values();
    }
  } as unknown as typeof Headers;
}

// Mock Request if not available
if (typeof Request === 'undefined') {
  global.Request = class Request {
    public url: string;
    public method: string;
    public headers: Headers;
    public body: BodyInit | null;
    public credentials: RequestCredentials;

    constructor(input: string | URL | Request, init: RequestInit = {}) {
      if (input instanceof Request) {
        this.url = input.url;
        this.method = input.method;
        this.headers = new Headers(input.headers);
        this.body = input.body;
        this.credentials = input.credentials;
      } else {
        this.url = input.toString();
        this.method = init.method || 'GET';
        this.headers = new Headers(init.headers);
        this.body = init.body || null;
        this.credentials = init.credentials || 'same-origin';
      }
    }

    clone(): Request {
      return new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.body,
        credentials: this.credentials
      });
    }
  } as unknown as typeof Request;
}

// Add any additional global mocks or setup required for tests
