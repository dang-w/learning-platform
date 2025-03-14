/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to login programmatically
     * @example cy.login('username', 'password')
     */
    login(username: string, password: string): void;

    /**
     * Custom command to check if user is logged in
     * @example cy.isLoggedIn().should('be.true')
     */
    isLoggedIn(): Chainable<boolean>;
  }
}