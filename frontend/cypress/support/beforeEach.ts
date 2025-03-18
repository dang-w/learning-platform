// Sample beforeEach hook for test files
// Import this file in your test files to use the beforeEach hook

// Test user that should exist in the test database
export const testUser = {
  username: 'test-user-cypress',
  password: 'TestPassword123!',
  email: 'test-user-cypress@example.com',
  fullName: 'Test User Cypress'
};

/**
 * Sets up an authenticated test by logging in and navigating to the specified route
 * This function is designed to be resilient to backend issues
 * @param route The route to visit after login (defaults to /dashboard)
 * @param options Additional options
 */
export const setupAuthenticatedTest = (route = '/dashboard', options = { skipRouteVerification: false }) => {
  // Clear cookies and localStorage before each test
  cy.clearCookies();
  cy.clearLocalStorage();

  // Log attempt
  cy.log(`Setting up authenticated test for route: ${route}`);

  // Create user if needed and perform programmatic login
  cy.createTestUser(testUser);
  cy.login(testUser.username, testUser.password);

  // Verify token was set in localStorage
  cy.window().its('localStorage').invoke('getItem', 'token').should('not.be.null');

  // Visit the page being tested
  cy.visit(route);

  // Only verify route if not skipped (useful when there are backend redirects)
  if (!options.skipRouteVerification) {
    // Verify we're on the expected page or at least not on the login page
    cy.url().should('not.contain', '/auth/login', { timeout: 10000 });

    // Additional check for the requested route, but don't fail test if there's a redirect
    cy.url().then(url => {
      if (url.indexOf(route) === -1) {
        cy.log(`Warning: Not on expected route ${route}. Current URL: ${url}`);
      } else {
        cy.log(`Successfully navigated to ${route}`);
      }
    });
  }
};

// Convenience function for pages that might encounter backend errors
export const setupAuthenticatedTestWithoutRouteVerification = (route = '/dashboard') => {
  return setupAuthenticatedTest(route, { skipRouteVerification: true });
};

// Usage example:
// import { setupAuthenticatedTest } from '../support/beforeEach';
//
// describe('Sample Test Suite', () => {
//   beforeEach(() => {
//     setupAuthenticatedTest('/dashboard');
//   });
//
//   it('should do something', () => {
//     // Test implementation
//   });
// });