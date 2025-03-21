/**
 * Enhanced Authentication Utilities for E2E Testing
 *
 * This file contains robust authentication utilities specifically designed for E2E testing.
 * It addresses authentication issues mentioned in the PROJECT_ANALYSIS.md document.
 */

// Default test user
export const DEFAULT_TEST_USER = {
  username: 'cypress-test-user',
  password: 'CypressTest123!',
  email: 'cypress-test-user@example.com',
  fullName: 'Cypress Test User'
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
 */
export const setupCompleteAuthBypass = (username = DEFAULT_TEST_USER.username) => {
  // Log operation
  cy.log(`Setting up complete auth bypass for user: ${username}`);

  // Generate JWT token
  const token = createMockJwt(username);
  const refreshToken = createMockJwt(username, 30); // 30 day expiry for refresh token

  // Create window function to intercept auth checks
  cy.window().then(win => {
    // Set required local storage items
    win.localStorage.setItem('token', token);
    win.localStorage.setItem('refreshToken', refreshToken);
    win.localStorage.setItem('user', JSON.stringify({
      id: 'mock-user-id',
      username,
      email: `${username}@example.com`,
      fullName: username,
      role: 'user'
    }));
    win.localStorage.setItem('cypress_test_auth_bypass', 'true');

    // Optional: Create a global auth bypass flag for the app to detect
    win.CYPRESS_AUTH_BYPASS = true;
  });

  // Set cookies for additional bypass paths
  cy.setCookie('token', token);
  cy.setCookie('cypress_auth_bypass', 'true');

  // Intercept auth-related API requests
  cy.intercept('GET', '**/api/users/me', {
    statusCode: 200,
    body: {
      id: 'mock-user-id',
      username,
      email: `${username}@example.com`,
      fullName: username,
      role: 'user',
      preferences: {
        theme: 'light',
        notifications: true
      }
    }
  }).as('getUserProfile');

  // Handle token refresh requests properly
  cy.intercept('POST', '**/api/auth/refresh', {
    statusCode: 200,
    body: {
      access_token: createMockJwt(username), // New access token
      refresh_token: refreshToken // Keep same refresh token
    }
  }).as('refreshToken');

  // Handle token refresh requests at the /token/refresh endpoint too
  cy.intercept('POST', '**/token/refresh', {
    statusCode: 200,
    body: {
      access_token: createMockJwt(username), // New access token
      refresh_token: refreshToken // Keep same refresh token
    }
  }).as('tokenRefresh');

  // Mock statistics endpoint
  cy.intercept('GET', '**/api/users/statistics', {
    statusCode: 200,
    body: {
      totalCoursesEnrolled: 5,
      completedCourses: 3,
      averageScore: 85,
      totalTimeSpent: 24
    }
  }).as('getUserStatistics');

  // Mock notification preferences endpoint
  cy.intercept('GET', '**/api/users/notification-preferences', {
    statusCode: 200,
    body: {
      emailNotifications: true,
      courseUpdates: true,
      marketingEmails: false
    }
  }).as('getNotificationPreferences');

  // Mock notification preferences update endpoint
  cy.intercept('PUT', '**/api/users/notification-preferences', {
    statusCode: 200,
    body: {
      emailNotifications: true,
      courseUpdates: true,
      marketingEmails: false
    }
  }).as('updateNotificationPreferences');

  // Mock data export endpoint
  cy.intercept('GET', '**/api/users/export', {
    statusCode: 200,
    body: {
      user: {
        id: 'mock-user-id',
        username,
        email: `${username}@example.com`,
        fullName: username
      },
      data: {
        courses: [],
        progress: {},
        preferences: {}
      }
    }
  }).as('exportUserData');

  // Force reload to apply all bypasses
  cy.reload();

  // Wait to ensure everything is applied
  cy.wait(300);
};

/**
 * Disable the authentication bypass
 */
export const disableAuthBypass = () => {
  cy.log('Disabling auth bypass');

  cy.window().then(win => {
    win.localStorage.removeItem('token');
    win.localStorage.removeItem('refreshToken');
    win.localStorage.removeItem('user');
    win.localStorage.removeItem('cypress_test_auth_bypass');
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
  Cypress.Commands.add('useAuthBypass', (username: string = DEFAULT_TEST_USER.username) => {
    setupCompleteAuthBypass(username);
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
       * @example cy.useAuthBypass('testuser')
       */
      useAuthBypass(username?: string): Chainable<void>;

      /**
       * Visit a page with authentication bypass
       * @example cy.visitWithAuth('/dashboard')
       */
      visitWithAuth(route: string): Chainable<void>;
    }
  }
}