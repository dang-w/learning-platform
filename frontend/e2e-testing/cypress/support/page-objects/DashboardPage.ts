/**
 * Dashboard Page Object Model for dashboard interactions
 */
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Selectors for dashboard-related elements
  private selectors = {
    // Navigation elements
    navBar: '[data-testid="dashboard-nav"]',
    resourcesTab: '[data-testid="nav-resources"]',
    conceptsTab: '[data-testid="nav-concepts"]',
    learningPathTab: '[data-testid="nav-learning-path"]',
    analyticsTab: '[data-testid="nav-analytics"]',
    profileTab: '[data-testid="nav-profile"]',

    // Dashboard elements
    resourcesList: '[data-testid="resources-list"]',
    resourceItem: '[data-testid="resource-item"]',
    conceptsList: '[data-testid="concepts-list"]',
    conceptItem: '[data-testid="concept-item"]',
    learningPathList: '[data-testid="learning-path-list"]',

    // Actions
    addResourceButton: '[data-testid="add-resource-button"]',
    addConceptButton: '[data-testid="add-concept-button"]',
    searchInput: '[data-testid="search-input"]',
    sortDropdown: '[data-testid="sort-dropdown"]'
  };

  /**
   * Navigate to the dashboard with resilient handling
   */
  visitDashboard(): Cypress.Chainable<void> {
    return this.visitProtected('/dashboard');
  }

  /**
   * Verify the dashboard has loaded properly
   * @returns Boolean indicating if dashboard appears to be loaded
   */
  isDashboardLoaded(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.navBar);
  }

  /**
   * Navigate to the resources tab
   */
  goToResources(): void {
    this.click(this.selectors.resourcesTab);
    this.waitForElement(this.selectors.resourcesList);
  }

  /**
   * Navigate to the concepts tab
   */
  goToConcepts(): void {
    this.click(this.selectors.conceptsTab);
    this.waitForElement(this.selectors.conceptsList);
  }

  /**
   * Navigate to the learning path tab
   */
  goToLearningPath(): void {
    this.click(this.selectors.learningPathTab);
    this.waitForElement(this.selectors.learningPathList);
  }

  /**
   * Navigate to the analytics tab
   */
  goToAnalytics(): void {
    this.click(this.selectors.analyticsTab);
  }

  /**
   * Navigate to the profile tab
   */
  goToProfile(): void {
    this.click(this.selectors.profileTab);
  }

  /**
   * Search for items in the current view
   * @param searchTerm The term to search for
   */
  search(searchTerm: string): void {
    this.elementExists(this.selectors.searchInput).then(hasSearch => {
      if (hasSearch) {
        this.type(this.selectors.searchInput, searchTerm);
        // Press enter to trigger search
        cy.get(this.selectors.searchInput).type('{enter}');
      } else {
        cy.log('Search input not found on dashboard');
        this.takeScreenshot('search-not-found');
      }
    });
  }

  /**
   * Click the button to add a new resource
   */
  clickAddResource(): void {
    this.click(this.selectors.addResourceButton);
  }

  /**
   * Click the button to add a new concept
   */
  clickAddConcept(): void {
    this.click(this.selectors.addConceptButton);
  }

  /**
   * Get the number of resources displayed
   */
  getResourceCount(): Cypress.Chainable<number> {
    return cy.get('body').then($body => {
      if ($body.find(this.selectors.resourceItem).length) {
        return cy.get(this.selectors.resourceItem).its('length');
      }
      return cy.wrap(0);
    });
  }

  /**
   * Get the number of concepts displayed
   */
  getConceptCount(): Cypress.Chainable<number> {
    return cy.get('body').then($body => {
      if ($body.find(this.selectors.conceptItem).length) {
        return cy.get(this.selectors.conceptItem).its('length');
      }
      return cy.wrap(0);
    });
  }

  /**
   * Check if dashboard has any content
   */
  hasContent(): Cypress.Chainable<boolean> {
    return cy.get('body').then($body => {
      const hasResources = $body.find(this.selectors.resourceItem).length > 0;
      const hasConcepts = $body.find(this.selectors.conceptItem).length > 0;
      return hasResources || hasConcepts;
    });
  }

  /**
   * Sort dashboard items using the sort dropdown
   * @param sortOption The sort option to select
   */
  sortItems(sortOption: string): void {
    this.elementExists(this.selectors.sortDropdown).then(hasSort => {
      if (hasSort) {
        cy.get(this.selectors.sortDropdown).select(sortOption);
      } else {
        cy.log(`Sort dropdown not found when trying to sort by ${sortOption}`);
      }
    });
  }
}