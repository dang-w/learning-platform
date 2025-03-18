/**
 * Resources Page Object Model for resource management interactions
 */
import { BasePage } from './BasePage';

interface ResourceFormData {
  title: string;
  url: string;
  description?: string;
  type?: 'article' | 'video' | 'course';
  difficulty?: string;
  estimatedTime?: string;
  topics?: string[];
  notes?: string;
}

export class ResourcesPage extends BasePage {
  // Selectors for resource-related elements
  private selectors = {
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
    titleInput: 'input[name="title"]',
    urlInput: 'input[name="url"]',
    descriptionInput: '[data-testid="description-input"]',
    notesInput: 'textarea[name="notes"]',
    estimatedTimeInput: 'input[name="estimated_time"]',
    typeSelect: '[data-testid="resource-type"]',
    typeOption: (type: string) => `[data-testid="resource-type-${type}"]`,
    difficultySelect: '[data-testid="resource-difficulty"]',
    difficultyOption: (difficulty: string) => `[data-testid="resource-difficulty-${difficulty}"]`,
    topicsInput: '[data-testid="resource-topics"]',
    submitButton: 'button[type="submit"]',

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
    resourceUrlInput: '[data-testid="resource-url-input"]',
    extractMetadataButton: '[data-testid="extract-metadata-button"]',
    metadataLoading: '[data-testid="metadata-loading"]',
    metadataError: '[data-testid="metadata-error"]',
    resourceTitleInput: '[data-testid="resource-title-input"]',
    resourceDescriptionInput: '[data-testid="resource-description-input"]',
    resourceTypeSelect: '[data-testid="resource-type-select"]',
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
   * Visit the new resource page
   */
  visitNewResource(): Cypress.Chainable<void> {
    return this.visitProtected('/resources/new');
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
    this.elementExists(this.selectors.extractMetadataButton).then(exists => {
      if (exists) {
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

    // Wait for loading indicator if present
    this.elementExists(this.selectors.metadataLoading).then(exists => {
      if (exists) {
        cy.log('Metadata loading indicator found - waiting for it to complete');
        cy.wait(5000); // Wait for API to respond
      }
    });
  }

  /**
   * Check if metadata extraction resulted in an error
   */
  hasMetadataError(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.metadataError);
  }

  /**
   * Check if form fields are populated with metadata
   */
  isMetadataPopulated(): Cypress.Chainable<boolean> {
    return cy.get('body').then($body => {
      const hasTitleInput = $body.find(this.selectors.resourceTitleInput).length > 0;
      const hasValueInTitle = hasTitleInput &&
        $body.find(this.selectors.resourceTitleInput).val() !== '';

      return hasValueInTitle;
    });
  }

  /**
   * Manually enter resource details after metadata extraction
   * @param title The title to enter
   * @param description The description to enter
   */
  enterManualDetails(title: string, description: string): void {
    this.elementExists(this.selectors.resourceTitleInput).then(exists => {
      if (exists) {
        cy.get(this.selectors.resourceTitleInput).clear();
        this.type(this.selectors.resourceTitleInput, title);
      }
    });

    this.elementExists(this.selectors.resourceDescriptionInput).then(exists => {
      if (exists) {
        cy.get(this.selectors.resourceDescriptionInput).clear();
        this.type(this.selectors.resourceDescriptionInput, description);
      }
    });
  }

  /**
   * Select a resource type if the select element exists
   * @param type The type to select
   */
  selectResourceType(type: string): void {
    this.elementExists(this.selectors.resourceTypeSelect).then(exists => {
      if (exists) {
        this.click(this.selectors.resourceTypeSelect);
        cy.get(`[data-testid="resource-type-${type}"]`).click();
      }
    });
  }

  /**
   * Fill the resource form with the provided data
   * @param resourceData Data for the resource
   */
  fillResourceForm(resourceData: ResourceFormData): void {
    // Fill title
    this.type(this.selectors.titleInput, resourceData.title);

    // Fill URL
    this.type(this.selectors.urlInput, resourceData.url);

    // Select type if provided
    if (resourceData.type) {
      this.click(this.selectors.typeSelect);
      this.click(this.selectors.typeOption(resourceData.type));
    }

    // Fill description if provided
    if (resourceData.description) {
      this.elementExists(this.selectors.descriptionInput).then(exists => {
        if (exists && resourceData.description) {
          this.type(this.selectors.descriptionInput, resourceData.description);
        }
      });
    }

    // Select difficulty if provided
    if (resourceData.difficulty) {
      this.click(this.selectors.difficultySelect);
      this.click(this.selectors.difficultyOption(resourceData.difficulty));
    }

    // Fill estimated time if provided
    if (resourceData.estimatedTime) {
      this.elementExists(this.selectors.estimatedTimeInput).then(exists => {
        if (exists && resourceData.estimatedTime) {
          this.type(this.selectors.estimatedTimeInput, resourceData.estimatedTime);
        }
      });
    }

    // Add topics if provided
    if (resourceData.topics && resourceData.topics.length > 0) {
      this.elementExists(this.selectors.topicsInput).then(exists => {
        if (exists) {
          const topics = resourceData.topics || [];
          topics.forEach(topic => {
            this.type(this.selectors.topicsInput, `${topic}{enter}`);
          });
        }
      });
    }

    // Fill notes if provided
    if (resourceData.notes) {
      this.elementExists(this.selectors.notesInput).then(exists => {
        if (exists && resourceData.notes) {
          this.type(this.selectors.notesInput, resourceData.notes);
        }
      });
    }
  }

  /**
   * Submit the resource form
   */
  submitResourceForm(): void {
    this.click(this.selectors.submitButton);
  }

  /**
   * Verify success notification is displayed
   */
  verifySuccessNotification(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.successNotification).then(exists => {
      if (exists) {
        cy.get(this.selectors.successNotification).should('be.visible');
      }
      return exists;
    });
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
    // Using intermediate variable to store the result
    let titleText: string | null = null;

    // @ts-expect-error: Suppress type checking for this block since it works at runtime
    return cy
      .get('body')
      .then(($body) => {
        const hasResources = $body.find(this.selectors.resourceItem).length > 0;

        if (hasResources) {
          titleText = $body
            .find(this.selectors.resourceItem)
            .first()
            .find(this.selectors.resourceTitle)
            .text()
            .trim() || null;
        }
      })
      .then(() => titleText);
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
   * Check if a resource exists by title
   * @param title The title to check for
   */
  resourceExists(title: string): Cypress.Chainable<boolean> {
    return cy.get('body').then($body => {
      return $body.find(this.selectors.resourcesList).text().includes(title);
    });
  }

  /**
   * Mark the first resource as completed
   * @param notes Optional notes to add when marking as completed
   */
  markFirstResourceAsCompleted(notes?: string): void {
    cy.get(this.selectors.resourceItem)
      .first()
      .find(this.selectors.completeResourceButton)
      .click();

    if (notes) {
      this.type(this.selectors.notesInput, notes);
    }

    this.click(this.selectors.submitButton);
  }

  /**
   * Check if the first resource is marked as completed
   */
  isFirstResourceCompleted(): Cypress.Chainable<boolean> {
    return cy.get(this.selectors.resourceItem)
      .first()
      .then($resource => {
        return $resource.find(this.selectors.completedBadge).length > 0;
      });
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
}

// Export singleton instance
export const resourcesPage = new ResourcesPage();