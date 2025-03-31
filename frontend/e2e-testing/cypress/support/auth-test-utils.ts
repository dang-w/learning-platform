/**
 * Enhanced Authentication Utilities for E2E Testing
 *
 * This file contains robust authentication utilities specifically designed for E2E testing.
 * It addresses authentication issues mentioned in the PROJECT_ANALYSIS.md document.
 */

import { Note, NotePagination } from '../../../src/types/notes';
import { tokenService } from '../../../src/lib/services/token-service';

// Default test user
const DEFAULT_TEST_USER = {
  id: 'test-user-id',
  username: 'test-user',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Creates a JWT token without requiring backend API
 * This is used as a fallback when the API is not responding
 * @param username The username to include in the token
 * @param expiryDays Number of days until token expires (default: 1)
 */
export const createMockJwt = (username: string, expiryDays = 1): string => {
  // Create a simple mock JWT with configurable expiry
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({
    sub: username,
    name: username,
    iat: now,
    exp: now + (expiryDays * 86400), // expiryDays * 24 hours
    role: 'user'
  }));

  // Use a fixed signature for test environment
  const signature = 'MOCK_SIGNATURE_FOR_TESTING_ONLY';

  return `${header}.${payload}.${signature}`;
};

// Extend the Window interface to add the CYPRESS_AUTH_BYPASS property
declare global {
  interface Window {
    CYPRESS_AUTH_BYPASS?: boolean;
  }
}

/**
 * Setup complete authentication bypass that doesn't rely on backend
 * This approach ensures tests can continue even if authentication API is down
 * @param username Optional username to use for the mock user
 */
export const setupCompleteAuthBypass = (username?: string) => {
  // Mock user data
  const mockUser = username ? {
    ...DEFAULT_TEST_USER,
    username,
    email: `${username}@example.com`
  } : DEFAULT_TEST_USER;

  // Create a valid JWT token
  const token = createMockJwt(mockUser.username);

  // Mock notes data
  const mockNotes: NotePagination = {
    items: [],
    total: 0,
    skip: 0,
    limit: 20
  };

  // Mock API responses
  cy.intercept('GET', '/api/users/me', {
    statusCode: 200,
    body: mockUser
  }).as('getUser');

  // Intercept auth check endpoint
  cy.intercept('GET', '/api/auth/check', {
    statusCode: 200,
    body: { isValid: true, user: mockUser }
  }).as('authCheck');

  // Intercept notes endpoints
  cy.intercept('GET', '/api/users/notes*', {
    statusCode: 200,
    body: mockNotes
  }).as('getNotes');

  cy.intercept('POST', '/api/users/notes', (req) => {
    const note: Note = {
      id: `note-${Date.now()}`,
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    req.reply({
      statusCode: 201,
      body: note
    });
  }).as('createNote');

  cy.intercept('PUT', '/api/users/notes/*', (req) => {
    const note: Note = {
      ...req.body,
      id: req.url.split('/').pop() || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    req.reply({
      statusCode: 200,
      body: note
    });
  }).as('updateNote');

  cy.intercept('DELETE', '/api/users/notes/*', {
    statusCode: 204
  }).as('deleteNote');

  // Set auth token using tokenService before any navigation
  cy.window().then((win) => {
    tokenService.setTokens(token);
    tokenService.setMetadata('user', mockUser);
    tokenService.setMetadata('cypress_test_auth_bypass', true);
    win.CYPRESS_AUTH_BYPASS = true;
  });

  // Wait for auth to be set up
  cy.wait(100); // Small delay to ensure tokens are set
};

/**
 * Disable the authentication bypass
 */
export const disableAuthBypass = () => {
  cy.log('Disabling auth bypass');

  cy.window().then(win => {
    tokenService.clearTokens();
    tokenService.setMetadata('user', null);
    tokenService.setMetadata('cypress_test_auth_bypass', null);
    delete win.CYPRESS_AUTH_BYPASS;
  });

  cy.clearCookie('token');
  cy.clearCookie('cypress_auth_bypass');

  cy.reload();
};

/**
 * Visit a page with authentication bypass
 */
export const visitWithAuth = (route: string) => {
  // Setup auth bypass first
  setupCompleteAuthBypass();

  // Visit the route
  cy.visit(route);

  // Verify we're not redirected to login
  cy.url().should('not.include', '/auth/login');
};

/**
 * Initialize this module by registering the commands
 */
export const initAuthTestUtils = () => {
  // Add custom command for the auth bypass
  Cypress.Commands.add('useAuthBypass', () => {
    setupCompleteAuthBypass();
  });

  // Add custom command for visiting with auth
  Cypress.Commands.add('visitWithAuth', (route: string) => {
    visitWithAuth(route);
  });
};

// Auto-initialize when this module is imported
initAuthTestUtils();

// Extend Cypress types
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Setup complete authentication bypass that doesn't rely on backend
       * @example cy.useAuthBypass()
       */
      useAuthBypass(): Chainable<void>;

      /**
       * Visit a page with authentication bypass
       * @example cy.visitWithAuth('/dashboard')
       */
      visitWithAuth(route: string): Chainable<void>;
    }
  }
}