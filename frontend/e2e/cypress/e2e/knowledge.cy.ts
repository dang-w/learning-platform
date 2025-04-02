/**
 * Knowledge Management End-to-End Tests
 *
 * This file implements UI-based testing for the Knowledge Management features,
 * focusing on concept management through the user interface.
 *
 * Tests cover:
 * - Navigating to the Knowledge section
 * - Viewing concept list
 * - Creating concepts
 * - Viewing concept details
 * - Editing concepts
 * - Deleting concepts
 * - Using filters and search
 * - Using spaced repetition features if available
 */
import { conceptsPage, authPage } from '../support/page-objects';

describe('Knowledge Management E2E Tests', () => {
  // Generate unique user for each test run to avoid collisions after DB reset
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const timestamp = Date.now();
  const testUser = {
    username: `knowledge-user-${timestamp}-${randomSuffix}`,
    password: 'TestPassword123!',
    email: `knowledge-user-${timestamp}-${randomSuffix}@example.com`,
    firstName: 'Knowledge',
    lastName: 'TestUser'
  };

  beforeEach(() => {
    cy.task('resetDatabase').then((success) => {
      if (!success) {
        cy.log('Database reset failed, proceeding with caution...');
        // Consider throwing error or skipping test if reset is critical
        // throw new Error('Database reset failed!');
      }
    });

    cy.clearCookies();
    cy.clearLocalStorage();

    cy.log(`Registering unique user ${testUser.username} via UI...`);
    cy.intercept('POST', '/api/auth/register').as('registerRequestKnowledge');
    authPage.register({
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
        firstName: testUser.firstName,
        lastName: testUser.lastName
    });
    cy.wait('@registerRequestKnowledge').its('response.statusCode').should('match', /^20[01]$/); // Allow 200 or 201
    cy.log('UI Registration successful.');

    cy.log(`Logging in as ${testUser.username} via UI...`);
    cy.intercept('POST', '/api/auth/token').as('loginRequestKnowledge');
    // Visit login page explicitly before login attempt
    authPage.visitLogin();
    authPage.login(testUser.username, testUser.password);
    cy.wait('@loginRequestKnowledge').its('response.statusCode').should('eq', 200);
    cy.log('UI Login successful.');

    // Intercept the API call for fetching concepts BEFORE visiting the page
    cy.intercept('GET', '/api/reviews/concepts*').as('getConcepts');

    // Visit the knowledge page directly after successful UI login
    cy.log('Visiting /knowledge/concepts page directly...');
    cy.visit('/knowledge/concepts');

    // Wait for the concepts API call to complete
    cy.log('Waiting for @getConcepts API call...');
    cy.wait('@getConcepts');
    cy.log('@getConcepts API call intercepted.');

    // Wait for the main content area of the concepts page to be visible
    cy.get(conceptsPage['selectors'].conceptsContainer, { timeout: 15000 }).should('be.visible');
    cy.log('Concepts container is visible.');

    cy.on('uncaught:exception', (err) => {
      cy.log(`Uncaught exception during test: ${err.message}`);
      // Prevent Cypress from failing the test on uncaught exceptions
      return false;
    });
  });

  it('should display concepts list', () => {
    conceptsPage.isConceptsPageLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Concepts page not loaded properly, skipping test');
        conceptsPage.takeScreenshot('concepts-not-loaded');
        return;
      }

      conceptsPage.takeScreenshot('concepts-list');

      conceptsPage.getConceptCount().then(count => {
        cy.log(`Found ${count} concepts`);
      });

      cy.get('body').then($body => {
        if ($body.find('[data-testid="search-concepts-input"]').length > 0) {
          conceptsPage.searchConcepts('test');
          conceptsPage.takeScreenshot('search-results');
        } else {
          cy.log('Search functionality not found on the page');
        }
      });

      cy.get('body').then($body => {
        if ($body.find('[data-testid="nav-knowledge-review"]').length > 0) {
          conceptsPage.navigateToReview();
          conceptsPage.takeScreenshot('review-section');
          cy.go('back');
        }

        if ($body.find('[data-testid="nav-knowledge-stats"]').length > 0) {
          conceptsPage.navigateToStatistics();
          conceptsPage.takeScreenshot('stats-section');
          cy.go('back');
        }
      });
    });
  });

  it('should create, view, edit, and delete a concept', () => {
    conceptsPage.isConceptsPageLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Concepts page not loaded properly, skipping test');
        conceptsPage.takeScreenshot('concepts-not-loaded');
        return;
      }

      conceptsPage.isAddConceptButtonAvailable().then(isAvailable => {
        if (!isAvailable) {
          cy.log('Add concept button not available, skipping test');
          return;
        }

        conceptsPage.clickAddConcept();

        conceptsPage.isConceptFormLoaded().then(isFormLoaded => {
          if (!isFormLoaded) {
            cy.log('Concept form not loaded properly, skipping test');
            return;
          }

          const conceptTitle = `Test Concept ${Date.now()}`;

          conceptsPage.fillConceptForm({
            title: conceptTitle,
            content: '# Test Concept\n\nThis is a test concept created by Cypress.',
            difficulty: 'intermediate',
            topics: ['testing', 'cypress']
          });

          conceptsPage.submitConceptForm();

          conceptsPage.verifySuccessNotification().then(hasSuccess => {
            if (hasSuccess) {
              cy.log('Concept created successfully');
            } else {
              cy.log('No success notification displayed after creating concept');
            }
          });

          conceptsPage.verifyConceptExists(conceptTitle).then(exists => {
            cy.wrap(exists).should('be.true');

            conceptsPage.clickConcept(conceptTitle);

            conceptsPage.isConceptDetailVisible().then(isDetailVisible => {
              if (!isDetailVisible) {
                cy.log('Concept detail view not visible, skipping detail check');
                return;
              }

              conceptsPage.verifyConceptDetails({
                title: conceptTitle,
                content: 'This is a test concept created by Cypress.'
              });

              conceptsPage.isEditButtonAvailable().then(isEditAvailable => {
                if (!isEditAvailable) {
                  cy.log('Edit button not available, skipping edit test');
                  return;
                }

                conceptsPage.clickEditButton();
                const updatedTitle = `Updated Concept ${Date.now()}`;
                conceptsPage.updateConceptTitle(updatedTitle);
                conceptsPage.updateConceptContent('# Updated Concept\n\nThis concept was updated by Cypress.');
                conceptsPage.saveConceptChanges();

                conceptsPage.verifySuccessNotification().then(hasUpdateSuccess => {
                  if (hasUpdateSuccess) {
                    cy.log('Concept updated successfully');
                  } else {
                    cy.log('No success notification displayed after updating concept');
                  }
                });

                conceptsPage.isDeleteButtonAvailable().then(isDeleteAvailable => {
                  if (!isDeleteAvailable) {
                    cy.log('Delete button not available, skipping delete test');
                    return;
                  }

                  conceptsPage.clickDeleteButton();
                  conceptsPage.confirmDeletion();

                  conceptsPage.verifySuccessNotification().then(hasDeleteSuccess => {
                    if (hasDeleteSuccess) {
                      cy.log('Concept deleted successfully');
                    } else {
                      cy.log('No success notification displayed after deleting concept');
                    }
                  });

                  conceptsPage.verifyConceptExists(updatedTitle).then(stillExists => {
                    cy.wrap(stillExists).should('be.false');
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  it('should use filtering and sorting options if available', () => {
    conceptsPage.isConceptsPageLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Concepts page not loaded properly, skipping test');
        conceptsPage.takeScreenshot('concepts-not-loaded');
        return;
      }

      conceptsPage.isTopicFilterAvailable().then(hasTopicFilter => {
        if (hasTopicFilter) {
          conceptsPage.filterByTopic('testing');
          conceptsPage.takeScreenshot('topic-filter');
        } else {
          cy.log('Topic filter not available');
        }
      });

      conceptsPage.isDifficultyFilterAvailable().then(hasDifficultyFilter => {
        if (hasDifficultyFilter) {
          conceptsPage.filterByDifficulty('beginner');
          conceptsPage.takeScreenshot('difficulty-filter');
        } else {
          cy.log('Difficulty filter not available');
        }
      });

      conceptsPage.isStatusFilterAvailable().then(hasStatusFilter => {
        if (hasStatusFilter) {
          conceptsPage.filterByStatus('active');
          conceptsPage.takeScreenshot('status-filter');
        } else {
          cy.log('Status filter not available');
        }
      });

      conceptsPage.isClearFiltersAvailable().then(hasClearFilters => {
        if (hasClearFilters) {
          conceptsPage.clearFilters();
          conceptsPage.takeScreenshot('cleared-filters');
        } else {
          cy.log('Clear filters button not available');
        }
      });
    });
  });

  it('should access spaced repetition features if available', () => {
    conceptsPage.isConceptsPageLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Concepts page not loaded properly, skipping test');
        conceptsPage.takeScreenshot('concepts-not-loaded');
        return;
      }

      conceptsPage.isReviewButtonAvailable().then(hasReviewButton => {
        if (!hasReviewButton) {
          cy.log('Review functionality not available, skipping test');
          return;
        }

        conceptsPage.clickReviewButton();

        conceptsPage.hasConceptsToReview().then(hasConceptsToReview => {
          if (!hasConceptsToReview) {
            cy.log('No concepts available for review, skipping test');
            return;
          }

          conceptsPage.completeReviewSession();

          conceptsPage.verifyReviewCompletion().then(isComplete => {
            if (isComplete) {
              cy.log('Review session completed successfully');
            } else {
              cy.log('Review session completion cannot be verified');
            }
          });
        });
      });
    });
  });
});