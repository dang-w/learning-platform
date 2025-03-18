/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to login programmatically
     * @example cy.login('username', 'password')
     */
    login(username: string, password: string): Chainable<void>;

    /**
     * Custom command to login with direct token generation, bypassing API endpoints
     * @example cy.loginWithToken('username')
     */
    loginWithToken(username: string): Chainable<void>;

    /**
     * Custom command to check if user is logged in
     * @example cy.isLoggedIn().should('be.true')
     */
    isLoggedIn(): Chainable<boolean>;

    /**
     * Custom command to create a test user via API
     * @example cy.createTestUser({ username: 'test', email: 'test@example.com', password: 'password', fullName: 'Test User' })
     */
    createTestUser(userData: { username: string, email: string, password: string, fullName: string }): Chainable<void>;

    /**
     * Custom command to create a test user with direct creation fallback
     * @example cy.createTestUserReliably({ username: 'test', email: 'test@example.com', password: 'password', fullName: 'Test User' })
     */
    createTestUserReliably(userData: { username: string, email: string, password: string, fullName: string }): Chainable<void>;

    /**
     * Custom command to navigate to a protected route and verify access
     * @example cy.visitProtectedRoute('/dashboard')
     */
    visitProtectedRoute(route: string): Chainable<void>;

    /**
     * Custom command to logout
     * @example cy.logout()
     */
    logout(): Chainable<void>;

    /**
     * Custom command to handle API errors and retry
     * @example cy.safeRequest({ method: 'GET', url: '/api/data' })
     */
    safeRequest(options: Partial<Cypress.RequestOptions>): Chainable<Cypress.Response<unknown>>;
  }
}