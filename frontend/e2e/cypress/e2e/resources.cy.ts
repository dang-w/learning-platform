import { resourcesPage, authPage } from '../support/page-objects';
import { ResourceCreatePayload } from '../support/types';

// Define a type for the register API response based on usage
interface RegisterApiResponse {
  detail?: string;
  // Add other expected properties if known (e.g., user details on success)
}

describe('New Resources Management E2E Tests', () => {
  // Define user details consistently
  const testUser = {
    username: 'test-user-cypress-new', // Keep the unique username for this test file
    password: 'TestPassword123!',
    email: 'test-user-cypress-new@example.com',
    firstName: 'TestNew',
    lastName: 'UserCypress'
  };

  beforeEach(() => {
    // 1. Reset Database
    cy.task('resetDatabase').then((success) => {
      if (!success) {
        cy.log('Database reset failed, proceeding with caution...');
      } else {
        cy.log('Database reset successful.');
      }
    });

    // 2. Clear Cookies/Storage
    cy.clearCookies();
    cy.clearLocalStorage();

    // 3. Ensure User Exists (API)
    cy.log(`Ensuring user ${testUser.username} exists via API...`);
    cy.registerUserApi({
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
      firstName: testUser.firstName,
      lastName: testUser.lastName
    }).then((response) => {
      const apiResponse = response as Cypress.Response<RegisterApiResponse>;
      cy.log(`registerUserApi response status: ${apiResponse.status}`);
      const userExists = (
        (apiResponse.status === 200 || apiResponse.status === 201) ||
        (apiResponse.status === 400 && apiResponse.body?.detail?.includes('already exists'))
      );

      if (userExists) {
        cy.log(`User ${testUser.username} confirmed to exist (created or already present).`);
      } else {
        // Fail the test explicitly if user existence isn't confirmed
        const errorMessage = `Failed to ensure user ${testUser.username} exists. API status: ${apiResponse.status}, Body: ${JSON.stringify(apiResponse.body)}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
    });

    // 4. Log in via UI
    cy.log(`Logging in as ${testUser.username} via UI...`);
    authPage.visitLogin();
    cy.intercept('POST', '/api/auth/token').as('loginRequestNewResources');
    authPage.login(testUser.username, testUser.password);
    // **CRITICAL:** Wait for login API call to succeed
    cy.wait('@loginRequestNewResources').its('response.statusCode').should('eq', 200);
    cy.log('UI Login successful.');

    // 5. Navigate to Resources Page via UI (like profile.cy.ts)
    //    Adjust selectors based on your actual UI structure (e.g., sidebar, menu)
    cy.log('Navigating to Resources page via UI...');
    // Example using a sidebar link:
    cy.get('[data-testid="nav-resources"]', { timeout: 10000 }).should('be.visible').click();
    // Example using a user menu:
    // cy.get('[data-testid="user-menu"]').click();
    // cy.contains('a', 'Resources').click();

    cy.url().should('include', '/resources'); // Verify navigation landed on resources page
    cy.log('Successfully navigated to Resources page.');

    // 6. Intercept and Wait for Resources Page Data
    cy.intercept('GET', '/api/resources/statistics*').as('getResourceStatistics');
    cy.intercept('GET', '/api/resources/articles*').as('getInitialResourceList'); // Assuming articles is default view

    cy.wait('@getResourceStatistics', { timeout: 15000 }).its('response.statusCode').should('be.oneOf', [200, 204]);
    cy.wait('@getInitialResourceList', { timeout: 15000 }).its('response.statusCode').should('eq', 200);
    cy.log('Initial resources API calls successful.');

    // 7. Verify Page Content Loaded
    cy.get('[data-testid="resources-list"]', { timeout: 10000 }).should('be.visible');
    resourcesPage.isResourcesPageLoaded().should('be.true'); // Optional: If POM method provides extra checks
    cy.log('Resources page content is visible.');

    // 8. Handle uncaught exceptions
    cy.on('uncaught:exception', (err) => {
      cy.log(`[App Uncaught Exception] ${err.message}`);
      console.error('[App Uncaught Exception]', err);
      return false;
    });
  });

  // --- Test Cases Start Here ---

  it('should display an empty list initially after DB reset', () => {
    // After beforeEach, the DB is reset and page loaded.
    // Check if the list contains specific items or shows an empty state message.
    // Option 1: Check for absence of resource items
    cy.get(resourcesPage.selectors.resourceItem).should('not.exist');

    // Option 2: Check for a specific "empty state" element
    // cy.get('[data-testid="resources-empty-state"]').should('be.visible').and('contain', 'No resources found');
    cy.log('Verified that the resource list is initially empty.');
  });

  it('should allow creating a new resource via the UI modal', () => {
    const uniqueTitle = `Test UI Create ${Date.now()}`;
    const resourceData: Partial<ResourceCreatePayload> = {
      title: uniqueTitle,
      url: `https://example.com/test-ui-create-${Date.now()}`,
      description: 'Created via Cypress UI modal test.',
      type: 'articles', // Match backend expectation
      difficulty: 'beginner', // Match backend expectation
      estimatedTime: 10, // Match backend expectation
      topics: ['cypress', 'ui-test'] // Match backend expectation
    };

    // Intercept the creation API call - TARGET THE SPECIFIC TYPE ENDPOINT
    cy.intercept('POST', '/api/resources/articles').as('createResource');
    // Intercept the list refetch *after* creation (assuming it fetches articles)
    cy.intercept('GET', '/api/resources/articles*').as('getArticlesAfterCreate');

    // --- Action: Open Modal ---
    // Assuming a button/link with this testid opens the modal
    // Or use the visitResources with query param if that's the mechanism
    // resourcesPage.visitResources('?action=add'); // Alternative if link isn't reliable
    resourcesPage.clickAddResource(); // Assuming this method clicks the correct button/link
    cy.get('[data-testid="resource-form-modal"]').should('be.visible');
    cy.log('Resource form modal opened.');

    // --- Action: Fill Form ---
    // Use the POM method, ensuring it uses correct selectors and handles required fields
    resourcesPage.fillResourceForm({
      title: resourceData.title!, // Use Non-null assertion operator if sure it's defined
      url: resourceData.url!,
      description: resourceData.description!,
      type: resourceData.type!,
      difficulty: resourceData.difficulty!,
      estimatedTime: resourceData.estimatedTime!,
      topics: resourceData.topics!
    });
    cy.log('Resource form filled.');

    // --- Action: Submit Form ---
    resourcesPage.submitResourceForm(); // POM method to click the submit button
    cy.log('Resource form submitted.');

    // --- Verification: API Call ---
    cy.wait('@createResource', { timeout: 20000 }) // Increased timeout for API call
      .its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.log('POST /api/resources call successful.');

    // --- Verification: Modal Closed ---
    cy.get('[data-testid="resource-form-modal"]').should('not.exist');
    cy.log('Resource form modal closed.');

    // --- Verification: List Updated ---
    cy.wait('@getArticlesAfterCreate', { timeout: 15000 }); // Wait for the list to reload
    cy.log('GET /api/resources/articles call after creation successful.');
    // Find the specific resource item by its title and assert its visibility
    cy.contains('[data-testid="resource-item"]', uniqueTitle, { timeout: 10000 })
      .should('be.visible'); // Correct assertion: check visibility
    cy.log(`Resource "${uniqueTitle}" verified in the list.`);
  });

  it('should allow marking a resource as completed', () => {
    const uniqueTitle = `Test Complete ${Date.now()}`; // Use a unique title for this test
    const resourceData: Partial<ResourceCreatePayload> = {
      title: uniqueTitle,
      url: `https://example.com/test-complete-${Date.now()}`,
      description: 'Resource created via UI for completion test.',
      type: 'articles',
      difficulty: 'intermediate',
      estimatedTime: 5,
      topics: ['completion-test']
    };

    // --- Setup: Create Resource via UI --- START ---
    cy.intercept('POST', '/api/resources/articles').as('createResourceForComplete');
    cy.intercept('GET', '/api/resources/articles*').as('getArticlesAfterCreateForComplete');

    resourcesPage.clickAddResource();
    cy.get('[data-testid="resource-form-modal"]').should('be.visible');

    resourcesPage.fillResourceForm({
      title: resourceData.title!,
      url: resourceData.url!,
      description: resourceData.description!,
      type: resourceData.type!,
      difficulty: resourceData.difficulty!,
      estimatedTime: resourceData.estimatedTime!,
      topics: resourceData.topics!
    });

    resourcesPage.submitResourceForm();

    cy.wait('@createResourceForComplete', { timeout: 20000 })
      .its('response.statusCode').should('be.oneOf', [200, 201]);

    cy.get('[data-testid="resource-form-modal"]').should('not.exist');

    cy.wait('@getArticlesAfterCreateForComplete', { timeout: 15000 });
    cy.log(`UI Created Resource Title: ${uniqueTitle}`);
    // Verify it exists before proceeding
    cy.contains('[data-testid="resource-item"]', uniqueTitle, { timeout: 15000 })
      .should('be.visible');
    // --- Setup: Create Resource via UI --- END ---

    // --- Intercept API calls BEFORE interaction ---
    // Define intercepts BEFORE extracting ID or interacting
    cy.intercept('PATCH', '/api/resources/articles/*/complete').as('completeResource'); // Intercept with wildcard
    cy.intercept('GET', '/api/resources/articles*').as('getArticlesAfterComplete'); // Intercept list refresh

    // Get the specific resource item first to extract its ID
    cy.contains(resourcesPage.selectors.resourceItem, uniqueTitle, { timeout: 15000 })
      .should('be.visible')
      .invoke('attr', 'data-resource-id')
      .then((id) => {
        if (!id) {
          throw new Error('Could not find data-resource-id on the newly created item');
        }
        const createdResourceId = id;
        cy.log(`Extracted Resource ID: ${createdResourceId}`);

        // --- Action: Find and Mark as Complete ---
        // Use the ID to get the element again to ensure we have the right one
        cy.get(`[data-testid="resource-item"][data-resource-id="${createdResourceId}"]`)
            .as('resourceToComplete');
        cy.log(`Found resource item with ID "${createdResourceId}" to mark as complete.`);

        // Find the complete button *within* the specific item and click it
        cy.get('@resourceToComplete')
            .find(resourcesPage.selectors.completeResourceButton)
            .should('be.visible')
            .click();
        cy.log('Clicked complete button.');

        // --- Verification: API Call ---
        // Now wait for the wildcard intercept defined earlier
        cy.wait('@completeResource', { timeout: 15000 }).its('response.statusCode').should('eq', 200);
        cy.log('PATCH complete API call successful.');

        // --- Verification: List Updated ---
        cy.wait('@getArticlesAfterComplete');
        cy.log('GET articles after completion successful.');

        // --- Verification: UI Update ---
        cy.get('@resourceToComplete')
            .find(resourcesPage.selectors.completedBadge)
            .should('be.visible');
        cy.log(`Verified resource with ID "${createdResourceId}" is marked as completed in the UI.`);
      });
  });

  it('should allow deleting a resource', () => {
    const uniqueTitle = `Test Delete ${Date.now()}`; // Use a unique title for this test
    const resourceData: Partial<ResourceCreatePayload> = {
      title: uniqueTitle,
      url: `https://example.com/test-delete-${Date.now()}`,
      description: 'Resource created via UI for deletion test.',
      type: 'articles', // Keep it simple with articles for now
      difficulty: 'advanced',
      estimatedTime: 25,
      topics: ['deletion-test']
    };

    // --- Setup: Create Resource via UI --- START ---
    cy.intercept('POST', '/api/resources/articles').as('createResourceForDelete');
    cy.intercept('GET', '/api/resources/articles*').as('getArticlesAfterCreateForDelete');

    resourcesPage.clickAddResource();
    cy.get('[data-testid="resource-form-modal"]').should('be.visible');

    resourcesPage.fillResourceForm({
      title: resourceData.title!,
      url: resourceData.url!,
      description: resourceData.description!,
      type: resourceData.type!,
      difficulty: resourceData.difficulty!,
      estimatedTime: resourceData.estimatedTime!,
      topics: resourceData.topics!
    });

    resourcesPage.submitResourceForm();

    cy.wait('@createResourceForDelete', { timeout: 20000 })
      .its('response.statusCode').should('be.oneOf', [200, 201]);

    cy.get('[data-testid="resource-form-modal"]').should('not.exist');

    cy.wait('@getArticlesAfterCreateForDelete', { timeout: 15000 });
    cy.log(`UI Created Resource Title: ${uniqueTitle}`);
    // Verify it exists before proceeding
    cy.contains('[data-testid="resource-item"]', uniqueTitle, { timeout: 15000 })
      .should('be.visible');
     // --- Setup: Create Resource via UI --- END ---

    // --- Action: Find and Delete ---
    cy.contains(resourcesPage.selectors.resourceItem, uniqueTitle, { timeout: 15000 })
        .should('be.visible')
        .as('resourceToDelete');
    cy.log(`Found resource item "${uniqueTitle}" to delete.`);

    // Need the ID for the DELETE intercept
    let createdResourceId: string;
    cy.get('@resourceToDelete').invoke('attr', 'data-resource-id').then((id) => {
        if (!id) throw new Error('Could not find data-resource-id on the item');
        createdResourceId = id;
        cy.log(`Extracted Resource ID: ${createdResourceId}`);

        // Intercept the DELETE request
        cy.intercept('DELETE', `/api/resources/articles/${createdResourceId}`).as('deleteResource'); // Assuming articles type
        // Intercept list refetch *after* deletion
         cy.intercept('GET', `/api/resources/articles*`).as('getResourcesAfterDelete'); // Assuming articles type

        // Find the delete button *within* the specific item and click it
        cy.get('@resourceToDelete')
            .find(resourcesPage.selectors.deleteResourceButton)
            .should('be.visible')
            .click();
        cy.log('Clicked delete button.');

        // Handle confirmation dialog if one exists (using POM method)
        resourcesPage.confirmDelete(); // Assuming POM handles finding/clicking confirm

        // --- Verification: API Call ---
        cy.wait('@deleteResource', { timeout: 15000 }).its('response.statusCode').should('eq', 204);
        cy.log('DELETE API call successful.');

        // --- Verification: List Updated ---
        cy.wait('@getResourcesAfterDelete');
        cy.log(`GET articles after deletion successful.`);

        // --- Verification: UI Update ---
        cy.contains(resourcesPage.selectors.resourceTitle, uniqueTitle).should('not.exist');
        cy.log(`Verified "${uniqueTitle}" is no longer in the list.`);
    });
 });

  // Add more tests for search, filtering, metadata extraction, edit (when implemented)
  // e.g., it('should filter resources by type', () => { ... });
  // e.g., it('should search resources by title', () => { ... });

}); // End describe