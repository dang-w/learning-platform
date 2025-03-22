// Type declarations for Cypress tasks

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to select DOM element by data-testid attribute.
     * @example cy.getByTestId('greeting')
     */
    getByTestId(value: string): Chainable<JQuery<HTMLElement>>;
  }

  interface TestingInfo {
    test: string;
    url: string;
    status: number;
    message: string;
  }

  interface TestInfo {
    name: string;
    status: string;
  }

  interface JwtInfo {
    sub: string;
    role?: string;
    expiresIn?: string;
  }

  interface TestUser {
    username: string;
    email: string;
    fullName: string;
  }

  interface MockUser {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
    createdAt: string;
    isTestUser: boolean;
  }

  interface TaskTypes {
    log(message: string): null;
    table(message: object): null;
    logBackendError(info: TestingInfo): null;
    logTest(info: TestInfo): null;
    generateJWT(info: JwtInfo): string;
    createDirectTestUser(userData: { username: string; email: string; password: string; fullName: string; }): Promise<{
      success: boolean;
      method: string;
      endpoint?: string;
      alreadyExists?: boolean;
      error?: string;
    }>;
    logFailure(message: string): null;
    getBackendErrors(): string[];
    resetErrorReporter(): null;
    createTestSummary(data: { specs: Array<{name: string; passes: number; failures: number; skipped?: number; notes?: string}>; errors?: string[] }): string;
  }
}

// Module declaration for cypress-mochawesome-reporter
declare module 'cypress-mochawesome-reporter/plugin' {
  const plugin: {
    default: (on: unknown) => void;
  };
  export default plugin;
}