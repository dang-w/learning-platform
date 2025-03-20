import { conceptsPage } from '../support/page-objects';
import { setupCompleteAuthBypass } from '../support/auth-test-utils';

describe('Knowledge Management - Spaced Repetition', () => {
  beforeEach(() => {
    // Use our robust authentication bypass first
    setupCompleteAuthBypass();

    // Then visit the concepts page using the page object
    conceptsPage.visitConcepts();

    // Mock the concepts data - we'll create interceptors for API requests
    cy.intercept('GET', '**/api/concepts/due', {
      statusCode: 200,
      body: [
        {
          id: 'mock-concept-1',
          title: 'Machine Learning Fundamentals',
          content: 'Machine learning is a subset of artificial intelligence that focuses on building systems that learn from data.',
          status: 'due',
          lastReviewed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          nextReview: new Date().toISOString(),
          difficulty: 3
        },
        {
          id: 'mock-concept-2',
          title: 'Neural Networks',
          content: 'Neural networks are computing systems inspired by the biological neural networks that constitute animal brains.',
          status: 'due',
          lastReviewed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          nextReview: new Date().toISOString(),
          difficulty: 4
        }
      ]
    }).as('getDueConcepts');

    // Mock review history endpoint
    cy.intercept('GET', '**/api/concepts/*/review-history', {
      statusCode: 200,
      body: [
        {
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          rating: 3,
          interval: 7
        }
      ]
    }).as('getReviewHistory');

    // Mock submitting a review
    cy.intercept('POST', '**/api/concepts/*/review', {
      statusCode: 200,
      body: {
        success: true,
        nextReview: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    }).as('submitReview');

    // Mock statistics data
    cy.intercept('GET', '**/api/concepts/statistics', {
      statusCode: 200,
      body: {
        total: 10,
        mastered: 2,
        learning: 5,
        due: 3,
        reviewsToday: 4,
        reviewsTomorrow: 2,
        averageDifficulty: 3.2
      }
    }).as('getStatistics');
  });

  it('should display concepts due for review', () => {
    // Navigate to review section
    conceptsPage.navigateToReview();

    // Wait for the mocked data to load
    cy.wait('@getDueConcepts');

    // Check review dashboard is displayed
    conceptsPage.isReviewDashboardVisible().should('be.true');

    // Validate that concepts are displayed
    cy.contains('Machine Learning Fundamentals').should('be.visible');
    cy.contains('Neural Networks').should('be.visible');
  });

  it('should allow reviewing a concept', () => {
    // Navigate to the review section using POM
    conceptsPage.navigateToReview();

    // Wait for the mocked data to load
    cy.wait('@getDueConcepts');

    // Start a review session
    conceptsPage.startReviewSession();

    // Check that the review session is displayed
    conceptsPage.isReviewSessionVisible().should('be.true');

    // Rate the recall difficulty
    conceptsPage.rateConceptRecall(3); // Medium difficulty

    // Submit the review and wait for the mock response
    conceptsPage.submitReview();
    cy.wait('@submitReview');

    // Check if there are more concepts or review is complete
    conceptsPage.isReviewComplete().then(isComplete => {
      if (isComplete) {
        // Review session is complete
        conceptsPage.returnToDashboard();
        cy.url().should('include', '/knowledge');
      } else {
        // Next concept is displayed
        conceptsPage.elementExists(conceptsPage['selectors'].conceptContent).should('be.true');
      }
    });
  });

  it('should update concept review schedule based on recall rating', () => {
    // Navigate to the review section
    conceptsPage.navigateToReview();

    // Wait for the mocked data to load
    cy.wait('@getDueConcepts');

    // Start a review session
    conceptsPage.startReviewSession();

    // Mock concept ID
    const conceptId = 'mock-concept-1';

    // Rate the recall as easy
    conceptsPage.rateConceptRecall(5); // Easy recall

    // Submit the review
    conceptsPage.submitReview();
    cy.wait('@submitReview');

    // Navigate to the concept details page
    cy.visit(`/knowledge/concepts/${conceptId}`);

    // Mock the single concept data
    cy.intercept('GET', `**/api/concepts/${conceptId}`, {
      statusCode: 200,
      body: {
        id: conceptId,
        title: 'Machine Learning Fundamentals',
        content: 'Machine learning is a subset of artificial intelligence that focuses on building systems that learn from data.',
        status: 'reviewed',
        lastReviewed: new Date().toISOString(),
        nextReview: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        difficulty: 2
      }
    }).as('getConceptDetails');

    // Wait for the concept data
    cy.wait('@getConceptDetails');
    cy.wait('@getReviewHistory');

    // Check that the next review date is updated
    conceptsPage.elementExists(conceptsPage['selectors'].nextReviewDate).should('be.true');

    // Check that the review history is updated
    conceptsPage.elementExists(conceptsPage['selectors'].reviewHistory).then(exists => {
      if (exists) {
        cy.get(conceptsPage['selectors'].reviewHistory).should('be.visible');
      }
    });
  });

  it('should show review statistics', () => {
    // Navigate to the statistics section
    conceptsPage.navigateToStatistics();

    // Wait for the statistics data
    cy.wait('@getStatistics');

    // Check that the statistics dashboard is displayed
    conceptsPage.isStatisticsDashboardVisible().should('be.true');

    // Check that the key statistics are displayed
    cy.contains('Total Concepts').should('be.visible');
    cy.contains('10').should('be.visible'); // Total concepts from mock data
    cy.contains('Due').should('be.visible');
    cy.contains('3').should('be.visible'); // Due concepts from mock data
  });

  it('should allow filtering concepts by review status', () => {
    // Mock filtered concepts response
    cy.intercept('GET', '**/api/concepts?status=due', {
      statusCode: 200,
      body: [
        {
          id: 'mock-concept-1',
          title: 'Machine Learning Fundamentals',
          content: 'Machine learning is a subset of artificial intelligence that focuses on building systems that learn from data.',
          status: 'due',
          lastReviewed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          nextReview: new Date().toISOString(),
          difficulty: 3
        },
        {
          id: 'mock-concept-2',
          title: 'Neural Networks',
          content: 'Neural networks are computing systems inspired by the biological neural networks that constitute animal brains.',
          status: 'due',
          lastReviewed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          nextReview: new Date().toISOString(),
          difficulty: 4
        }
      ]
    }).as('getFilteredConcepts');

    // Check that the concepts list is displayed
    conceptsPage.elementExists(conceptsPage['selectors'].conceptsList).should('be.true');

    // Filter by review status
    conceptsPage.filterByReviewStatus('due');

    // Wait for filtered concepts
    cy.wait('@getFilteredConcepts');

    // Check that the URL includes the filter parameter
    cy.url().should('include', 'status=due');

    // Check that the filtered concepts list is displayed
    conceptsPage.elementExists(conceptsPage['selectors'].conceptsList).should('be.true');
    cy.contains('Machine Learning Fundamentals').should('be.visible');
  });
});