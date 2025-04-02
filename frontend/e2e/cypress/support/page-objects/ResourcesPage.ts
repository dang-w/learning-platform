/**
 * Resources Page Object Model for resource management interactions
 */
import { BasePage } from './BasePage';

interface ResourceFormData {
  title: string;
  url: string;
  description?: string;
  type?: 'articles' | 'videos' | 'courses' | 'books';
  difficulty?: string;
  estimatedTime?: number | string;
  topics?: string[];
}

export class ResourcesPage extends BasePage {
  // Make selectors public for direct use in tests if needed
  public readonly selectors = {
    // Resource list elements
    resourcesList: '[data-testid="resources-list"]',
    resourceItem: '[data-testid="resource-item"]',
    resourceTitle: '[data-testid="resource-title"]',
    resourceDescription: '[data-testid="resource-description"]',
    resourceUrl: '[data-testid="resource-url"]',
    resourceType: '[data-testid="resource-type"]',
    resourceTags: '[data-testid="resource-tags"]',
    completedBadge: '[data-testid="completed-badge"]',

    // Resource form elements
    resourceForm: '[data-testid="resource-form"]',
    titleInput: '[data-testid="resource-title-input"]',
    urlInput: '[data-testid="resource-url"]',
    descriptionInput: '[data-testid="resource-description"]',
    estimatedTimeInput: '[data-testid="resource-estimated-time"]',
    typeSelect: '[data-testid="resource-type"]',
    typeOption: (type: string) => `[data-testid="resource-type-${type}"]`,
    difficultySelect: '[data-testid="resource-difficulty"]',
    difficultyOption: (difficulty: string) => `[data-testid="resource-difficulty-${difficulty}"]`,
    topicsInput: '[data-testid="resource-topics"]',
    submitButton: '[data-testid="submit-button"]',

    // Action buttons
    addResourceButton: '[data-testid="add-resource"]',
    editResourceButton: '[data-testid="edit-resource"]',
    deleteResourceButton: '[data-testid="delete-resource"]',
    confirmDeleteButton: '[data-testid="confirm-delete"]',
    completeResourceButton: '[data-testid="complete-resource"]',

    // Filters and sorting
    searchInput: '[data-testid="search-input"]',
    filterType: '[data-testid="filter-type"]',
    filterTypeOption: (type: string) => `[data-testid="filter-type-${type}"]`,
    filterTopic: '[data-testid="filter-topic"]',
    filterTopicOption: (topic: string) => `[data-testid="filter-topic-${topic}"]`,
    filterDifficulty: '[data-testid="filter-difficulty"]',
    filterDifficultyOption: (difficulty: string) => `[data-testid="filter-difficulty-${difficulty}"]`,
    filterStatus: '[data-testid="filter-status"]',
    filterStatusOption: (status: string) => `[data-testid="filter-status-${status}"]`,
    clearFilters: '[data-testid="clear-filters"]',
    sortDropdown: '[data-testid="sort-dropdown"]',

    // Notifications
    successNotification: '[data-testid="success-notification"]',
    errorNotification: '[data-testid="error-notification"]',

    // URL metadata extraction elements
    resourceUrlInput: '[data-testid="resource-url"]',
    extractMetadataButton: '[data-testid="extract-metadata"]',
    metadataLoading: '[data-testid="metadata-loading"]',
    metadataError: '[data-testid="metadata-error"]',
    resourceTitleInput: '[data-testid="resource-title-input"]',
    resourceDescriptionInput: '[data-testid="resource-description-input"]',
  };

  /**
   * Navigate to resources page with resilient handling
   */
  visitResources(): Cypress.Chainable<void> {
    return this.visitProtected('/resources');
  }

  /**
   * Check if resources page has loaded
   */
  isResourcesPageLoaded(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.resourcesList);
  }

  /**
   * Check if add resource button is available
   */
  isAddResourceButtonAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.addResourceButton);
  }

  /**
   * Click the add resource button
   */
  clickAddResource(): void {
    this.click(this.selectors.addResourceButton);
  }

  /**
   * Check if the extract metadata button is available
   */
  isExtractMetadataButtonAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.extractMetadataButton);
  }

  /**
   * Check if the URL input field exists
   */
  isUrlInputAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.resourceUrlInput);
  }

  /**
   * Enter a URL in the URL input field
   * @param url The URL to enter
   */
  enterUrl(url: string): void {
    this.type(this.selectors.resourceUrlInput, url);
  }

  /**
   * Click the extract metadata button if it exists
   */
  clickExtractMetadata(): void {
    // Use get('body').then to ensure the command runs after potential DOM updates
    cy.get('body').then($body => {
      if ($body.find(this.selectors.extractMetadataButton).length) {
        this.click(this.selectors.extractMetadataButton);
      } else {
        cy.log('Extract metadata button not found - feature may not be implemented');
      }
    });
  }

  /**
   * Enter URL and extract metadata in a single step
   * @param url The URL to extract metadata from
   */
  enterUrlAndExtractMetadata(url: string): void {
    this.enterUrl(url);
    this.clickExtractMetadata();
  }

  /**
   * Check if metadata extraction resulted in an error
   */
  hasMetadataError(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.metadataError);
  }

  /**
   * Check if form fields are populated with metadata (Asserts directly)
   */
  isMetadataPopulated(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(this.selectors.resourceTitleInput).should('not.have.value', '');
  }

  /**
   * Manually enter resource details after metadata extraction
   * @param title The title to enter
   * @param description The description to enter
   */
  enterManualDetails(title: string, description: string): void {
    cy.get(this.selectors.resourceTitleInput).clear();
    this.type(this.selectors.resourceTitleInput, title);

    cy.get(this.selectors.resourceDescriptionInput).clear();
    this.type(this.selectors.resourceDescriptionInput, description);
  }

  /**
   * Select a resource type if the select element exists
   * @param type The type to select
   */
  selectResourceType(type: string): void {
    // Use get('body').then to ensure the command runs after potential DOM updates
    cy.get('body').then($body => {
      if ($body.find(this.selectors.typeSelect).length > 0) {
        // Ensure the select element is visible before interaction
        cy.get(this.selectors.typeSelect).should('be.visible').select(type);
      } else {
        cy.log('Resource type select not found - skipping selection');
      }
    });
  }

  /**
   * Fill the resource form with the provided data
   * @param resourceData Data for the resource
   */
  fillResourceForm(resourceData: ResourceFormData): void {
    // Fill title
    if (resourceData.title) {
      this.type(this.selectors.titleInput, resourceData.title);
    }

    // Fill URL
    if (resourceData.url) {
      this.type(this.selectors.urlInput, resourceData.url);
    }

    // Select type if provided
    if (resourceData.type) {
      cy.log(`Selecting resource type: ${resourceData.type}`);
      // Ensure the select element is visible before selecting
      cy.get(this.selectors.typeSelect).should('be.visible').select(resourceData.type);
      // Add a small wait and URL check after selection
      cy.wait(100);
      cy.url().should('include', '/resources', 'URL should still be /resources after type selection');
      cy.log('URL check passed after type selection.');
    }

    // Fill description if provided
    if (resourceData.description) {
      // Add URL check before typing into description
      cy.url().should('include', '/resources', 'URL should still be /resources before typing description');
      cy.log('URL check passed before typing description.');
      this.type(this.selectors.descriptionInput, resourceData.description);
    }

    // Select difficulty if provided
    if (resourceData.difficulty) {
      cy.get(this.selectors.difficultySelect).should('exist').and('be.visible');
      cy.get(this.selectors.difficultySelect).select(resourceData.difficulty);
    }

    // Fill estimated time if provided
    if (resourceData.estimatedTime !== undefined) {
      cy.get(this.selectors.estimatedTimeInput).should('exist').and('be.visible');
      this.type(this.selectors.estimatedTimeInput, String(resourceData.estimatedTime));
    }

    // Add topics if provided
    if (resourceData.topics && resourceData.topics.length > 0) {
      cy.get(this.selectors.topicsInput).should('exist').and('be.visible');
      const topics = resourceData.topics || [];
      topics.forEach(topic => {
        this.type(this.selectors.topicsInput, `${topic}{enter}`);
        // Add a small wait to ensure the tag renders before next input
        cy.wait(100);
      });
    }
  }

  /**
   * Submit the resource form
   */
  submitResourceForm(): void {
    // Scroll the button into view before clicking
    cy.get(this.selectors.submitButton).scrollIntoView().click();
  }

  /**
   * Verify success notification is displayed (Asserts directly)
   */
  verifySuccessNotification(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(this.selectors.successNotification).should('be.visible');
  }

  /**
   * Get the number of resources displayed
   */
  getResourceCount(): Cypress.Chainable<number> {
    // Check if the list container exists using the body as a base
    return cy.get('body').then($body => {
      if ($body.find(this.selectors.resourcesList).length > 0) {
        // If the list exists, find items within it using .find()
        // and yield its length. .find() operates on the subject.
        return cy.get(this.selectors.resourcesList)
                 .should('be.visible') // Ensure the list is visible
                 .find(this.selectors.resourceItem) // Find items within
                 .its('length'); // Get the length of the found items
      } else {
        // If the list container itself doesn't exist, the count is 0
        return cy.wrap(0);
      }
    });
  }

  /**
   * Search for resources by term
   * @param searchTerm The search term
   */
  searchResources(searchTerm: string): void {
    this.type(this.selectors.searchInput, searchTerm);
    cy.get(this.selectors.searchInput).type('{enter}');
  }

  /**
   * Check if type filter is available
   */
  isTypeFilterAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.filterType);
  }

  /**
   * Filter resources by type
   * @param type The resource type to filter by
   */
  filterByType(type: string): void {
    this.click(this.selectors.filterType);
    this.click(this.selectors.filterTypeOption(type));
  }

  /**
   * Check if topic filter is available
   */
  isTopicFilterAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.filterTopic);
  }

  /**
   * Filter resources by topic
   * @param topic The topic to filter by
   */
  filterByTopic(topic: string): void {
    this.click(this.selectors.filterTopic);
    this.click(this.selectors.filterTopicOption(topic));
  }

  /**
   * Check if difficulty filter is available
   */
  isDifficultyFilterAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.filterDifficulty);
  }

  /**
   * Filter resources by difficulty
   * @param difficulty The difficulty level to filter by
   */
  filterByDifficulty(difficulty: string): void {
    this.click(this.selectors.filterDifficulty);
    this.click(this.selectors.filterDifficultyOption(difficulty));
  }

  /**
   * Check if status filter is available
   */
  isStatusFilterAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.filterStatus);
  }

  /**
   * Filter resources by status
   * @param status The status to filter by
   */
  filterByStatus(status: string): void {
    this.click(this.selectors.filterStatus);
    this.click(this.selectors.filterStatusOption(status));
  }

  /**
   * Check if clear filters button is available
   */
  isClearFiltersAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.clearFilters);
  }

  /**
   * Clear all active filters
   */
  clearFilters(): void {
    this.click(this.selectors.clearFilters);
  }

  /**
   * Get the title of the first resource
   */
  getFirstResourceTitle(): Cypress.Chainable<string | null> {
    // Use invoke('text') for better handling of text retrieval
    return cy.get(this.selectors.resourceItem)
      .first()
      .find(this.selectors.resourceTitle)
      .invoke('text')
      .then(text => {
        const trimmedText = text.trim();
        // Return null for empty string, otherwise the trimmed text
        return trimmedText === '' ? null : trimmedText;
      }) as Cypress.Chainable<string | null>; // Explicitly cast the result of .then()
  }

  /**
   * Click edit button on the first resource
   */
  clickEditOnFirstResource(): void {
    cy.get(this.selectors.resourceItem)
      .first()
      .find(this.selectors.editResourceButton)
      .click();
  }

  /**
   * Update the resource title in the edit form
   * @param newTitle The new title for the resource
   */
  updateResourceTitle(newTitle: string): void {
    cy.get(this.selectors.titleInput).clear().type(newTitle);
  }

  /**
   * Check if a resource exists by title (Asserts directly)
   * @param title The title to check for
   */
  resourceExists(title: string): Cypress.Chainable<JQuery<HTMLElement>> {
    // More specific: Find an item containing a title element with the text
    return cy.get(this.selectors.resourceItem)
      .find(this.selectors.resourceTitle)
      .contains(title)
      .parents(this.selectors.resourceItem); // Assert that the title is within a resource item
  }

  /**
   * Mark the first resource as completed
   */
  markFirstResourceAsCompleted(): void {
    cy.get(this.selectors.resourceItem)
      .first()
      .find(this.selectors.completeResourceButton)
      .click();
  }

  /**
   * Check if the first resource is marked as completed
   */
  isFirstResourceCompleted(): Cypress.Chainable<boolean> {
    // Check for the existence of the badge within the first item
    return cy.get(this.selectors.resourceItem)
      .first()
      .find(this.selectors.completedBadge)
      .should('exist') // Assert badge exists
      .then($badge => $badge.length > 0); // Return boolean based on existence
  }

  /**
   * Delete the first resource
   */
  deleteFirstResource(): void {
    cy.get(this.selectors.resourceItem)
      .first()
      .find(this.selectors.deleteResourceButton)
      .click();

    // Confirm deletion
    this.click(this.selectors.confirmDeleteButton);
  }

  /**
   * Confirm delete dialog
   */
  confirmDelete(): void {
    this.click(this.selectors.confirmDeleteButton);
  }
}

// Export singleton instance
export const resourcesPage = new ResourcesPage();