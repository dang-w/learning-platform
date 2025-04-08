import { authPage, libraryPage } from '../support/page-objects';
import { UserCredentials } from '../support/types';
import { ResourceCreateInput } from '@/types/resource'; // Import the necessary type

// Define a type for the register API response based on usage
interface RegisterApiResponse {
  detail?: string;
  // Add other expected properties if known (e.g., user details on success)
}

describe('Resource Library Page', () => {
  // Define user details consistently
  const testUser: UserCredentials = {
    username: 'test-user-cypress-library', // Unique username for this suite
    password: 'TestPassword123!',
    email: 'test-user-cypress-library@example.com',
    firstName: 'TestLib',
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
        email: testUser.email!,
        password: testUser.password!,
        firstName: testUser.firstName!,
        lastName: testUser.lastName!
    }).then((response: Cypress.Response<RegisterApiResponse>) => {
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
    cy.intercept('POST', '/api/auth/token').as('loginRequestLibrary');
    authPage.login(testUser.username, testUser.password!);
    // **CRITICAL:** Wait for login API call to succeed
    cy.wait('@loginRequestLibrary').its('response.statusCode').should('eq', 200);
    cy.log('UI Login successful.');

    // --- ADDED: Ensure target resource is incomplete before test --- \
    const targetResourceId = 'mathematics-for-machine-learning'; // Assumed ID
    cy.log(`Ensuring resource ${targetResourceId} is marked incomplete via API...`);
    cy.request({
        method: 'PATCH',
        url: `/api/resources/library/${targetResourceId}/status`,
        body: { completed: false },
        failOnStatusCode: false // Allow 404 if status doesn't exist yet
    }).then((response) => {
        if (response.status !== 200 && response.status !== 404) {
            const errorMsg = `API call to reset resource status failed unexpectedly: ${response.status} ${response.body?.detail || ''}`;
            console.error(errorMsg, response.body);
            cy.log(`WARN: ${errorMsg}`);
        } else {
            cy.log(`Resource ${targetResourceId} status reset/confirmed via API (Status: ${response.status}).`);
        }
    });
    // --- END ADDED SECTION ---

    // 5. Intercept Library Page Data *BEFORE* navigation
    cy.log('Intercepting library API calls...');
    cy.intercept('GET', '/api/resources/library*').as('getLibrary');
    cy.intercept('GET', '/api/resources/user*').as('getUserResources');
    cy.intercept('GET', '/api/resources/topics').as('getTopics');

    // 6. Navigate to Library Page via UI
    cy.log('Navigating to Library page via UI...');
    // Use the POM method - Ensure 'nav-library' data-testid exists on the nav link
    libraryPage.navigateToLibraryViaUI();
    cy.log('Successfully navigated to Library page.');

    // 7. Wait for Library Page Data
    cy.log('Waiting for initial library API calls...');
    // Wait for the essential initial load calls
    cy.wait('@getLibrary', { timeout: 15000 }).its('response.statusCode').should('eq', 200);
    cy.wait('@getTopics', { timeout: 15000 }).its('response.statusCode').should('eq', 200);
    // Wait for initial load skeletons to clear
    cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 15000 }).should('not.exist');
    cy.log('Initial library API calls successful and loading states cleared.');

    // 8. Verify Page Content Loaded (using POM)
    libraryPage.isLibraryPageLoaded().should('be.true');
    cy.log('Library page content is visible.');

    // 9. Handle uncaught exceptions
    cy.on('uncaught:exception', (err) => {
      console.error('[App Uncaught Exception]', err);
      return false;
    });
  });

  it('should load the Central Library view by default and display resources', () => {
    // POM checks for tab states - ALREADY CHECKED IN POM method called in beforeEach or isLibraryPageLoaded if default is central
    // cy.get(libraryPage.selectors.centralLibraryTab).should('have.attr', 'aria-selected', 'true');
    // cy.get(libraryPage.selectors.userResourcesTab).should('have.attr', 'aria-selected', 'false');

    // Check resources are displayed (can be 0 initially, but list exists)
    // Check for non-existence of loading state *before* checking resource card existence
    cy.get(libraryPage.selectors.loadingSkeleton).should('not.exist');
    cy.get(libraryPage.selectors.resourceCard).should('exist'); // Use exist to handle 0 case
    // Check if *at least one* card is visible if data is seeded/expected
    // cy.get(libraryPage.selectors.resourceCard).should('have.length.greaterThan', 0);

    // POM check for filter sidebar visibility
    cy.get(libraryPage.selectors.filterSidebar).should('be.visible');
    // POM checks for filter components using assumed testids
    cy.get(libraryPage.selectors.searchInput).should('be.visible');
    cy.get(libraryPage.selectors.topicsSection).should('be.visible'); // Check section visibility
    cy.get(libraryPage.selectors.resourceTypeSection).should('be.visible'); // Check section visibility
    cy.get(libraryPage.selectors.difficultySection).should('be.visible'); // Check section visibility
  });

  it('should switch to the My Resources view and display user-added resources (or empty state)', () => {
    // Use POM method to switch tabs
    libraryPage.switchToMyResources();
    cy.log('ACTION: Switched to My Resources tab.');

    // Skeletons should appear soon after click triggers loading state
    cy.log('ASSERT: Expecting skeletons to BE VISIBLE...');
    cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 7000 }).should('be.visible');
    cy.log('ASSERT: Skeletons are visible.');

    // Wait for API call completion
    cy.log('WAIT: Waiting for @getUserResources API call...');
    cy.wait('@getUserResources');
    cy.log('WAIT: @getUserResources API call completed.');

    // Wait for skeletons to disappear AFTER API call is done and state update propagates
    cy.log('ASSERT: Expecting skeletons to NOT EXIST...');
    cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 15000 }).should('not.exist');
    cy.log('ASSERT: Skeletons do not exist.');

    // Assertions using POM selectors (tab state) - ALREADY CHECKED IN POM switchToMyResources method
    // cy.get(libraryPage.selectors.userResourcesTab).should('have.attr', 'aria-selected', 'true');
    // cy.get(libraryPage.selectors.centralLibraryTab).should('have.attr', 'aria-selected', 'false');

    // Check for empty state message - rely on built-in timeout or add specific one
    cy.log('ASSERT: Expecting empty state message...');
    cy.get(libraryPage.selectors.emptyStateMessage, { timeout: 10000 }).should('be.visible');
    cy.log('ASSERT: Empty state message is visible.');
    cy.get(libraryPage.selectors.resourceCard).should('not.exist'); // No cards initially

    // --- Refactored Resource Addition using POM ---
    const userResourceData: Partial<ResourceCreateInput> = {
      title: 'My Test User Resource',
      url: 'https://example.com/test-user-resource',
      type: 'article', // Ensure this type is valid (matches backend ResourceTypeString)
      summary: 'A resource added by the test user.',
      topics: ['Cypress Testing'],
      difficulty: 'beginner',
      estimated_time: 10,
    };
    const userResourceTitle = userResourceData.title!;

    // 1. Open the Add Resource Modal
    cy.log('ACTION: Clicking Add Resource button...');
    libraryPage.clickAddResource();
    libraryPage.isAddResourceModalVisible(); // Wait for modal
    cy.log('ACTION: Add Resource modal is visible.');

    // 2. Intercept API calls
    cy.intercept('POST', `/api/resources/${userResourceData.type}`).as('createResource');
    cy.intercept('GET', '/api/resources/user*').as('getUserResourcesAfterCreate');

    // 3. Fill and Submit the Form
    cy.log(`ACTION: Filling form for resource: ${userResourceTitle}`);
    libraryPage.fillAddResourceForm(userResourceData);
    cy.log('ACTION: Submitting the Add Resource form...');
    libraryPage.submitAddResourceForm();

    // 4. Wait for API calls and UI updates
    cy.log('WAIT: Waiting for resource creation API call...');
    cy.wait('@createResource').its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.log('WAIT: Waiting for user resources list refresh API call...');
    cy.wait('@getUserResourcesAfterCreate');
    libraryPage.isAddResourceModalClosed(); // Check modal is closed
    cy.log('ASSERT: Add Resource modal is closed.');
    // Ensure list loading state (skeletons) is gone after refresh
    cy.log('ASSERT: Expecting skeletons to NOT EXIST after resource addition...');
    cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 15000 }).should('not.exist');
    cy.log('ASSERT: Skeletons do not exist after resource addition.');
    // --- End Refactored Section ---

    // Use POM method/selector to check resource existence
    cy.log(`ASSERT: Expecting resource card '${userResourceTitle}' to exist...`);
    libraryPage.resourceExists(userResourceTitle);
    cy.log(`ASSERT: Resource card '${userResourceTitle}' exists.`);
    cy.get(libraryPage.selectors.emptyStateMessage).should('not.exist'); // Empty state should now be gone
  });

  it('should filter resources in the Central Library view by topic', () => {
    libraryPage.switchToCentralLibrary();
    cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 10000 }).should('not.exist');

    const topicToFilter = 'advanced';
    const topicDataSelector = `[data-topic="${topicToFilter}"]`;
    const expectedResourceTitle = 'RL Course by David Silver'; // Resource KNOWN to have 'advanced' topic
    const unexpectedResourceTitle = 'Mathematics for Machine Learning'; // Resource known NOT to have 'advanced' topic

    // --- Filter ON ---
    cy.log(`ACTION: Toggling filter ON for topic: ${topicToFilter}`);
    // Find the checkbox using its data-testid
    const checkboxSelector = `[data-testid="topic-filter-${topicToFilter}"]`;
    cy.get(checkboxSelector).should('exist'); // Ensure the checkbox exists before clicking

    cy.intercept('GET', `/api/resources/library?topic=${encodeURIComponent(topicToFilter)}&page=1&limit=10`).as('getFilteredLibrary');
    libraryPage.toggleTopicFilter(topicToFilter, true); // Use the POM method with the topic name
    cy.wait('@getFilteredLibrary');
    cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 10000 }).should('not.exist');
    cy.log('ASSERT: Filter applied and loading complete.');

    // --- Verify Filtered Results ---
    // 1. Assert the expected resource IS visible
    cy.log(`ASSERT: Verifying resource '${expectedResourceTitle}' is visible...`);
    libraryPage.resourceExists(expectedResourceTitle);

    // 2. Assert the expected resource card has the correct data-topic attribute
    cy.log(`ASSERT: Verifying resource '${expectedResourceTitle}' has the '${topicToFilter}' topic tag...`);
    cy.contains(libraryPage.selectors.resourceCard, expectedResourceTitle) // Find the specific card
      .find(topicDataSelector) // Find the topic tag within that card
      .should('exist');

    // 3. Assert the unexpected resource is NOT visible
    cy.log(`ASSERT: Verifying resource '${unexpectedResourceTitle}' is NOT visible...`);
    libraryPage.resourceDoesNotExist(unexpectedResourceTitle);

    // --- Filter OFF ---
    cy.log(`ACTION: Toggling filter OFF for topic: ${topicToFilter}`);
    cy.intercept('GET', `/api/resources/library?page=1&limit=10`).as('getUnfilteredLibrary');
    libraryPage.toggleTopicFilter(topicToFilter, false); // Use POM method
    cy.wait('@getUnfilteredLibrary');
    cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 10000 }).should('not.exist');
    cy.log('ASSERT: Filter removed and loading complete.');

    // --- Verify List Repopulated ---
    cy.log('ASSERT: Verifying resource list repopulated after removing filter...');
    cy.get(libraryPage.selectors.resourceCard).should('have.length.greaterThan', 1); // Ensure more than just one is back
  });

  it('should filter resources by search term (debounced)', () => {
    // Ensure correct tab is selected
    libraryPage.switchToCentralLibrary();
    // Wait for initial load skeletons to clear if switching causes loading
    cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 10000 }).should('not.exist');

    const searchTerm = 'Deep Learning';
    const resourceTitleToFind = 'Deep Learning'; // Example title expected to match
    const resourceTitleToEnsurePresent = 'Machine Learning Yearning'; // Another resource title

    // Ensure both resources are initially present
    libraryPage.resourceExists(resourceTitleToFind);
    libraryPage.resourceExists(resourceTitleToEnsurePresent);

    // Use POM method for search
    libraryPage.searchResources(searchTerm);
    // *** FIX LINTER: Use hardcoded debounce value ***
    cy.wait(650); // Wait slightly longer than debounce delay (500ms)
    // Wait for API and skeletons to disappear
    cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 10000 }).should('not.exist');

    // Use POM methods for assertions - After search, only the matching one should exist
    cy.contains(libraryPage.selectors.resourceCard, resourceTitleToEnsurePresent).should('not.exist');
    libraryPage.resourceExists(resourceTitleToFind);

    // Clear the search
    libraryPage.searchResources(''); // Clear search using POM method (includes debounce wait)
    // Wait for skeletons to disappear
    cy.wait(650);
    cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 10000 }).should('not.exist');

    // Use POM methods for assertions
    libraryPage.resourceExists(resourceTitleToFind); // Should reappear
    libraryPage.resourceExists(resourceTitleToEnsurePresent); // Should also reappear
  });

  it('should handle pagination if more resources exist than the page limit', () => {
    libraryPage.switchToCentralLibrary();
    // Wait for initial load skeletons to clear if switching causes loading
    cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 10000 }).should('not.exist');

    cy.wait('@getLibrary').then(interception => { // Use the initial @getLibrary wait
      const totalPages = Number(interception.response?.headers['x-total-pages'] || '1');
      const limit = 10; // Assuming limit from backend/UI

      if (totalPages <= 1) {
        cy.log('Skipping pagination test: Not enough resources or only one page.');
        cy.get(libraryPage.selectors.paginationControls).should('not.exist');
        return;
      }

      cy.get(libraryPage.selectors.paginationControls).should('exist').within(() => {
          libraryPage.checkPaginationButtonState('previous', 'disabled');
          libraryPage.checkPaginationButtonState('next', 'enabled');
      });

      const page1Titles: string[] = [];
      // Use POM selectors
      cy.get(libraryPage.selectors.resourceCard).find(libraryPage.selectors.resourceTitle).each($el => {
          page1Titles.push($el.text());
      }).then(() => {
          expect(page1Titles.length).to.be.at.most(limit);
          cy.log(`Page 1 titles: ${page1Titles.join(', ')}`);

          // Intercept before clicking next
          cy.intercept('GET', '/api/resources/library*page=2*').as('getLibraryPage2');
          // Use POM method to go to next page
          libraryPage.goToNextPage();
          // Assert skeletons appear
          cy.get(libraryPage.selectors.loadingSkeleton).should('be.visible');
          // Wait for API and clear skeletons
          cy.wait('@getLibraryPage2');
          cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 10000 }).should('not.exist');

          cy.get(libraryPage.selectors.paginationControls).should('exist').within(() => {
              libraryPage.checkPaginationButtonState('previous', 'enabled');
              // Assuming more than 2 pages for this check - adjust if needed
              libraryPage.checkPaginationButtonState('next', totalPages > 2 ? 'enabled' : 'disabled');
          });

          // Use POM selectors
          cy.get(libraryPage.selectors.resourceCard).find(libraryPage.selectors.resourceTitle).first().then($el2 => {
              const firstTitlePage2 = $el2.text();
              cy.log(`First title on page 2: ${firstTitlePage2}`);
              expect(page1Titles).not.to.include(firstTitlePage2);
          });

          // Intercept before clicking previous
          cy.intercept('GET', '/api/resources/library*page=1*').as('getLibraryPage1Again');
          // Use POM method to go to previous page
          libraryPage.goToPreviousPage();
           // Assert skeletons appear
          cy.get(libraryPage.selectors.loadingSkeleton).should('be.visible');
           // Wait for API and clear skeletons
          cy.wait('@getLibraryPage1Again');
          cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 10000 }).should('not.exist');

          cy.get(libraryPage.selectors.paginationControls).should('exist').within(() => {
              libraryPage.checkPaginationButtonState('previous', 'disabled');
              libraryPage.checkPaginationButtonState('next', 'enabled');
          });

          // Use POM selectors
          cy.get(libraryPage.selectors.resourceCard).find(libraryPage.selectors.resourceTitle).first().then($el1Again => {
              const firstTitlePage1Again = $el1Again.text();
              cy.log(`First title on page 1 again: ${firstTitlePage1Again}`);
              expect(firstTitlePage1Again).to.equal(page1Titles[0]);
          });
      });
    });
  });

  it('should allow marking a central library resource as complete', () => {
    libraryPage.switchToCentralLibrary();
    // Wait for initial load skeletons to clear if switching causes loading
    cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 10000 }).should('not.exist');

    // Get first card using POM selector
    cy.get(libraryPage.selectors.resourceCard).first().then($card => {
        // Extract title for clarity in logs and potentially later use
        const resourceTitle = $card.find(libraryPage.selectors.resourceTitle).text();
        cy.log(`Testing completion for: ${resourceTitle}`);

        // Use POM method to check initial state
        libraryPage.isResourceIncomplete(resourceTitle);

        // Use POM method to mark complete
        libraryPage.markResourceComplete(resourceTitle);
        // No skeleton for this action, wait directly for API
        cy.wait(200); // Small wait for UI update propagation

        // Use POM method to check completed state
        libraryPage.isResourceCompleted(resourceTitle);

        // Use POM method to mark incomplete
        libraryPage.markResourceComplete(resourceTitle);
         // No skeleton for this action, wait directly for API
        cy.wait(200); // Small wait for UI update propagation

        // Use POM method to check incomplete state again
        libraryPage.isResourceIncomplete(resourceTitle);
    });
  });

  it('should allow adding and editing notes for a central library resource', () => {
    libraryPage.switchToCentralLibrary();
    // Wait for initial load skeletons to clear if switching causes loading
    cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 10000 }).should('not.exist');

    let resourceTitle: string;
    // Use POM selector for card and title
    cy.get(libraryPage.selectors.resourceCard).first().find(libraryPage.selectors.resourceTitle).then($title => {
      resourceTitle = $title.text();
      cy.log(`Testing notes for: ${resourceTitle}`);

      // Use POM method to open dialog
      libraryPage.openNotesDialog(resourceTitle);

      // Use POM methods/selectors for dialog interaction
      libraryPage.checkNoteDialogTitle(`Edit Note for: ${resourceTitle}`); // Updated expected title
      cy.get(libraryPage.selectors.noteTextArea).should('be.visible');

      const noteText = 'This is my test note.';
      // Use POM method to fill form
      libraryPage.fillNotesForm({ notes: noteText });
      // Use POM method to save
      libraryPage.saveNote();
      // Wait for API after save action
      cy.wait(200); // Small static wait, might need adjustment or removal

      // Re-open using POM method
      libraryPage.openNotesDialog(resourceTitle);
      // Use POM method to check text
      libraryPage.getNotesText().should('eq', noteText);

      const editedNoteText = ' This is the edited note.';
      // Type directly into POM selector for appending
      cy.get(libraryPage.selectors.noteTextArea).type(editedNoteText);
      // Use POM method to save
      libraryPage.saveNote();
      // Wait for API after save action
      cy.wait(200); // Small static wait

      // Re-open using POM method
      libraryPage.openNotesDialog(resourceTitle);
      // Use POM method to check combined text
      libraryPage.getNotesText().should('eq', noteText + editedNoteText);

      // Use POM method to cancel
      libraryPage.cancelNote();
    });
  });

  // Add more tests for:
  // - Filtering by Resource Type and Difficulty
  // - Combined filtering
  // - Filtering in "My Resources" view
  // - Searching in "My Resources" view
  // - Pagination in "My Resources" view
  // - Marking User resources complete/incomplete from library page
  // - Deleting User resources from library page (if feature exists)
  // - Error handling (API fails to load resources, filters, etc.)
  // - Loading states during fetches/filtering
});