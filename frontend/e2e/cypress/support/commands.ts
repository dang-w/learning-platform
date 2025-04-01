/// <reference types="cypress" />

import '@testing-library/cypress/add-commands';
import { Note, NoteCreateInput, NoteUpdateInput, NotesState } from '@/types/notes';
import { User } from '@/types/auth';

// Assuming NotesStateWithMessages is exported or reconstruct interface here
// If not exported, define a minimal interface for the state needed
interface TestNotesState {
  successMessage: string | null;
  errorMessage: string | null;
  // Add other relevant state properties if needed for tests
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {

  namespace Cypress {
    interface Chainable<Subject> {
      /**
       * Custom command to select DOM element by data-cy attribute.
       * @example cy.dataCy('submit')
       */
      // dataCy(value: string): Chainable<JQuery<HTMLElement>>

      /**
       * Logs in a user via API request
       * @example cy.login('testuser', 'password')
       */
      login(username: string, password: string): Chainable<void>;

      /**
       * Logs in a user via API request using default test credentials
       * @example cy.loginAsTestUser()
       */
      loginAsTestUser(): Chainable<void>;

      /**
       * Bypass authentication by setting a token directly
       * @example cy.useAuthBypass('testuser')
       */
      useAuthBypass(username?: string): Chainable<void>;

      /**
       * Visit a protected route, handling auth redirection
       * @param path The path to visit
       * @example cy.visitProtectedRoute('/dashboard')
       */
      visitProtectedRoute(path: string): Chainable<void>;

      /**
       * Register user via API call
       * @param userData User details for registration
       * @example cy.registerUserApi({ username, email, password, fullName })
       */
      registerUserApi(userData: { username: string; email: string; password: string; fullName: string }): Chainable<Cypress.Response<unknown>>;

      /**
       * Custom command to get the Zustand notes store state
       * Assumes store is exposed on window.__NOTES_STORE__ for testing
       * @example cy.getNotesStoreState()
       */
      getNotesStoreState(): Chainable<TestNotesState>; // Use the defined interface
    }
    interface AUTWindow {
      // Add store to window type for testing access
      __NOTES_STORE__?: {
        getState: () => TestNotesState; // Use the defined interface
      };
    }
  }
}

// Prevent ESM module loading issues
export {};

// Add Testing Library commands
import '@testing-library/cypress/add-commands';

// Add TypeScript definitions for custom commands
// This approach uses module augmentation instead of namespace
declare global {

  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to log in via UI or API
       * @example cy.login('username', 'password')
       */
      login(username: string, password: string): Chainable<void>;

      /**
       * Custom command to create a test user
       * @example cy.createTestUser({ username: 'test', email: 'test@example.com', password: 'password', fullName: 'Test User' })
       */
      createTestUser(userData: { username: string; email: string; password: string; fullName: string }): Chainable<void>;

      /**
       * Custom command to create a test user with direct MongoDB fallback
       * @example cy.createTestUserReliably({ username: 'test', email: 'test@example.com', password: 'password', fullName: 'Test User' })
       */
      createTestUserReliably(userData: { username: string; email: string; password: string; fullName: string }): Chainable<void>;

      /**
       * Custom command to login with token generation
       * @example cy.loginWithToken('username')
       */
      loginWithToken(username: string): Chainable<void>;

      /**
       * Custom command to check if user is logged in
       * @example cy.isLoggedIn().then(isLoggedIn => { ... })
       */
      isLoggedIn(): Chainable<boolean>;

      /**
       * Custom command to log out
       * @example cy.logout()
       */
      logout(): Chainable<void>;

      /**
       * Custom command to make API requests with error handling
       * @example cy.safeRequest({ method: 'GET', url: '/api/user' })
       */
      safeRequest(options: Partial<Cypress.RequestOptions>): Chainable<Cypress.Response<unknown>>;

      /**
       * Custom command to check auth status and log debug info
       * @example cy.debugAuthStatus()
       */
      debugAuthStatus(): Chainable<void>;

      /**
       * Custom command to bypass the main layout authentication checks
       * @example cy.bypassMainLayoutAuth()
       */
      bypassMainLayoutAuth(username?: string): Chainable<void>;

      /**
       * Custom command to visit a test page
       * @example cy.visitTestPage('dashboard')
       */
      visitTestPage(page: string): Chainable<void>;

      /**
       * Custom command to select DOM elements by data-testid attribute
       * @example cy.getByTestId('user-menu')
       */
      getByTestId(selector: string): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to create and authenticate a test user
       * @example cy.createAndLoginUser('testuser', 'user')
       */
      createAndLoginUser(username?: string, email?: string, fullName?: string): Chainable<void>;

      /**
       * Custom command to register a user via API call.
       * @example cy.registerUserApi({ username: 'apiuser', email: 'api@test.com', password: 'password', fullName: 'API User' })
       */
      registerUserApi(userData: { username: string; email: string; password: string; fullName: string }): Chainable<Cypress.Response<unknown>>;

      /**
       * Custom command to get the Zustand store state
       * @example cy.getNotesStoreState()
       */
      getNotesStoreState(): Chainable<any>;
    }
  }
}

// Define the return type of createDirectTestUser task
interface DirectUserCreationResult {
  success: boolean;
  method: string;
  endpoint?: string;
  alreadyExists?: boolean;
  error?: string;
}

// Updated loginWithToken using API interception for a stable logged-in state
Cypress.Commands.add('loginWithToken', (username: string) => {
  cy.log(`Setting up intercepted session for user: ${username}`);

  // 1. Set a non-HttpOnly dummy token cookie BEFORE visiting the page.
  //    This tricks initializeFromStorage (which uses document.cookie) into proceeding.
  cy.setCookie('token', `mock-valid-token-for-${username}`, {
    // httpOnly: true, // REMOVED: Must be readable by document.cookie
    secure: true,      // Keep other sensible defaults
    sameSite: 'strict'
  });
  cy.log('Set dummy non-HttpOnly token cookie.');

  // 2. Intercept the initial user fetch/auth check endpoint
  cy.intercept('GET', '/api/users/me', {
    statusCode: 200,
    body: {
      id: `test-user-id-${username}`, // Mock user ID
      username: username,
      email: `${username}@example.com`,
      full_name: username.split(/[-_ ]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), // Generate a mock full name
      // Add other necessary user fields based on the User model if needed
      // e.g., roles: ['user'], created_at: new Date().toISOString()
    },
  }).as('mockUserMe');

  // 3. Intercept token refresh endpoint to prevent potential calls during setup
  cy.intercept('POST', '/api/auth/refresh', {
    statusCode: 200,
    body: {
      access_token: `mock-access-token-${Date.now()}` // Provide a mock token
    }
  }).as('mockTokenRefresh');

  // 4. Visit a page that likely triggers the auth check
  cy.visit('/');

  // 5. Wait for the intercepted user fetch call to ensure state is set
  //    We re-add the wait now that the call should actually happen.
  cy.wait('@mockUserMe');

  cy.log(`Intercepted session setup complete for ${username}`);
});

// Enhanced test user creation with direct creation
Cypress.Commands.add('createTestUserReliably', (userData: { username: string, email: string, password: string, fullName: string }) => {
  // First try the backend task for direct creation
  cy.task('createDirectTestUser', userData).then((result) => {
    const typedResult = result as DirectUserCreationResult;

    if (typedResult.success) {
      cy.log(`User ${userData.username} created or already exists via ${typedResult.method}`);
    } else {
      // If direct creation failed, try API endpoints
      cy.log(`Direct user creation failed: ${typedResult.error}. Trying API endpoints.`);

      // Map fullName to full_name as expected by the backend API
      const apiUserData = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        full_name: userData.fullName
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

// Original createTestUser command implementation
Cypress.Commands.add('createTestUser', (userData: { username: string, email: string, password: string, fullName: string }) => {
  // Map fullName to full_name as expected by the backend API
  const apiUserData = {
    username: userData.username,
    email: userData.email,
    password: userData.password,
    full_name: userData.fullName
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
});

// Custom login command with token generation fallback
// Cypress.Commands.add('login', (username: string, password: string) => {
//   // Check if we have a saved session - improves test speed
//   const sessionId = `${username}-session`;
//
//   cy.session(
//     sessionId,
//     () => {
//       // Try to create the test user first if it doesn't exist
//       if (username === 'test-user-cypress' || username.startsWith('cypress-test')) {
//         cy.createTestUserReliably({
//           username: username,
//           email: `${username}@example.com`,
//           password: password || 'TestPassword123!',
//           fullName: username.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
//         });
//       }
//
//       // Set bypass for layout redirection
//       cy.bypassMainLayoutAuth();
//
//       // Try various login endpoints
//       const loginEndpoints = [
//         '/api/token',
//         '/api/auth/login',
//         'http://localhost:8000/auth/token',
//       ];
//
//       const tryLogin = (endpointIndex: number = 0) => {
//         if (endpointIndex >= loginEndpoints.length) {
//           cy.log('All login endpoints failed, trying token generation...');
//           cy.loginWithToken(username);
//           return;
//         }
//
//         const formData = new FormData();
//         formData.append('username', username);
//         formData.append('password', password || 'TestPassword123!');
//
//         cy.request({
//           method: 'POST',
//           url: loginEndpoints[endpointIndex],
//           body: formData,
//           failOnStatusCode: false
//         }).then((response) => {
//           if (response.status === 200 || response.status === 201) {
//             if (response.body && response.body.access_token) {
//               // Store token in localStorage
//               window.localStorage.setItem('token', response.body.access_token);
//               window.localStorage.setItem('refreshToken', response.body.refresh_token || '');
//               cy.log(`Login successful via ${loginEndpoints[endpointIndex]}`);
//             } else {
//               cy.log(`Login endpoint ${loginEndpoints[endpointIndex]} returned no token, trying next...`);
//               tryLogin(endpointIndex + 1);
//             }
//           } else {
//             cy.log(`Login failed for ${loginEndpoints[endpointIndex]} with status ${response.status}, trying next...`);
//             tryLogin(endpointIndex + 1);
//           }
//         });
//       };
//
//       // Start login process
//       tryLogin();
//     },
//     {
//       validate(): Promise<false | void> {
//         const token = window.localStorage.getItem('token');
//         return Promise.resolve(token ? undefined : false);
//       },
//       cacheAcrossSpecs: true,
//     }
//   );
// });

// Custom command to check if user is logged in
Cypress.Commands.add('isLoggedIn', () => {
  // Check for a UI element that reliably indicates a logged-in state.
  // The user menu in the navbar is a good candidate.
  cy.log('Checking login status by looking for user menu element');
  // Use a longer timeout just in case the UI takes time to render
  return cy.get('body', { timeout: 10000 }).then($body => {
    const userMenuVisible = $body.find('[data-testid="user-menu"]').length > 0;
    cy.log(`User menu found: ${userMenuVisible}`);
    return userMenuVisible;
  });
  // OLD Implementation:
  // return cy.window().its('localStorage').invoke('getItem', 'token').then(token => Boolean(token));
});

// Custom command to navigate to a protected route and verify access
Cypress.Commands.add('visitProtectedRoute', (route: string) => {
  cy.visit(route, {
    failOnStatusCode: false,
    timeout: 15000 // Increase timeout for potentially slow routes
  });

  // Check if we've landed on the intended route
  cy.url().should('include', route, { timeout: 15000 });

  // Handle possible redirects to login pages
  cy.url().then((currentUrl) => {
    if (currentUrl.indexOf('/auth/') >= 0 || currentUrl.indexOf('/login') >= 0) {
      cy.log('Redirected to authentication page, attempting login');
      // Attempt login if needed
      cy.login('test-user-cypress', 'TestPassword123!');

      // After login, visit the originally requested URL
      cy.visit(route);
      cy.log(`Visited ${route} after login`);
      // Optional: Add a wait or assertion here to ensure the page is fully loaded
      // cy.wait(1000); // Example wait
      cy.url().should('include', route); // Basic check
    }
  });
});

// Custom command to logout
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
             // If the button isn't found, we can't proceed with UI logout.
             // We won't clear tokens manually here, as the test should rely on UI interaction.
             // The verification step below will likely fail, indicating an issue.
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
  // Use visit with failOnStatusCode: false to handle potential redirects gracefully
  cy.visit('/dashboard', { failOnStatusCode: false });
  // Wait briefly for potential redirection
  cy.wait(500);
  cy.url().should('include', '/auth/login');
  cy.log('Successfully redirected to login page after logout attempt');

  // Optional: Clear any remaining session state if needed for subsequent tests,
  // although typically beforeEach handles this.
  // cy.clearCookies();
  // cy.clearLocalStorage();
});

// Add a custom command to handle API errors and retry
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

// Add a custom command to check auth status and log debug info
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

  // OLD LocalStorage Checks (commented out as they are likely irrelevant now)
  // cy.window().then(win => {
  //   const token = win.localStorage.getItem('token');
  //   const refreshToken = win.localStorage.getItem('refreshToken');
  //   const sessionId = win.localStorage.getItem('sessionId');
  //
  //   cy.log(`LocalStorage 'token' exists: ${!!token}`);
  //   cy.log(`LocalStorage 'refreshToken' exists: ${!!refreshToken}`);
  //   cy.log(`LocalStorage 'sessionId' exists: ${!!sessionId}`);
  // });

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
  // This implicitly checks if the current state (cookies, etc.) allows access
  cy.request({
    method: 'GET',
    url: '/api/users/me',
    failOnStatusCode: false,
    // No explicit Authorization header needed if cookies handle auth
  }).then(response => {
    cy.log(`Protected User endpoint (/api/users/me) status: ${response.status}`);
    if (response.status === 200) {
      cy.log(`User data received: ${JSON.stringify(response.body)}`);
    } else {
      cy.log('Could not retrieve user data from protected endpoint.');
    }
  });
});

// Custom command to bypass the main layout authentication checks
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
      // Add other necessary user fields if needed
    },
    // We only want this intercept to apply *once* during initial load/setup
    // If the test needs to interact with the real endpoint later, it can.
    // Alternatively, use cy.intercept(...).as('bypass') and cy.wait('@bypass')
    // if the timing needs to be more precise.
    times: 1
  }).as('bypassUserMe');

  // It might also be prudent to intercept the refresh endpoint to prevent
  // unexpected attempts if the bypass is used near potential token expiry checks.
  cy.intercept('POST', '/api/auth/refresh', {
      statusCode: 200,
      body: { access_token: `mock-bypass-token-${Date.now()}` },
      times: 1 // Only intercept once
  }).as('bypassRefresh');

  // Old implementation (commented out):
  // cy.window().then(win => {
  //   win.localStorage.setItem('cypress_test_auth_bypass', 'true');
  //   win.localStorage.setItem('token', 'cypress-test-token');
  // });
  // cy.setCookie('cypress_auth_bypass', 'true');
  // cy.wait(100);
  // cy.log('Authentication bypass flags set for test');
});

// Test page navigation commands
Cypress.Commands.add('visitTestPage', (page: string) => {
  // Use the API route to navigate to test pages
  cy.visit(`/api/e2e-test-page?page=${page}`);
});

// Custom command to select DOM elements by data-testid attribute
Cypress.Commands.add('getByTestId', (selector: string) => {
  return cy.get(`[data-testid="${selector}"]`);
});

// Custom command to create and authenticate a test user
Cypress.Commands.add('createAndLoginUser', (
  username: string = `test_${Date.now()}`,
  email: string = `test_${Date.now()}@example.com`,
  fullName: string = 'Test User'
) => {
  // Create a test user via a task (mocked)
  cy.task('createDirectTestUser', { username, email, fullName }).then((user) => {
    // Log the created user info
    cy.log(`Created test user: ${(user as { username: string }).username}`);

    // Login with the created user
    cy.loginWithToken(username);
  });
});

// Custom command to register a user via API
Cypress.Commands.add('registerUserApi', (userData: { username: string, email: string, password: string, fullName: string }) => {
  const apiData = {
    username: userData.username,
    email: userData.email,
    password: userData.password,
    confirm_password: userData.password, // Assuming password confirmation is the same
    full_name: userData.fullName,
  };

  // Log before making the request
  cy.log(`Attempting to register user via API: ${userData.username}`);

  return cy.request({
    method: 'POST',
    // Use the absolute URL as cy.request doesn't use the Next.js proxy
    url: 'http://localhost:8000/api/auth/register',
    body: apiData,
    headers: {
      'X-Skip-Rate-Limit': 'true' // Add header to bypass rate limit during tests
    },
    failOnStatusCode: false, // Allow handling non-2xx responses
  }).then((response) => {
    // Minimal processing inside .then()
    if (response.status === 200 || response.status === 201) {
      // Optional: Log success outside the .then() if needed after this command finishes
    } else if (response.status === 400 && response.body?.detail?.includes('already exists')) {
      // Optional: Log existing user outside the .then()
    } else if (response.status >= 500) {
      // Optional: Log server error outside the .then()
      console.error(`API Registration failed with status ${response.status}`, response.body);
    } else {
      // Optional: Log other errors outside the .then()
      console.warn(`API Registration responded with status ${response.status}`, response.body);
    }
    // ONLY wrap and return the response
    return cy.wrap(response);
  });
});

// Add a command to get the Zustand store state
Cypress.Commands.add('getNotesStoreState', () => {
  return cy.window().then((window) => {
    // Access the store assuming it's exposed on the window object for testing
    const store = window.__NOTES_STORE__;
    if (store && typeof store.getState === 'function') {
      return store.getState();
    }
    throw new Error('Notes store (__NOTES_STORE__) not found on window object or doesn\'t have getState');
  });
});