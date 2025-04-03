/**
 * Dashboard testing helper functions
 * These utilities help optimize dashboard tests and reduce duplication
 */

/**
 * Check if an element exists and is visible, without failing the test if it's not
 * @param selector The selector for the element to check
 * @param options Optional configuration
 * @returns A Cypress chain that resolves to a boolean indicating whether the element exists and is visible
 */
export const checkElementExists = (
  selector: string,
  options: { timeout?: number; log?: boolean } = {}
): Cypress.Chainable<boolean> => {
  const { timeout = 5000, log = true } = options;

  if (log) {
    cy.log(`Checking if element exists: ${selector}`);
  }

  return cy.get('body').then($body => {
    const exists = $body.find(selector).length > 0;
    if (exists) {
      cy.get(selector, { timeout }).should('be.visible');
    } else if (log) {
      cy.log(`Element not found: ${selector}`);
    }
    return cy.wrap(exists);
  });
};

/**
 * Fast wait for dashboard to load all components
 * This function checks for multiple elements in a single operation
 * @param selectors Array of selectors to check for
 * @returns Object with results for each selector
 */
export const waitForDashboardLoad = (
  selectors: string[] = [
    '[data-testid="dashboard-overview"]',
    '[data-testid="recent-activity"]',
    '[data-testid="learning-path-progress"]',
    '[data-testid="knowledge-stats"]'
  ]
): Cypress.Chainable<Record<string, boolean>> => {
  cy.log('Waiting for dashboard components to load');

  // Create a function that checks one selector
  const checkSelector = (selector: string): Cypress.Chainable<boolean> => {
    return checkElementExists(selector, { log: false });
  };

  // Check all selectors in parallel and combine results
  return cy.wrap(selectors)
    .then(selectorArray => {
      const results: Record<string, boolean> = {};
      const promises = selectorArray.map(selector => {
        return checkSelector(selector).then(exists => {
          results[selector] = exists;
          return exists;
        });
      });

      return cy.wrap(Promise.all(promises)).then(() => results);
    });
};

/**
 * Navigate to a dashboard section quickly
 * @param section The section name to navigate to
 */
export const navigateToDashboardSection = (section: string): void => {
  const sectionMap: Record<string, string> = {
    'overview': '[data-testid="dashboard-nav-overview"]',
    'learning': '[data-testid="dashboard-nav-learning"]',
    'knowledge': '[data-testid="dashboard-nav-knowledge"]',
    'analytics': '[data-testid="dashboard-nav-analytics"]',
    'profile': '[data-testid="dashboard-nav-profile"]'
  };

  const selector = sectionMap[section.toLowerCase()] || `[data-testid="dashboard-nav-${section.toLowerCase()}"]`;

  cy.log(`Navigating to dashboard section: ${section}`);
  checkElementExists(selector).then(exists => {
    if (exists) {
      cy.get(selector).click();
    } else {
      cy.log(`Navigation element not found: ${selector}`);
    }
  });
};