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
}


declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // Add additional members to avoid "An interface declaring no members is equivalent to its supertype" errors
    interface Expect extends CustomMatchers {
      objectContaining<T>(expected: T): T;
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

// The type declarations are already included in @testing-library/jest-dom
// But we need to extend them for our specific test cases
