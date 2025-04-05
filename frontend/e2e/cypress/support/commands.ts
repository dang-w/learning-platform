/// <reference types="cypress" />

import '@testing-library/cypress/add-commands';
// Revert to using the path alias, assuming tsconfig paths should handle this
// Resource import is no longer needed here as ResourceCreateInput is imported inline
// import { Resource } from '@/types/resource';
// Import the libraryPage instance
import { libraryPage } from './page-objects/LibraryPage';

// Assuming NotesStateWithMessages is exported or reconstruct interface here
// If not exported, define a minimal interface for the state needed
// interface TestNotesState {
//   successMessage: string | null;
//   errorMessage: string | null;
//   // Add other relevant state properties if needed for tests
// }

// Prevent ESM module loading issues
export {};

// Add Testing Library commands
// import '@testing-library/cypress/add-commands'; // Already imported above

// Define the return type of createDirectTestUser task
interface DirectUserCreationResult {
  success: boolean;
  method: string;
  endpoint?: string;
  alreadyExists?: boolean;
  error?: string;
}

// ================================================
// Implementations of custom commands below
// ================================================

Cypress.Commands.add('loginWithToken', (username: string, password?: string) => {
    cy.log(`Attempting API login for user: ${username}`);

    const loginPayload = {
        username: username,
        // Use provided password or default
        password: password || 'TestPassword123!',
    };

    // Perform the actual API login request to get a real token
    cy.request({
        method: 'POST',
        // Assuming /api/auth/token is the primary login endpoint
        url: '/api/auth/token',
        body: loginPayload,
        // Send as application/x-www-form-urlencoded as expected by FastAPI default OAuth2PasswordRequestForm
        form: true,
        // failOnStatusCode: false // Allow handling non-2xx responses if needed
    }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('access_token');
        cy.log('API login successful, received token.');

        // Store the token in localStorage where the app expects it
        // Use cy.window() to access localStorage safely
        cy.window().then((win) => {
            win.localStorage.setItem('token', response.body.access_token);
            // Store refresh token if it exists
            if (response.body.refresh_token) {
                win.localStorage.setItem('refreshToken', response.body.refresh_token);
            }
            cy.log('Token stored in localStorage.');
        });
    });
});

Cypress.Commands.add('createTestUserReliably', (userData: { username: string, email: string, password: string, firstName: string, lastName: string }) => {
  // First try the backend task for direct creation
  cy.task('createDirectTestUser', userData).then((result) => {
    const typedResult = result as DirectUserCreationResult;

    if (typedResult.success) {
      cy.log(`User ${userData.username} created or already exists via ${typedResult.method}`);
    } else {
      // If direct creation failed, try API endpoints
      cy.log(`Direct user creation failed: ${typedResult.error}. Trying API endpoints.`);

      // Map firstName and lastName to first_name and last_name as expected by the backend API
      const apiUserData = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        first_name: userData.firstName,
        last_name: userData.lastName
      };

      // Define the API endpoints with fallbacks
      const userEndpoints = [
        'http://localhost:8000/users/',
        'http://localhost:8000/api/users/',
        'http://localhost:8000/auth/register'
      ];

      // Try each endpoint in sequence until one works
      const tryCreateUser = (endpointIndex: number = 0) => {
        if (endpointIndex >= userEndpoints.length) {
          // All endpoints failed, log the issue but don't fail the test
          cy.log(`All user creation endpoints failed. Assuming user ${userData.username} exists.`);
          return;
        }

        cy.request({
          method: 'POST',
          url: userEndpoints[endpointIndex],
          body: apiUserData,
          failOnStatusCode: false,
          timeout: 10000 // Increase timeout to 10s
        }).then((response) => {
          const detailExists = response.body.detail && typeof response.body.detail === 'string';
          const usernameExists = response.body.username && typeof response.body.username === 'string';
          const emailExists = response.body.email && typeof response.body.email === 'string';

          if (response.status === 201 || response.status === 200) {
            cy.log(`User ${userData.username} created successfully`);
          } else if (response.status === 400 && (
            (detailExists && response.body.detail.indexOf('already exists') >= 0) ||
            (usernameExists && response.body.username.indexOf('already exists') >= 0) ||
            (emailExists && response.body.email.indexOf('already exists') >= 0)
          )) {
            cy.log(`User ${userData.username} already exists`);
          } else if (response.status < 500) {
            // 4xx errors suggest the endpoint exists but the request is invalid
            cy.log(`Failed to create user ${userData.username}: ${JSON.stringify(response.body)}`);
          } else {
            // 5xx or network errors suggest the endpoint might not be available
            cy.log(`Endpoint ${userEndpoints[endpointIndex]} failed, trying next endpoint`);
            tryCreateUser(endpointIndex + 1);
          }
        });
      };

      // Start the user creation process with the first endpoint
      tryCreateUser();
    }
  });
});

Cypress.Commands.add('login', (username, password) => {
    const sessionId = `${username}-session`;
    const userPassword = password || 'TestPassword123!'; // Ensure password is set

    cy.session(
        sessionId,
        () => {
            cy.log(`Session setup for ${username}`);
            // 1. Ensure user exists (consider making this more reliable if needed)
            cy.createTestUserReliably({
                username: username,
                email: `${username}@example.com`,
                password: userPassword,
                firstName: 'Test', // Simplified names for reliability
                lastName: 'User'
            });

            // 2. Perform API login to get and store token
            cy.loginWithToken(username, userPassword);

            // 3. Verify token was stored (optional but good practice)
            cy.window().its('localStorage.token').should('exist');
        },
        {
            validate() {
                // Validate by checking if the token exists in localStorage
                cy.window().its('localStorage.token').should('exist');
            },
            cacheAcrossSpecs: true, // Keep caching enabled
        }
    );
    // After cy.session, ensure we are ready for the test
    cy.log(`Session restored/created for ${username}`);
});

Cypress.Commands.add('visitProtectedRoute', (route: string) => {
  cy.visit(route, {
    failOnStatusCode: false,
    timeout: 15000 // Increase timeout for potentially slow routes
  });

  // Check if we've landed on the intended route
  cy.url().should('include', route, { timeout: 15000 });

  // Handle possible redirects to login pages
  cy.url().then((currentUrl) => {
    if (currentUrl.includes('/auth/login') || currentUrl.includes('/login')) {
      cy.log('Redirected to authentication page, attempting login');
      // Attempt login if needed
      cy.login('test-user-cypress', 'TestPassword123!');

      // After login, visit the originally requested URL
      cy.visit(route);
      cy.log(`Visited ${route} after login`);
      cy.url().should('include', route); // Basic check
    }
  });
});

Cypress.Commands.add('logout', () => {
  cy.log('Attempting to logout via UI');
  // Check if user menu elements exist before trying to interact
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="user-menu"]').length) {
      cy.get('[data-testid="user-menu"]').click();

      // Only attempt to click logout if it exists after opening menu
      cy.get('body').then(($bodyAfterMenu) => {
        if ($bodyAfterMenu.find('[data-testid="logout-button"]').length) {
          cy.get('[data-testid="logout-button"]').click();
          cy.log('Clicked logout button');
        } else {
          // Fallback for potential variations in logout button implementation
          if ($bodyAfterMenu.find('button:contains("Logout")').length) {
             cy.contains('button', 'Logout').click();
             cy.log('Clicked logout button (fallback selector)');
          } else if ($bodyAfterMenu.find('a:contains("Logout")').length) {
             cy.contains('a', 'Logout').click();
             cy.log('Clicked logout link (fallback selector)');
          } else {
             cy.log('Logout button/link not found in opened menu.');
          }
        }
      });
    } else {
      // User menu not found
      cy.log('User menu not found, cannot perform UI logout.');
    }
  });

  // Verification: Attempt to visit a protected route and expect redirection to login
  cy.log('Verifying logout by attempting to access protected route');
  cy.visit('/dashboard', { failOnStatusCode: false });
  cy.wait(500); // Wait briefly for potential redirection
  cy.url().should('include', '/auth/login'); // Assumes login route contains /auth/login
  cy.log('Successfully redirected to login page after logout attempt');
});

Cypress.Commands.add('safeRequest', (options) => {
  // Set defaults for the request
  const defaultOptions = {
    failOnStatusCode: false,
    timeout: 10000,
    retryOnStatusCodeFailure: true
  };

  const requestOptions = { ...defaultOptions, ...options };

  return cy.request(requestOptions).then((response) => {
    // Log all responses for debugging
    cy.log(`API Response (${requestOptions.method} ${requestOptions.url}): Status ${response.status}`);

    // Return the response for chaining
    return cy.wrap(response);
  });
});

Cypress.Commands.add('debugAuthStatus', () => {
  cy.log('Checking authentication status...');

  // Check relevant cookies
  cy.getCookie('sessionid').then(cookie => cy.log(`Cookie 'sessionid' exists: ${!!cookie}`)); // Example cookie
  cy.getCookie('refresh_token').then(cookie => cy.log(`Cookie 'refresh_token' exists: ${!!cookie}`)); // Adjust name if needed
  cy.getCookie('csrftoken').then(cookie => cy.log(`Cookie 'csrftoken' exists: ${!!cookie}`)); // Example cookie

  // Check if user menu is visible as a primary indicator of logged-in UI state
  cy.get('body').then($body => {
    const userMenuVisible = $body.find('[data-testid="user-menu"]').length > 0;
    cy.log(`UI Indicator - User menu visible: ${userMenuVisible}`);
  });

  // Test API connection
  cy.request({
    method: 'GET',
    url: '/api/health', // Assuming this is an unauthenticated endpoint
    failOnStatusCode: false
  }).then(response => {
    cy.log(`API health check status: ${response.status}`);
    cy.log(`API health response: ${JSON.stringify(response.body)}`);
  });

  // Check if we can access a protected endpoint
  cy.request({
    method: 'GET',
    url: '/api/users/me',
    failOnStatusCode: false,
  }).then(response => {
    cy.log(`Protected User endpoint (/api/users/me) status: ${response.status}`);
    if (response.status === 200) {
      cy.log(`User data received: ${JSON.stringify(response.body)}`);
    } else {
      cy.log('Could not retrieve user data from protected endpoint.');
    }
  });
});

Cypress.Commands.add('bypassMainLayoutAuth', (username = 'bypassed-user') => {
  cy.log(`Bypassing auth checks by intercepting /api/users/me for user: ${username}`);

  // Intercept the initial user fetch/auth check endpoint
  cy.intercept('GET', '/api/users/me', {
    statusCode: 200,
    body: {
      id: `bypass-id-${username}`,
      username: username,
      email: `${username}@example.com`,
      full_name: username.split(/[-_ ]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    },
    times: 1
  }).as('bypassUserMe');

  // It might also be prudent to intercept the refresh endpoint
  cy.intercept('POST', '/api/auth/refresh', {
      statusCode: 200,
      body: { access_token: `mock-bypass-token-${Date.now()}` },
      times: 1 // Only intercept once
  }).as('bypassRefresh');
});

Cypress.Commands.add('visitTestPage', (page: string) => {
  cy.visit(`/api/e2e-test-page?page=${page}`);
});

Cypress.Commands.add('getByTestId', (selector: string) => {
  return cy.get(`[data-testid="${selector}"]`);
});

Cypress.Commands.add('createAndLoginUser', (
  username: string = `test_${Date.now()}`,
  email: string = `test_${Date.now()}@example.com`,
  firstName: string = 'Test',
  lastName: string = 'User'
) => {
  cy.task('createDirectTestUser', { username, email, firstName, lastName }).then((user) => {
    cy.log(`Created test user: ${(user as { username: string }).username}`);
    cy.loginWithToken(username);
  });
});

Cypress.Commands.add('registerUserApi', (userData: { username: string, email: string, password: string, firstName: string, lastName: string }) => {
  const apiData = {
    username: userData.username,
    email: userData.email,
    password: userData.password,
    confirm_password: userData.password, // Assuming password confirmation is the same
    first_name: userData.firstName,
    last_name: userData.lastName,
  };

  cy.log(`Attempting to register user via API: ${userData.username}`);

  return cy.request({
    method: 'POST',
    url: 'http://localhost:8000/api/auth/register',
    body: apiData,
    headers: {
      'X-Skip-Rate-Limit': 'true' // Add header to bypass rate limit during tests
    },
    failOnStatusCode: false, // Allow handling non-2xx responses
  }).then((response) => {
    if (response.status === 200 || response.status === 201) {
      // Optional: Log success
    } else if (response.status === 400 && response.body?.detail?.includes('already exists')) {
      // Optional: Log existing user
    } else if (response.status >= 500) {
      console.error(`API Registration failed with status ${response.status}`, response.body);
    } else {
      console.warn(`API Registration responded with status ${response.status}`, response.body);
    }
    return cy.wrap(response);
  });
});

Cypress.Commands.add('getNotesStoreState', () => {
  return cy.window().then((win) => {
    const autWindow = win as globalThis.Cypress.AUTWindow;
    const store = autWindow.__NOTES_STORE__;
    if (store && typeof store.getState === 'function') {
      return store.getState();
    }
    throw new Error('Notes store (__NOTES_STORE__) not found on window object or doesn\'t have getState');
  });
});

Cypress.Commands.add('addResource', (resourceData: Partial<import('@/types/resource').ResourceCreateInput>) => {
  cy.log(`Adding resource via UI: ${resourceData.title}`);

  // Ensure we are on the library page and My Resources tab
  libraryPage.visitLibrary();
  libraryPage.switchToMyResources();
  cy.get(libraryPage.selectors.loadingSkeleton, { timeout: 10000 }).should('not.exist');

  // Open the Add Resource modal
  libraryPage.clickAddResource();
  libraryPage.isAddResourceModalVisible();

  // Fill and submit the form
  libraryPage.fillAddResourceForm(resourceData);
  libraryPage.submitAddResourceForm();

  // Verify modal closes
  libraryPage.isAddResourceModalClosed();
  cy.wait(500);
  cy.log(`Resource '${resourceData.title}' added via UI flow.`);
});

Cypress.Commands.add('loginAsTestUser', () => {
  // Retrieve default credentials from Cypress environment or use defaults
  const username = Cypress.env('TEST_USERNAME') || 'test-user-cypress';
  const password = Cypress.env('TEST_PASSWORD') || 'TestPassword123!';
  cy.login(username, password);
});

Cypress.Commands.add('useAuthBypass', (username = 'testuser') => {
  cy.setCookie('auth_bypass_token', `bypass-token-for-${username}`);
});

Cypress.Commands.add('createTestUser', (userData) => {
  cy.createTestUserReliably(userData);
});

Cypress.Commands.add('logout', () => {
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.log('Logged out by clearing cookies and local storage.');
});

Cypress.Commands.add('safeRequest', (options) => {
  return cy.request({ ...options, failOnStatusCode: false });
});

Cypress.Commands.add('debugAuthStatus', () => {
  cy.getCookie('token').then((cookie) => {
    cy.log('Token cookie:', cookie ? cookie.value : 'Not set');
  });
  cy.window().then((win) => {
    cy.log('localStorage token:', win.localStorage.getItem('token') || 'Not set');
  });
});

Cypress.Commands.add('bypassMainLayoutAuth', (username = 'testuser') => {
  // Implementation might involve setting a specific cookie or localStorage item
  // that the layout component checks to skip its own auth logic.
  // Example: Set a bypass flag in localStorage
  cy.window().then(win => {
    win.localStorage.setItem('__CYPRESS_BYPASS_AUTH__', 'true');
  });
  cy.log(`Auth bypass enabled for ${username}`);
});

Cypress.Commands.add('visitTestPage', (page) => {
  cy.visit(`/test/${page}`);
});

Cypress.Commands.add('getByTestId', (selector) => {
  return cy.get(`[data-testid=${selector}]`);
});

Cypress.Commands.add('createAndLoginUser', (username = `test-${Date.now()}`, email = `${username}@example.com`, firstName = 'Test', lastName = 'User') => {
  const password = 'TestPassword123!';
  cy.createTestUserReliably({ username, email, password, firstName, lastName });
  cy.login(username, password);
});

Cypress.Commands.add('addResource', (resourceData) => {
  // 1. Navigate to library & switch to user resources tab
  libraryPage.navigateToLibraryViaUI();
  libraryPage.switchToMyResources();

  // 2. Click Add Resource
  libraryPage.clickAddResource();
  libraryPage.isAddResourceModalVisible();

  // 3. Fill form (using POM method)
  libraryPage.fillAddResourceForm(resourceData);

  // 4. Intercept API call
  cy.intercept('POST', '/api/resources').as('createResourceApi');

  // 5. Submit form
  libraryPage.submitAddResourceForm();

  // 6. Wait for API & verify
  cy.wait('@createResourceApi').its('response.statusCode').should('match', /^20[01]$/);
  libraryPage.isAddResourceModalClosed();

  // 7. Verify resource exists in list (POM method)
  if (resourceData.title) {
    libraryPage.resourceExists(resourceData.title);
  }
});