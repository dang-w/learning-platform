/**
 * Base Page Object Model for resilient test construction
 * This class provides resilient navigation and element interaction methods
 * that all page-specific objects will extend
 */

import { elementExists, safeClick, safeType } from '../resilientSeedData';

export class BasePage {
  /**
   * Navigate to a page with resilient handling of errors
   * @param path The path to navigate to (without the base URL)
   * @param options Optional navigation options
   */
  visit(path: string, options: Partial<Cypress.VisitOptions> = {}): Cypress.Chainable<Cypress.AUTWindow> {
    // Default options for resilient navigation
    const defaultOptions: Partial<Cypress.VisitOptions> = {
      failOnStatusCode: false,
      timeout: 30000,
      retryOnNetworkFailure: true,
      ...options
    };

    // Log the navigation attempt
    cy.log(`Navigating to ${path}`);

    // Attempt to visit the page
    return cy.visit(path, defaultOptions);
  }

  /**
   * Visit a protected route with automatic authentication handling
   * @param path The path to navigate to (without the base URL)
   */
  visitProtected(path: string): Cypress.Chainable<void> {
    return cy.visitProtectedRoute(path);
  }

  /**
   * Check if element exists in the DOM
   * @param selector The element selector
   * @returns Chainable boolean indicating if the element exists
   */
  elementExists(selector: string): Cypress.Chainable<boolean> {
    return elementExists(selector);
  }

  /**
   * Click on an element only if it exists
   * @param selector The element selector
   */
  click(selector: string): void {
    safeClick(selector);
  }

  /**
   * Type text into an element only if it exists
   * @param selector The element selector
   * @param text The text to type
   */
  type(selector: string, text: string): void {
    safeType(selector, text);
  }

  /**
   * Wait for element to be visible in the DOM
   * @param selector The element selector
   * @param timeout Optional timeout in ms
   */
  waitForElement(selector: string, timeout = 10000): Cypress.Chainable {
    cy.log(`Waiting for element: ${selector}`);
    return cy.get('body').then(($body) => {
      if ($body.find(selector).length) {
        return cy.get(selector, { timeout }).should('be.visible');
      }
      cy.log(`Element not found after ${timeout}ms: ${selector}`);
      return cy.wrap(false);
    });
  }

  /**
   * Take a screenshot with automatic naming
   * @param name Name suffix for the screenshot
   */
  takeScreenshot(name: string): void {
    cy.screenshot(`${Cypress.currentTest.titlePath.join('-')}-${name}`, {
      capture: 'viewport',
      overwrite: true
    });
  }

  /**
   * Verify a condition and take a screenshot if it fails
   * @param assertion The assertion function to verify
   * @param errorMessage The error message if assertion fails
   * @param screenshotName The name for the failure screenshot
   */
  verifyWithScreenshot(
    assertion: () => void,
    errorMessage: string,
    screenshotName: string
  ): void {
    try {
      assertion();
    } catch (error) {
      cy.log(`Verification failed: ${errorMessage}`);
      this.takeScreenshot(`failed-${screenshotName}`);
      throw error;
    }
  }
}