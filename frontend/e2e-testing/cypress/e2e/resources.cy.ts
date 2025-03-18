import { setupAuthenticatedTest } from '../support/beforeEach';
import { seedResources } from '../support/seedTestData';

describe('Resources Management', () => {
  beforeEach(() => {
    setupAuthenticatedTest('/resources');

    // Seed test resources
    seedResources(5);

    // Reload the page to see the seeded resources
    cy.reload();
  });

  it('should display resources list and allow filtering', () => {
    // Check that resources list is displayed
    cy.get('[data-testid="resources-list"]').should('be.visible');

    // Test filtering by type
    cy.get('[data-testid="filter-type"]').click();
    cy.get('[data-testid="filter-type-articles"]').click();
    cy.url().should('include', 'type=articles');

    // Test filtering by topic
    cy.get('[data-testid="filter-topic"]').click();
    cy.get('[data-testid="filter-topic-python"]').click();
    cy.url().should('include', 'topic=python');

    // Test filtering by difficulty
    cy.get('[data-testid="filter-difficulty"]').click();
    cy.get('[data-testid="filter-difficulty-beginner"]').click();
    cy.url().should('include', 'difficulty=beginner');

    // Test filtering by completion status
    cy.get('[data-testid="filter-status"]').click();
    cy.get('[data-testid="filter-status-completed"]').click();
    cy.url().should('include', 'status=completed');

    // Clear filters
    cy.get('[data-testid="clear-filters"]').click();
    cy.url().should('not.include', 'type=');
    cy.url().should('not.include', 'topic=');
    cy.url().should('not.include', 'difficulty=');
    cy.url().should('not.include', 'status=');
  });

  it('should allow creating a new resource', () => {
    // Click on add resource button
    cy.get('[data-testid="add-resource"]').click();

    // Fill out the resource form
    cy.get('[data-testid="resource-type"]').click();
    cy.get('[data-testid="resource-type-articles"]').click();

    const resourceTitle = `Test Resource ${Date.now()}`;
    cy.get('input[name="title"]').type(resourceTitle);
    cy.get('input[name="url"]').type('https://example.com/test-resource');

    cy.get('[data-testid="resource-difficulty"]').click();
    cy.get('[data-testid="resource-difficulty-intermediate"]').click();

    cy.get('input[name="estimated_time"]').type('60');

    cy.get('[data-testid="resource-topics"]').type('python{enter}testing{enter}');

    cy.get('textarea[name="notes"]').type('This is a test resource created by Cypress');

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Verify the resource was created
    cy.get('[data-testid="success-notification"]').should('be.visible');

    // Verify the resource appears in the list
    cy.get('[data-testid="resources-list"]').contains(resourceTitle).should('be.visible');
  });

  it('should allow editing an existing resource', () => {
    // Find the first resource and click edit
    cy.get('[data-testid="resource-item"]').first().within(() => {
      cy.get('[data-testid="edit-resource"]').click();
    });

    // Update the resource title
    const updatedTitle = `Updated Resource ${Date.now()}`;
    cy.get('input[name="title"]').clear().type(updatedTitle);

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Verify the resource was updated
    cy.get('[data-testid="success-notification"]').should('be.visible');

    // Verify the updated resource appears in the list
    cy.get('[data-testid="resources-list"]').contains(updatedTitle).should('be.visible');
  });

  it('should allow marking a resource as completed', () => {
    // Find the first resource and click complete
    cy.get('[data-testid="resource-item"]').first().within(() => {
      cy.get('[data-testid="complete-resource"]').click();
    });

    // Fill out the completion form
    cy.get('textarea[name="notes"]').type('Completed during Cypress testing');

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Verify the resource was marked as completed
    cy.get('[data-testid="success-notification"]').should('be.visible');

    // Verify the resource shows as completed in the list
    cy.get('[data-testid="resource-item"]').first().within(() => {
      cy.get('[data-testid="completed-badge"]').should('be.visible');
    });
  });

  it('should allow deleting a resource', () => {
    // Get the title of the first resource
    let resourceTitle;
    cy.get('[data-testid="resource-item"]').first().within(() => {
      cy.get('[data-testid="resource-title"]').invoke('text').then((text) => {
        resourceTitle = text;
      });
    });

    // Find the first resource and click delete
    cy.get('[data-testid="resource-item"]').first().within(() => {
      cy.get('[data-testid="delete-resource"]').click();
    });

    // Confirm deletion
    cy.get('[data-testid="confirm-delete"]').click();

    // Verify the resource was deleted
    cy.get('[data-testid="success-notification"]').should('be.visible');

    // Verify the resource no longer appears in the list
    cy.get('[data-testid="resources-list"]').contains(resourceTitle).should('not.exist');
  });

  it('should extract metadata from URL', () => {
    // Click on add resource button
    cy.get('[data-testid="add-resource"]').click();

    // Select article type
    cy.get('[data-testid="resource-type"]').click();
    cy.get('[data-testid="resource-type-articles"]').click();

    // Enter a URL and click extract
    cy.get('input[name="url"]').type('https://example.com/test-article');
    cy.get('[data-testid="extract-metadata"]').click();

    // Verify metadata was extracted
    cy.get('input[name="title"]').should('not.have.value', '');
    cy.get('[data-testid="resource-topics"]').should('not.have.value', '');

    // Cancel the form
    cy.get('[data-testid="cancel-button"]').click();
  });
});