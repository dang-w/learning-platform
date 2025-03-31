import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { jest } from '@jest/globals';

// Polyfill TextEncoder/TextDecoder
global.TextEncoder = TextEncoder as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Polyfill ReadableStream
interface MockController {
  enqueue(chunk: Uint8Array): void;
  close(): void;
}

interface MockSource {
  start(controller: MockController): void;
}

class MockReadableStream {
  constructor(private source?: MockSource) {
    if (source?.start) {
      const controller: MockController = {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        enqueue: (chunk: Uint8Array) => {},
        close: () => {}
      };
      source.start(controller);
    }
  }
}

global.ReadableStream = MockReadableStream as unknown as typeof global.ReadableStream;

// Mock fetch and Response
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockFetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  return Promise.resolve(new MockResponse('{}', {
    status: 200,
    headers: new Headers({ 'Content-Type': 'application/json' })
  }));
});

class MockResponse implements Response {
  readonly headers: Headers;
  readonly ok: boolean;
  readonly redirected: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly type: ResponseType;
  readonly url: string;
  readonly body: ReadableStream<Uint8Array> | null;
  readonly bodyUsed: boolean;
  private bodyContent: string | null;

  constructor(bodyInit: BodyInit | null = null, init: ResponseInit = {}) {
    this.headers = new Headers(init.headers);
    this.status = init.status || 200;
    this.statusText = init.statusText || '';
    this.ok = this.status >= 200 && this.status < 300;
    this.redirected = false;
    this.type = 'default';
    this.url = 'http://localhost';
    this.bodyUsed = false;
    this.bodyContent = typeof bodyInit === 'string' ? bodyInit : bodyInit ? JSON.stringify(bodyInit) : null;

    const content = this.bodyContent;
    this.body = content ? new ReadableStream({
      start(controller: MockController) {
        const uint8Array = new TextEncoder().encode(content);
        controller.enqueue(uint8Array);
        controller.close();
      }
    }) : null;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    if (!this.bodyContent) return new ArrayBuffer(0);
    const uint8Array = new TextEncoder().encode(this.bodyContent);
    const buffer = new ArrayBuffer(uint8Array.byteLength);
    new Uint8Array(buffer).set(uint8Array);
    return buffer;
  }

  async blob(): Promise<Blob> {
    return new Blob([this.bodyContent || '']);
  }

  async formData(): Promise<FormData> {
    return new FormData();
  }

  async json<T>(): Promise<T> {
    if (!this.bodyContent) return {} as T;
    return JSON.parse(this.bodyContent) as T;
  }

  async text(): Promise<string> {
    return this.bodyContent || '';
  }

  clone(): Response {
    return new MockResponse(this.bodyContent, {
      headers: this.headers,
      status: this.status,
      statusText: this.statusText,
    });
  }

  bytes(): Promise<Uint8Array> {
    if (!this.bodyContent) return Promise.resolve(new Uint8Array());
    return Promise.resolve(new TextEncoder().encode(this.bodyContent));
  }

  static error(): Response {
    return new MockResponse(null, { status: 500 });
  }

  static json(data: unknown, init?: ResponseInit): Response {
    return new MockResponse(JSON.stringify(data), init);
  }

  static redirect(url: string | URL, status = 302): Response {
    return new MockResponse(null, { status });
  }
}

// Add static methods to MockResponse
Object.assign(MockResponse, {
  error(): Response {
    return new MockResponse(null, { status: 500 });
  },
  json(data: unknown, init?: ResponseInit): Response {
    return new MockResponse(JSON.stringify(data), init);
  },
  redirect(url: string | URL, status?: number): Response {
    return new MockResponse(null, { status: status ?? 302 });
  }
});

// Cast MockResponse to include static methods
const MockResponseConstructor = MockResponse as unknown as typeof Response;
global.Response = MockResponseConstructor;

// Suppress console.error in tests but still keep the messages
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
    return;
  }
  originalError.call(console, ...args);
};

// Mock window.URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => '') as (obj: Blob | MediaSource) => string;

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];


  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    if (options?.root) this.root = options.root;
    if (options?.rootMargin) this.rootMargin = options.rootMargin;
    if (options?.threshold) {
      this.thresholds = Array.isArray(options.threshold) ? options.threshold : [options.threshold];
    }
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof global.IntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver implements ResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(callback: ResizeObserverCallback) {}
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

global.ResizeObserver = MockResizeObserver as unknown as typeof global.ResizeObserver;

// Configure testing library
import { configure } from '@testing-library/react'

configure({
  testIdAttribute: 'data-testid',
})

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Suppress console errors during tests
beforeAll(() => {
  console.error = (...args) => {
    if (
      /Warning: ReactDOM.render is no longer supported in React 18/.test(args[0]) ||
      /Warning: useLayoutEffect does nothing on the server/.test(args[0])
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

global.fetch = mockFetch as unknown as typeof global.fetch;