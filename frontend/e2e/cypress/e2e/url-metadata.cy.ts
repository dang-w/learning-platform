/// <reference types="../support" />
import { LibraryPage, authPage } from '../support/page-objects';
import { ResourceCreateInput } from '@/types/resource';

// Instantiate LibraryPage POM
const libraryPage = new LibraryPage();

describe('URL Metadata Extraction from Library Add Resource', () => {
  const username = 'test-user-cypress';
  const password = 'TestPassword123!';

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

    // 3. Ensure User Exists (API) - Aligned with resources.cy.ts
    cy.log(`Ensuring user ${username} exists via API...`);
    cy.registerUserApi({
      username: username,
      email: `${username}@example.com`,
      password: password,
      firstName: 'Test',
      lastName: 'User Cypress'
    }).then((response: Cypress.Response<{ detail?: string }>) => {
      // More robust check copied from resources.cy.ts
      const apiResponse = response; // No need for type assertion now
      cy.log(`registerUserApi response status: ${apiResponse.status}`);
      const userExists = (
        (apiResponse.status === 200 || apiResponse.status === 201) ||
        (apiResponse.status === 400 && apiResponse.body?.detail?.includes('already exists'))
      );

      if (userExists) {
        cy.log(`User ${username} confirmed to exist (created or already present).`);
      } else {
        const errorMessage = `Failed to ensure user ${username} exists. API status: ${apiResponse.status}, Body: ${JSON.stringify(apiResponse.body)}`;
        console.error(errorMessage);
        throw new Error(errorMessage); // Fail fast if user setup fails
      }
    });

    // 4. Log in via UI - Aligned with resources.cy.ts
    cy.log(`Logging in as ${username} via UI...`);
    authPage.visitLogin();
    cy.intercept('POST', '/api/auth/token').as('loginRequestMetadata'); // Keep alias specific
    authPage.login(username, password);
    cy.wait('@loginRequestMetadata').its('response.statusCode').should('eq', 200);
    cy.log('UI Login successful.');

    // 5. Intercept Library API call *before* navigation
    cy.intercept('GET', '/api/resources/library*').as('getLibraryResources');
    cy.intercept('GET', '/api/resources/user*').as('getUserResources');

    // 6. Navigate to Library Page via UI
    cy.log('Navigating to Library page via UI...');
    libraryPage.navigateToLibraryViaUI(); // Uses POM method
    cy.wait('@getLibraryResources'); // Wait for initial central library load
    cy.log('Successfully navigated to Library page and initial data loaded.');

    // 7. Switch to "My Resources" tab
    cy.log('Switching to My Resources tab...');
    libraryPage.switchToMyResources();
    cy.wait('@getUserResources'); // Wait for user resources to load after switching tabs
    cy.log('Switched to My Resources tab and data loaded.');

    // 8. Click Add Resource button
    cy.log('Clicking Add Resource button...');
    libraryPage.clickAddResource(); // Uses POM method

    // 9. Wait for Add Resource Modal to be visible
    cy.log('Waiting for Add Resource modal...');
    libraryPage.isAddResourceModalVisible(); // Uses POM method checking the modal's data-testid
    cy.log('Add Resource modal is visible.');

    // 10. Handle uncaught exceptions (Keep)
    cy.on('uncaught:exception', (err) => {
      cy.log('[App Uncaught Exception]', err); // Log the error object directly
      return false;
    });
  });

  it('should extract metadata from a valid URL within the Add Resource modal', () => {
    // Verify URL input is present within the modal
    cy.get(libraryPage.selectors.addUrlInput, { timeout: 10000 }).should('be.visible');

    // Use a known URL that should yield metadata
    const testUrl = 'https://docs.cypress.io/guides/overview/why-cypress'; // A more specific URL

    // Intercept the metadata API call
    cy.intercept('POST', '/api/url-extractor/extract*').as('extractMetadata');

    // Enter the URL
    cy.get(libraryPage.selectors.addUrlInput).type(testUrl);

    // Find and click the "Fetch Metadata" or similar button within the modal
    // Using text matching as no specific data-testid exists in POM
    cy.get(libraryPage.selectors.addResourceModal)
      .contains('button', /fetch|extract/i) // Case-insensitive match for Fetch or Extract
      .should('be.visible')
      .click();

    // Wait for the API call to complete and log the response
    cy.wait('@extractMetadata', { timeout: 20000 }).then((interception) => { // Increased timeout
      expect(interception.response?.statusCode).to.be.oneOf([200, 201]); // Check for success
      cy.log('API Response Status:', interception.response?.statusCode);
      cy.log('API Response Body:', JSON.stringify(interception.response?.body));
      // Add assertion for expected title if possible
       cy.wrap(interception.response?.body?.title).should('not.be.empty');
    });

    cy.log(`Waiting for metadata extraction from ${testUrl} to populate form...`);
    // Check if the title input is populated
    cy.get(libraryPage.selectors.addTitleInput, { timeout: 15000 })
      .should('not.have.value', ''); // Check that it's not empty

    cy.log('Metadata successfully extracted and populated title field.');

    // Optional: Check other fields if the API provides them (e.g., description/summary)
    // cy.get(libraryPage.selectors.addSummaryInput).should('not.have.value', '');
  });

  it('should show an error message for invalid URLs', () => {
    // Check if URL input exists
    cy.get(libraryPage.selectors.addUrlInput).should('be.visible').then($input => {
      if (!$input.length) {
        cy.log('URL input not found - skipping test');
        return;
      }

      // Enter invalid URL
      cy.wrap($input).type('invalid-url');

      // Click extract button
      cy.get(libraryPage.selectors.addResourceModal)
        .contains('button', /fetch|extract/i)
        .should('be.visible')
        .click();

      // Wait a moment for potential validation/error display
      cy.wait(1000);

      // Check for an error message within the modal (using role=alert)
      cy.get(libraryPage.selectors.addResourceModal)
        .find('[role="alert"]') // Look for an alert role for error messages
        .should('be.visible')
        .invoke('text')
        .should('not.be.empty');
      cy.log('Error message displayed correctly for invalid URL');
    });
  });

  it('should show an error message when metadata extraction fails', () => {
    // Check if URL input exists
    cy.get(libraryPage.selectors.addUrlInput).should('be.visible').then($input => {
      if (!$input.length) {
        cy.log('URL input not found - skipping test');
        return;
      }

      const testUrl = 'https://thissitedoesnotexistandcannotbefound.com/nonexistent';

      // Intercept the API call to force a failure (e.g., 500 error)
      cy.intercept('POST', '/api/url-extractor/extract*', {
        statusCode: 500,
        body: { detail: 'Failed to fetch metadata from external URL' }
      }).as('failedExtractMetadata');

      // Enter URL and click extract
      cy.wrap($input).type(testUrl);
      cy.get(libraryPage.selectors.addResourceModal)
        .contains('button', /fetch|extract/i)
        .should('be.visible')
        .click();

      // Wait for the failed API call
      cy.wait('@failedExtractMetadata');

      // Check for an error message within the modal
      cy.get(libraryPage.selectors.addResourceModal)
        .find('[role="alert"]')
        .should('be.visible')
        .invoke('text')
        .should('eq', 'Request failed with status code 500'); // Check for the exact message
      cy.log('Error message displayed correctly for failed extraction');
    });
  });

  it('should allow manual entry after failed metadata extraction', () => {
    const uniqueTitle = `Manual Entry Test ${Date.now()}`;
    // Align this object with the backend's ResourceBase model
    const resourceData: Partial<ResourceCreateInput> = {
      title: uniqueTitle,
      url: `https://example.com/manual-entry-${Date.now()}`,
      type: 'article',
      topics: ['manual', 'test'],
      difficulty: 'beginner',
      estimated_time: 5,
      summary: 'Manual entry after failed extraction.'
    };

    // Check if URL input exists
    cy.get(libraryPage.selectors.addUrlInput).should('be.visible').then($input => {
      if (!$input.length) {
        cy.log('URL input not found - skipping test');
        return;
      }

      // Intercept the creation API call - Use the generic /api/resources endpoint
      cy.intercept('POST', '/api/resources/article').as('createResource');
      // Intercept the user resources list refetch *after* creation
      cy.intercept('GET', '/api/resources/user*').as('getUserResourcesAfterCreate');

      // Enter a URL that might fail extraction or just proceed manually
      cy.wrap($input).type('https://example.com/trigger-manual-entry');
      // Optionally click extract and wait for failure if needed, or just proceed

      // Fill the form manually using the LibraryPage POM method
      libraryPage.fillAddResourceForm(resourceData);
      cy.log('Filled resource form manually.');

      // --- Action: Submit Form using POM method ---
      libraryPage.submitAddResourceForm();
      cy.log('Resource form submitted.');

      // --- Verification: API Call ---
      cy.wait('@createResource').then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
        cy.log('Create resource API call successful');
        // Optionally assert on request body
        // expect(interception.request.body.title).to.equal(resourceData.title);
      });

      // --- Verification: UI Update (Wait for list refetch and check visibility) ---
      cy.wait('@getUserResourcesAfterCreate'); // Wait for the list to potentially refresh
      // Add a slight delay for UI updates
      cy.wait(500);
      libraryPage.isAddResourceModalClosed(); // Verify modal is closed
      // Check if the new resource is visible in the "My Resources" list
      libraryPage.resourceExists(resourceData.title!)
        .should('be.visible');
      cy.log(`Resource "${resourceData.title}" is visible in the list.`);
    });
  });
});