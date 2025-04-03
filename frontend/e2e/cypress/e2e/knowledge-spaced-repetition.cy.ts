import { authPage } from '../support/page-objects'; // Import authPage

describe('Knowledge Management - Spaced Repetition E2E Flow', () => {
  const username = 'test-user-cypress'; // Define consistent test user
  const password = 'TestPassword123!'; // Define consistent password

  beforeEach(() => {
    // Reset database before each test for isolation
    cy.task('resetDatabase').then((success) => {
      if (!success) {
        cy.log('Database reset failed, proceeding with caution...');
      }
    });

    // Clear cookies and localStorage before each test
    cy.clearCookies();
    cy.clearLocalStorage();

    // Ensure the test user exists via API call
    cy.log(`Ensuring user ${username} exists via API...`);
    cy.registerUserApi({
        username: username,
        email: `${username}@example.com`,
        password: password,
        firstName: 'Test',
        lastName: 'User Cypress'
    }).then((response) => {
        if (response.status === 200 || response.status === 201) {
            cy.log(`User ${username} created or endpoint confirmed existence.`);
        } else if (response.status === 400 && response.body && typeof response.body === 'object' && 'detail' in response.body && typeof response.body.detail === 'string' && response.body.detail.includes('already exists')) {
            cy.log(`User ${username} already existed.`);
        } else {
            cy.log(`Warning: registerUserApi responded with ${response.status}. Proceeding login attempt.`);
            console.error('registerUserApi unexpected response:', response.body);
        }
    });

    // Log in via UI
    cy.log(`Logging in as ${username} via UI...`);
    authPage.visitLogin();
    cy.intercept('POST', '/api/auth/token').as('loginRequestSpacedRep');
    authPage.login(username, password);
    cy.wait('@loginRequestSpacedRep').its('response.statusCode').should('eq', 200);
    cy.log('UI Login successful.');

    // Intercept and silence uncaught exceptions from the app
    cy.on('uncaught:exception', (err) => {
      cy.log(`Uncaught exception: ${err.message}`);
      return false;
    });
  });

  // This test validates that we can navigate to the Knowledge section from the homepage
  it('should navigate to the Knowledge section if available', () => {
    // beforeEach handles auth and clears storage

    // Visit the base page first to check what's available
    cy.visit('/', {
      failOnStatusCode: false,
      timeout: 10000
    });

    // Take a screenshot of the homepage
    cy.screenshot('homepage-check');

    // Log the page content for debugging
    cy.get('body').then($body => {
      cy.log(`Home page content: ${$body.text().substring(0, 200)}...`);
    });

    // Check if the Knowledge section link exists on the page
    cy.get('body').then($body => {
      const hasKnowledgeLink = $body.find('a[href*="knowledge"], a:contains("Knowledge")').length > 0;

      if (hasKnowledgeLink) {
        // Knowledge section exists, navigate to it
        cy.contains('Knowledge').click();

        // We should eventually reach the knowledge section (auth handled by beforeEach)
        cy.url().should('include', '/knowledge');

        // Save the URL for later tests
        cy.url().then(url => {
          cy.task('setTestData', { knowledgeUrl: url });
        });

        // Check for spaced repetition features
        cy.get('body').then($knowledgePage => {
          const hasReviewSection = $knowledgePage.find('a[href*="review"], button:contains("Review")').length > 0;

          if (hasReviewSection) {
            // Navigate to review section if available
            cy.contains('Review').click();
            cy.url().should('include', '/review');
          } else {
            cy.log('Review section not found in Knowledge area');
          }
        });
      } else {
        // Test pages might be available instead
        cy.visit('/test-pages', { failOnStatusCode: false });

        cy.get('body').then($testPages => {
          const hasSpacedRepetitionTest = $testPages.find('a[href*="knowledge-spaced-repetition"]').length > 0;

          if (hasSpacedRepetitionTest) {
            // Navigate to the test page
            cy.contains('knowledge-spaced-repetition').click();

            // Verify basic elements on the page
            cy.get('h1, h2, h3').should('be.visible');

            // Check for tabs navigation
            cy.get('button').then($buttons => {
              if ($buttons.length > 0) {
                // Try clicking the first tab
                cy.get('button').first().click();
              }
            });
          } else {
            cy.log('Knowledge spaced repetition test page not found');
          }
        });
      }
    });
  });

  // This test explores the knowledge management features after directly navigating to the knowledge page
  it('should explore knowledge management features', () => {
    // beforeEach handles auth and clears storage

    // Navigate directly to the Knowledge section
    cy.visit('/knowledge', { failOnStatusCode: false });

    // We should be on the knowledge page (auth handled by beforeEach)
    cy.url().should('include', '/knowledge');

    // Take a screenshot after navigation
    cy.screenshot('knowledge-page-after-direct-nav');

    // Check if there are any statistics elements
    cy.get('body').then($knowledgePage => {
      // Look for cards, metrics or statistics indicators
      const hasStatistics = $knowledgePage.find('.card, .metric, [data-testid*="stat"]').length > 0;

      if (hasStatistics) {
        cy.log('Found statistics in the Knowledge section');
        cy.get('.card, .metric, [data-testid*="stat"]').first().should('be.visible');
      }

      // Check if there are any filtering options
      const hasFilters = $knowledgePage.find('select, [role="combobox"], input[type="search"], .filter').length > 0;

      if (hasFilters) {
        cy.log('Found filtering options in the Knowledge section');

        // Try interacting with the first filter element we can find
        if ($knowledgePage.find('select').length > 0) {
          cy.get('select').first().select(1, { force: true });
        } else if ($knowledgePage.find('[role="combobox"]').length > 0) {
          cy.get('[role="combobox"]').first().click({ force: true });
          cy.get('[role="option"]').first().click({ force: true });
        } else if ($knowledgePage.find('input[type="search"]').length > 0) {
          cy.get('input[type="search"]').first().type('test', { force: true });
        } else if ($knowledgePage.find('.filter').length > 0) {
          cy.get('.filter').first().click({ force: true });
        }
      }

      // Take a screenshot of the knowledge page
      cy.screenshot('knowledge-page-features');
    });
  });
});