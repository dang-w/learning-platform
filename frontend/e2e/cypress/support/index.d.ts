/// <reference types="cypress" />

import { Resource, ResourceCreatePayload, UserCredentials, UserRegistrationData } from './types';

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
     * @example cy.createTestUser({ username: 'test', email: 'test@example.com', password: 'password', firstName: 'Test', lastName: 'User' })
     */
    createTestUser(userData: { username: string, email: string, password: string, firstName: string, lastName: string }): Chainable<void>;

    /**
     * Custom command to create a test user with direct creation fallback
     * @example cy.createTestUserReliably({ username: 'test', email: 'test@example.com', password: 'password', firstName: 'Test', lastName: 'User' })
     */
    createTestUserReliably(userData: { username: string, email: string, password: string, firstName: string, lastName: string }): Chainable<void>;

    /**
     * Custom command to navigate to a protected route and verify access
     * @example cy.visitProtectedRoute('/dashboard')
     */
    visitProtectedRoute(url: string): Chainable<void>;

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

    /**
     * Custom command to safely select a file for upload
     * @example cy.get('[data-testid="file-input"]').selectFile('cypress/fixtures/example.json')
     */
    selectFile(filePath: string, options?: Partial<Cypress.SelectFileOptions>): Chainable<JQuery<HTMLElement>>;

    /**
     * Custom command to register a user via API task.
     * Returns the Cypress response object.
     */
    registerUserApi(userData: UserRegistrationData): Chainable<Response<any>>;

    /**
     * Custom command to create a resource via API task.
     */
    createResourceApi(resourceData: ResourceCreatePayload, userCredentials: UserCredentials): Chainable<Resource>;
  }

  interface SelectFileOptions {
    /**
     * Force the action, even if it is not visible
     */
    force?: boolean;
    /**
     * Action to perform on the file input element
     */
    action?: 'select' | 'drag-drop';
  }

  interface AUTWindow {
    __NOTES_STORE__?: { getState: () => any };
  }

  interface Response<T> {
    body: T & { detail?: string };
  }
}

export {};