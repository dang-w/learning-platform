/// <reference lib="dom" />

/**
 * Storage mocking utilities for testing
 * Provides mock implementations for localStorage and sessionStorage
 */

interface MockStorage {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
  clear: jest.Mock;
  length: number;
  key: jest.Mock;
}

// Store original implementations
let originalLocalStorage: Storage;
let originalSessionStorage: Storage;

/**
 * Creates a mock storage object that can be used to replace localStorage or sessionStorage
 */
export const createMockStorage = (): MockStorage => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
});

/**
 * Sets up mock implementations for both localStorage and sessionStorage
 * @returns Object containing both mock storage implementations
 */
export const mockStorage = () => {
  // Store original implementations before mocking
  originalLocalStorage = window.localStorage;
  originalSessionStorage = window.sessionStorage;

  const localStorage = createMockStorage();
  const sessionStorage = createMockStorage();

  Object.defineProperty(window, 'localStorage', { value: localStorage });
  Object.defineProperty(window, 'sessionStorage', { value: sessionStorage });

  return { localStorage, sessionStorage };
};

/**
 * Creates a mock storage that actually stores values in memory
 * Useful for tests that need to verify storage behavior
 */
export const createFunctionalMockStorage = () => {
  const store: Record<string, string> = {};

  const storage: MockStorage = {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    length: 0,
    key: jest.fn((index: number) => Object.keys(store)[index] || null)
  };

  // Update length getter
  Object.defineProperty(storage, 'length', {
    get: () => Object.keys(store).length
  });

  return storage;
};

/**
 * Restores the original window.localStorage and window.sessionStorage
 * Should be called in afterEach blocks of test suites that use mockStorage
 */
export const restoreStorage = () => {
  if (originalLocalStorage) {
    Object.defineProperty(window, 'localStorage', { value: originalLocalStorage });
  }
  if (originalSessionStorage) {
    Object.defineProperty(window, 'sessionStorage', { value: originalSessionStorage });
  }
};