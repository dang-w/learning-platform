/**
 * Knowledge Test Page E2E Tests
 *
 * This file tests the isolated knowledge test page that doesn't require authentication
 * and provides a more stable testing environment for knowledge management features.
 */

describe('Knowledge Test Page', () => {
  beforeEach(() => {
    // Visit the test page directly without authentication
    cy.visitTestPage('knowledge');

    // Take a screenshot for debugging
    cy.screenshot('knowledge-test-page-initial');

    // Wait for the page to load
    cy.getByTestId('concepts-container').should('be.visible');
  });

  it('should display concepts list and allow navigation between tabs', () => {
    // Verify the heading and that we're on the concepts tab by default
    cy.contains('Test Knowledge Management').should('be.visible');
    cy.getByTestId('concepts-list').should('be.visible');

    // Navigate to review tab
    cy.getByTestId('nav-knowledge-review').click();
    cy.getByTestId('review-dashboard').should('be.visible');

    // Navigate to statistics tab
    cy.getByTestId('nav-knowledge-stats').click();
    cy.getByTestId('knowledge-statistics').should('be.visible');

    // Navigate back to concepts tab
    cy.getByTestId('nav-knowledge-concepts').click();
    cy.getByTestId('concepts-list').should('be.visible');
  });

  it('should allow creating a new concept', () => {
    // Open the concept form
    cy.getByTestId('add-concept-button').click();
    cy.getByTestId('concept-form').should('be.visible');

    // Fill out the form
    const conceptTitle = `Test Concept ${Date.now()}`;
    cy.getByTestId('concept-title-input').type(conceptTitle);
    cy.getByTestId('concept-description-input').type('This is a test concept created by Cypress');
    cy.getByTestId('concept-difficulty').select('intermediate');
    cy.getByTestId('concept-topics').type('Testing, Cypress, E2E');

    // Save the concept
    cy.getByTestId('save-concept-button').click();

    // Verify the concept was created
    cy.getByTestId('concept-form').should('not.exist');
    cy.contains(conceptTitle).should('be.visible');
  });

  it('should allow reviewing concepts', () => {
    // Go to review tab
    cy.getByTestId('nav-knowledge-review').click();
    cy.getByTestId('review-dashboard').should('be.visible');

    // Start a review session
    cy.getByTestId('start-review-button').click();
    cy.getByTestId('review-session').should('be.visible');

    // Verify concept content is visible
    cy.getByTestId('concept-content').should('be.visible');

    // Rate the concept
    cy.getByTestId('recall-rating-4').click();

    // The test might end the review here or show another concept
    cy.get('body').then(($body) => {
      // If review is complete
      if ($body.find('[data-testid="review-complete"]').length > 0) {
        cy.getByTestId('return-to-dashboard-button').click();
        cy.getByTestId('nav-knowledge-concepts').should('be.visible');
      }
      // If there are more concepts to review
      else if ($body.find('[data-testid="concept-content"]').length > 0) {
        cy.getByTestId('concept-content').should('be.visible');
      }
    });
  });

  it('should display statistics correctly', () => {
    // Go to statistics tab
    cy.getByTestId('nav-knowledge-stats').click();
    cy.getByTestId('knowledge-statistics').should('be.visible');

    // Verify charts are visible
    cy.getByTestId('review-history-chart').should('be.visible');
    cy.getByTestId('concepts-by-status-chart').should('be.visible');
    cy.getByTestId('recall-performance-chart').should('be.visible');

    // Verify summary statistics are displayed
    cy.contains('Total Concepts').should('be.visible');
    cy.contains('Mastered').should('be.visible');
    cy.contains('Learning').should('be.visible');
    cy.contains('Needs Work').should('be.visible');
  });
});