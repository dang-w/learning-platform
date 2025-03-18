/**
 * Resources Page Object Model for resource management interactions
 */
import { BasePage } from './BasePage';

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

    // Resource form elements
    resourceForm: '[data-testid="resource-form"]',
    titleInput: '[data-testid="title-input"]',
    urlInput: '[data-testid="url-input"]',
    descriptionInput: '[data-testid="description-input"]',
    typeSelect: '[data-testid="type-select"]',
    tagsInput: '[data-testid="tags-input"]',

    // Action buttons
    addResourceButton: '[data-testid="add-resource-button"]',
    submitButton: '[data-testid="submit-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    editButton: '[data-testid="edit-button"]',
    deleteButton: '[data-testid="delete-button"]',
    confirmDeleteButton: '[data-testid="confirm-delete-button"]',

    // Filters and sorting
    searchInput: '[data-testid="search-input"]',
    typeFilter: '[data-testid="type-filter"]',
    tagFilter: '[data-testid="tag-filter"]',
    sortDropdown: '[data-testid="sort-dropdown"]'
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
   * Click the add resource button
   */
  clickAddResource(): void {
    this.click(this.selectors.addResourceButton);
    this.waitForElement(this.selectors.resourceForm);
  }

  /**
   * Fill the resource form with the provided data
   * @param resourceData Data for the resource
   */
  fillResourceForm(resourceData: {
    title: string;
    url: string;
    description: string;
    type: 'article' | 'video' | 'course';
    tags?: string[];
  }): void {
    // Fill title
    this.elementExists(this.selectors.titleInput).then(hasTitle => {
      if (hasTitle) {
        this.type(this.selectors.titleInput, resourceData.title);
      }
    });

    // Fill URL
    this.elementExists(this.selectors.urlInput).then(hasUrl => {
      if (hasUrl) {
        this.type(this.selectors.urlInput, resourceData.url);
      }
    });

    // Fill description
    this.elementExists(this.selectors.descriptionInput).then(hasDescription => {
      if (hasDescription) {
        this.type(this.selectors.descriptionInput, resourceData.description);
      }
    });

    // Select type
    this.elementExists(this.selectors.typeSelect).then(hasTypeSelect => {
      if (hasTypeSelect) {
        cy.get(this.selectors.typeSelect).select(resourceData.type);
      }
    });

    // Add tags if provided
    if (resourceData.tags && resourceData.tags.length > 0) {
      this.elementExists(this.selectors.tagsInput).then(hasTags => {
        if (hasTags) {
          resourceData.tags?.forEach(tag => {
            cy.get(this.selectors.tagsInput).type(`${tag}{enter}`);
          });
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
   * Create a new resource with the provided data
   * @param resourceData Data for the resource
   */
  createResource(resourceData: {
    title: string;
    url: string;
    description: string;
    type: 'article' | 'video' | 'course';
    tags?: string[];
  }): void {
    this.clickAddResource();
    this.fillResourceForm(resourceData);
    this.submitResourceForm();

    // Take a screenshot after submission
    this.takeScreenshot('resource-created');

    // Wait for the resource list to update
    cy.wait(1000);
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
   * Search for resources using the search input
   * @param searchTerm The term to search for
   */
  searchResources(searchTerm: string): void {
    this.elementExists(this.selectors.searchInput).then(hasSearch => {
      if (hasSearch) {
        this.type(this.selectors.searchInput, searchTerm);
        cy.get(this.selectors.searchInput).type('{enter}');
      }
    });
  }

  /**
   * Filter resources by type
   * @param type The resource type to filter by
   */
  filterByType(type: 'article' | 'video' | 'course'): void {
    this.elementExists(this.selectors.typeFilter).then(hasFilter => {
      if (hasFilter) {
        cy.get(this.selectors.typeFilter).select(type);
      }
    });
  }

  /**
   * Filter resources by tag
   * @param tag The tag to filter by
   */
  filterByTag(tag: string): void {
    this.elementExists(this.selectors.tagFilter).then(hasFilter => {
      if (hasFilter) {
        cy.get(this.selectors.tagFilter).select(tag);
      }
    });
  }

  /**
   * Sort resources by the provided field
   * @param sortOption The sort option to select
   */
  sortResources(sortOption: string): void {
    this.elementExists(this.selectors.sortDropdown).then(hasSort => {
      if (hasSort) {
        cy.get(this.selectors.sortDropdown).select(sortOption);
      }
    });
  }

  /**
   * Edit a resource with the provided title
   * @param resourceTitle Title of the resource to edit
   * @param newData New data for the resource
   */
  editResource(
    resourceTitle: string,
    newData: {
      title?: string;
      url?: string;
      description?: string;
      type?: 'article' | 'video' | 'course';
      tags?: string[];
    }
  ): void {
    // Find the resource by title and click its edit button
    cy.contains(this.selectors.resourceTitle, resourceTitle)
      .closest(this.selectors.resourceItem)
      .find(this.selectors.editButton)
      .then($button => {
        if ($button.length) {
          cy.wrap($button).click();
          this.waitForElement(this.selectors.resourceForm);

          // Update fields as provided
          if (newData.title) {
            cy.get(this.selectors.titleInput).clear().type(newData.title);
          }

          if (newData.url) {
            cy.get(this.selectors.urlInput).clear().type(newData.url);
          }

          if (newData.description) {
            cy.get(this.selectors.descriptionInput).clear().type(newData.description);
          }

          if (newData.type) {
            cy.get(this.selectors.typeSelect).select(newData.type);
          }

          this.submitResourceForm();
          this.takeScreenshot('resource-edited');
        } else {
          cy.log(`Could not find edit button for resource: ${resourceTitle}`);
          this.takeScreenshot('resource-edit-failed');
        }
      });
  }

  /**
   * Delete a resource with the provided title
   * @param resourceTitle Title of the resource to delete
   */
  deleteResource(resourceTitle: string): void {
    // Find the resource by title and click its delete button
    cy.contains(this.selectors.resourceTitle, resourceTitle)
      .closest(this.selectors.resourceItem)
      .find(this.selectors.deleteButton)
      .then($button => {
        if ($button.length) {
          cy.wrap($button).click();

          // Confirm deletion if there's a confirmation dialog
          this.elementExists(this.selectors.confirmDeleteButton).then(hasConfirm => {
            if (hasConfirm) {
              this.click(this.selectors.confirmDeleteButton);
            }
          });

          this.takeScreenshot('resource-deleted');
        } else {
          cy.log(`Could not find delete button for resource: ${resourceTitle}`);
          this.takeScreenshot('resource-delete-failed');
        }
      });
  }

  /**
   * Check if a resource with the provided title exists
   * @param resourceTitle Title of the resource to check
   */
  resourceExists(resourceTitle: string): Cypress.Chainable<boolean> {
    return cy.get('body').then($body => {
      return $body.find(`${this.selectors.resourceTitle}:contains("${resourceTitle}")`).length > 0;
    });
  }
}