import { setupCompleteAuthBypass } from '../support/auth-test-utils';

describe('Knowledge Management - Spaced Repetition E2E Flow', () => {
  // This test validates that we can navigate to the Knowledge section from the homepage
  it('should navigate to the Knowledge section if available', () => {
    // Use our authentication bypass
    setupCompleteAuthBypass();

    // Clear cookies and local storage
    cy.clearCookies();
    cy.clearLocalStorage();

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

        // Check if we got redirected to login
        cy.url().then(url => {
          if (url.includes('/auth/login')) {
            cy.log('Redirected to login, handling authentication');
            // If login form exists, fill it out
            cy.get('input[type="email"]').then($emailInput => {
              if ($emailInput.length > 0) {
                cy.get('input[type="email"]').type('test@example.com');
                cy.get('input[type="password"]').type('password123');
                cy.get('button[type="submit"]').click();
              } else {
                // Our auth bypass should handle it, but might need a moment
                cy.wait(1000);
                cy.visit('/knowledge');
              }
            });
          }
        });

        // We should eventually reach the knowledge section
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
    // Use our authentication bypass
    setupCompleteAuthBypass();

    // Clear cookies and local storage
    cy.clearCookies();
    cy.clearLocalStorage();

    // First visit the home page to establish auth and possibly cookies
    cy.visit('/', { failOnStatusCode: false });

    // Now attempt to navigate to the Knowledge section
    cy.visit('/knowledge', { failOnStatusCode: false });

    // Check if we got redirected to login
    cy.url().then(url => {
      if (url.includes('/auth/login')) {
        cy.log('Redirected to login, handling authentication');
        // If login form exists, fill it out
        cy.get('input[type="email"]').then($emailInput => {
          if ($emailInput.length > 0) {
            cy.get('input[type="email"]').type('test@example.com');
            cy.get('input[type="password"]').type('password123');
            cy.get('button[type="submit"]').click();

            // We should be redirected back to the knowledge page
            cy.url().should('include', '/knowledge');
          } else {
            // If no login form, try using our auth bypass again
            setupCompleteAuthBypass();
            cy.wait(1000);
            cy.visit('/knowledge');
          }
        });
      }
    });

    // After all authentication attempts, we should be on the knowledge page
    cy.url().then(url => {
      if (!url.includes('/knowledge')) {
        // If still not on knowledge page, try one more approach - click knowledge link on homepage
        cy.visit('/');
        cy.contains('a', 'Knowledge').click({ force: true });
      }
    });

    // Finally check if we've reached the knowledge page
    cy.url().should('include', '/knowledge');

    // Take a screenshot after authentication
    cy.screenshot('knowledge-page-after-auth');

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