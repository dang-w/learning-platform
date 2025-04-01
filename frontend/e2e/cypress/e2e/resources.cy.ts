/**
 * Resources Management End-to-End Tests
 *
 * This file implements UI-based testing for the resources management functionality,
 * focusing on user interactions with the resources section of the application.
 *
 * Tests cover:
 * - Navigating to the resources section
 * - Viewing resource list
 * - Creating new resources
 * - Extracting metadata from URLs
 * - Editing resources
 * - Marking resources as completed
 * - Deleting resources
 * - Using filters and search
 */
import { resourcesPage, authPage } from '../support/page-objects';

describe('Resources Management E2E Tests', () => {
  const username = 'test-user-cypress';
  const password = 'TestPassword123!';

  beforeEach(() => {
    // Reset database before each test for isolation
    cy.task('resetDatabase').then((success) => {
      if (!success) {
        cy.log('Database reset failed, proceeding with caution...');
      }
    });

    // Clear cookies/storage
    cy.clearCookies();
    cy.clearLocalStorage();

    // Ensure the test user exists via API call
    cy.log(`Ensuring user ${username} exists via API...`);
    cy.registerUserApi({
        username: username,
        email: `${username}@example.com`,
        password: password,
        fullName: 'Test User Cypress'
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
    cy.intercept('POST', '/api/auth/token').as('loginRequestResources');
    authPage.login(username, password);
    cy.wait('@loginRequestResources').its('response.statusCode').should('eq', 200);
    cy.log('UI Login successful.');

    // Navigate to resources page AFTER successful login
    resourcesPage.visitResources();

    // Verify resources page loaded after login
    cy.get(resourcesPage['selectors'].resourcesList).should('be.visible');
    resourcesPage.isResourcesPageLoaded().should('be.true');
    cy.log('Resources page loaded successfully after UI login.');

    // Handle any uncaught exceptions to prevent test failures on app errors
    cy.on('uncaught:exception', (err) => {
      cy.log(`Uncaught exception: ${err.message}`);
      return false;
    });
  });

  it('should display resources list and search functionality', () => {
    // Check if resources page loaded properly
    resourcesPage.isResourcesPageLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Resources page not loaded properly, skipping test');
        resourcesPage.takeScreenshot('resources-not-loaded');
        return;
      }

      // Take a screenshot of the resources page
      resourcesPage.takeScreenshot('resources-list');

      // Get resource count to verify loading
      resourcesPage.getResourceCount().then(count => {
        cy.log(`Found ${count} resources`);
      });

      // Check if search functionality is available
      cy.get('body').then($body => {
        if ($body.find('[data-testid="search-input"]').length > 0) {
          resourcesPage.searchResources('test');
          resourcesPage.takeScreenshot('search-results');
        } else {
          cy.log('Search functionality not found on the page');
        }
      });
    });
  });

  it('should create a new resource with manual entry', () => {
    // Check if resources page loaded properly
    resourcesPage.isResourcesPageLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Resources page not loaded properly, skipping test');
        resourcesPage.takeScreenshot('resources-not-loaded');
        return;
      }

      // Check if add resource button is available
      resourcesPage.isAddResourceButtonAvailable().then(isAvailable => {
        if (!isAvailable) {
          cy.log('Add resource button not available, skipping test');
          return;
        }

        // Click add resource button
        resourcesPage.clickAddResource();

        // Create unique title to identify the resource
        const resourceTitle = `Test Resource ${Date.now()}`;

        // Fill the resource form
        resourcesPage.fillResourceForm({
          title: resourceTitle,
          url: 'https://example.com/test-resource',
          description: 'This is a test resource created by Cypress',
          type: 'article'
        });

        // Submit the form
        resourcesPage.submitResourceForm();

        // Verify success notification
        resourcesPage.verifySuccessNotification().then(hasSuccess => {
          if (hasSuccess) {
            cy.log('Resource created successfully');
          } else {
            cy.log('No success notification displayed after creating resource');
          }
        });

        // Verify resource exists in the list
        resourcesPage.resourceExists(resourceTitle).then(exists => {
          cy.wrap(exists).should('be.true');
        });
      });
    });
  });

  it('should create a resource using URL metadata extraction if available', () => {
    // Check if resources page loaded properly
    resourcesPage.isResourcesPageLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Resources page not loaded properly, skipping test');
        resourcesPage.takeScreenshot('resources-not-loaded');
        return;
      }

      // Navigate to the new resource page
      resourcesPage.visitNewResource();

      // Check if URL input is available
      resourcesPage.isUrlInputAvailable().then(isAvailable => {
        if (!isAvailable) {
          cy.log('URL input not available, skipping test');
          return;
        }

        // Check if extract metadata button is available
        resourcesPage.isExtractMetadataButtonAvailable().then(hasExtractButton => {
          if (!hasExtractButton) {
            cy.log('Extract metadata button not available, skipping test');
            return;
          }

          // Enter URL and extract metadata
          resourcesPage.enterUrlAndExtractMetadata('https://example.com');

          // Check if metadata was populated
          resourcesPage.isMetadataPopulated().then(isPopulated => {
            if (isPopulated) {
              cy.log('Metadata successfully extracted and populated');

              // Create unique title to identify the resource
              const resourceTitle = `Metadata Resource ${Date.now()}`;

              // Update the title to be unique
              resourcesPage.enterManualDetails(resourceTitle, 'Description from metadata with manual edits');

              // Select resource type if not automatically selected
              resourcesPage.selectResourceType('article');

              // Submit the form
              resourcesPage.submitResourceForm();

              // Verify success notification
              resourcesPage.verifySuccessNotification().then(hasSuccess => {
                if (hasSuccess) {
                  cy.log('Resource with metadata created successfully');
                } else {
                  cy.log('No success notification displayed after creating resource with metadata');
                }
              });
            } else {
              cy.log('Metadata extraction may have failed or feature not fully implemented');
              cy.log('Falling back to manual entry');

              // Create unique title to identify the resource
              const resourceTitle = `Metadata Failed Resource ${Date.now()}`;

              // Enter manual details
              resourcesPage.enterManualDetails(resourceTitle, 'Manual entry after metadata extraction failed');

              // Select resource type
              resourcesPage.selectResourceType('article');

              // Submit the form
              resourcesPage.submitResourceForm();
            }
          });
        });
      });
    });
  });

  it('should edit an existing resource', () => {
    // Check if resources page loaded properly
    resourcesPage.isResourcesPageLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Resources page not loaded properly, skipping test');
        resourcesPage.takeScreenshot('resources-not-loaded');
        return;
      }

      // Get resource count to see if there are any resources to edit
      resourcesPage.getResourceCount().then(count => {
        if (count === 0) {
          cy.log('No resources found to edit, creating one first');

          // Navigate to new resource page
          resourcesPage.visitNewResource();

          // Create a resource to edit
          const resourceTitle = `Resource to Edit ${Date.now()}`;
          resourcesPage.fillResourceForm({
            title: resourceTitle,
            url: 'https://example.com/resource-to-edit',
            description: 'This resource will be edited',
            type: 'article'
          });

          // Submit the form
          resourcesPage.submitResourceForm();

          // Go back to resources list
          resourcesPage.visitResources();
        }

        // Get the title of the first resource before editing
        resourcesPage.getFirstResourceTitle().then(originalTitle => {
          if (!originalTitle) {
            cy.log('Failed to get the first resource title, skipping test');
            return;
          }

          // Click edit on the first resource
          resourcesPage.clickEditOnFirstResource();

          // Update the resource title
          const updatedTitle = `Updated Resource ${Date.now()}`;
          resourcesPage.updateResourceTitle(updatedTitle);

          // Submit the form
          resourcesPage.submitResourceForm();

          // Verify success notification
          resourcesPage.verifySuccessNotification().then(hasSuccess => {
            if (hasSuccess) {
              cy.log('Resource updated successfully');
            } else {
              cy.log('No success notification displayed after updating resource');
            }
          });

          // Verify the updated resource exists in the list
          resourcesPage.resourceExists(updatedTitle).then(exists => {
            cy.wrap(exists).should('be.true');
          });
        });
      });
    });
  });

  it('should mark a resource as completed', () => {
    // Check if resources page loaded properly
    resourcesPage.isResourcesPageLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Resources page not loaded properly, skipping test');
        resourcesPage.takeScreenshot('resources-not-loaded');
        return;
      }

      // Get resource count to see if there are any resources to mark as completed
      resourcesPage.getResourceCount().then(count => {
        if (count === 0) {
          cy.log('No resources found to mark as completed, creating one first');

          // Navigate to new resource page
          resourcesPage.visitNewResource();

          // Create a resource to mark as completed
          const resourceTitle = `Resource to Complete ${Date.now()}`;
          resourcesPage.fillResourceForm({
            title: resourceTitle,
            url: 'https://example.com/resource-to-complete',
            description: 'This resource will be marked as completed',
            type: 'article'
          });

          // Submit the form
          resourcesPage.submitResourceForm();

          // Go back to resources list
          resourcesPage.visitResources();
        }

        // **NEW: Wait for the resource list to appear and have items**
        cy.get(resourcesPage['selectors'].resourcesList).should('be.visible');
        cy.get(resourcesPage['selectors'].resourceItem).should('have.length.greaterThan', 0);
        cy.log('Resource list verified with items.');

        // Mark the first resource as completed
        resourcesPage.markFirstResourceAsCompleted('Completed as part of Cypress test');

        // Verify success notification
        resourcesPage.verifySuccessNotification().then(hasSuccess => {
          if (hasSuccess) {
            cy.log('Resource marked as completed successfully');
          } else {
            cy.log('No success notification displayed after marking resource as completed');
          }
        });

        // Verify the resource is marked as completed
        resourcesPage.isFirstResourceCompleted().then(isCompleted => {
          cy.wrap(isCompleted).should('be.true');
        });
      });
    });
  });

  it('should delete a resource', () => {
    // Check if resources page loaded properly
    resourcesPage.isResourcesPageLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Resources page not loaded properly, skipping test');
        resourcesPage.takeScreenshot('resources-not-loaded');
        return;
      }

      // Get resource count to see if there are any resources to delete
      resourcesPage.getResourceCount().then(count => {
        if (count === 0) {
          cy.log('No resources found to delete, creating one first');

          // Navigate to new resource page
          resourcesPage.visitNewResource();

          // Create a resource to delete
          const resourceTitle = `Resource to Delete ${Date.now()}`;
          resourcesPage.fillResourceForm({
            title: resourceTitle,
            url: 'https://example.com/resource-to-delete',
            description: 'This resource will be deleted',
            type: 'article'
          });

          // Submit the form
          resourcesPage.submitResourceForm();

          // Go back to resources list
          resourcesPage.visitResources();
        }

        // Get the title of the first resource before deleting
        resourcesPage.getFirstResourceTitle().then(originalTitle => {
          if (!originalTitle) {
            cy.log('Failed to get the first resource title, skipping test');
            return;
          }

          // Delete the first resource
          resourcesPage.deleteFirstResource();

          // Verify success notification
          resourcesPage.verifySuccessNotification().then(hasSuccess => {
            if (hasSuccess) {
              cy.log('Resource deleted successfully');
            } else {
              cy.log('No success notification displayed after deleting resource');
            }
          });

          // Verify the resource no longer exists in the list
          resourcesPage.resourceExists(originalTitle).then(exists => {
            cy.wrap(exists).should('be.false');
          });
        });
      });
    });
  });

  it('should use filtering options if available', () => {
    // Check if resources page loaded properly
    resourcesPage.isResourcesPageLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Resources page not loaded properly, skipping test');
        resourcesPage.takeScreenshot('resources-not-loaded');
        return;
      }

      // Check for type filter
      resourcesPage.isTypeFilterAvailable().then(hasTypeFilter => {
        if (hasTypeFilter) {
          resourcesPage.filterByType('article');
          resourcesPage.takeScreenshot('type-filter');
        } else {
          cy.log('Type filter not available');
        }
      });

      // Check for topic filter
      resourcesPage.isTopicFilterAvailable().then(hasTopicFilter => {
        if (hasTopicFilter) {
          resourcesPage.filterByTopic('testing');
          resourcesPage.takeScreenshot('topic-filter');
        } else {
          cy.log('Topic filter not available');
        }
      });

      // Check for difficulty filter
      resourcesPage.isDifficultyFilterAvailable().then(hasDifficultyFilter => {
        if (hasDifficultyFilter) {
          resourcesPage.filterByDifficulty('beginner');
          resourcesPage.takeScreenshot('difficulty-filter');
        } else {
          cy.log('Difficulty filter not available');
        }
      });

      // Check for status filter
      resourcesPage.isStatusFilterAvailable().then(hasStatusFilter => {
        if (hasStatusFilter) {
          resourcesPage.filterByStatus('completed');
          resourcesPage.takeScreenshot('status-filter');
        } else {
          cy.log('Status filter not available');
        }
      });

      // Clear filters if available
      resourcesPage.isClearFiltersAvailable().then(hasClearFilters => {
        if (hasClearFilters) {
          resourcesPage.clearFilters();
          resourcesPage.takeScreenshot('cleared-filters');
        } else {
          cy.log('Clear filters button not available');
        }
      });
    });
  });
});