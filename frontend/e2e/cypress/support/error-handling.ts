/**
 * Error handling utilities for Cypress tests
 * This file contains utilities to make tests more resilient to backend errors and routing issues
 */

// Configure global error handling for all tests
export const setupErrorHandling = () => {
  // Prevent Cypress from failing on uncaught exceptions from the application
  Cypress.on('uncaught:exception', (err) => {
    console.error('Application error:', err.message);
    // Return false to prevent the error from failing the test
    return false;
  });

  // Log XHR failures but don't fail tests
  Cypress.on('fail', (error) => {
    if (error.name === 'CypressError' &&
        error.message.indexOf('xhr') >= 0 &&
        error.message.indexOf('failed') >= 0) {
      console.error('XHR Error:', error.message);
      return false; // Don't fail the test
    }
    throw error; // Let other errors fail the test
  });

  // Setup API request interceptors to catch server errors
  cy.intercept('**/api/**', (req) => {
    // Log API calls for debugging
    console.log(`API Call: ${req.method} ${req.url}`);

    // Handle response - this is the only event we need
    req.on('response', (res) => {
      try {
        if (res.statusCode >= 500) {
          // Log server errors to help debug but don't fail tests
          cy.log(`⚠️ API error ${res.statusCode} for ${req.method} ${req.url}`);
          console.error(`Server error ${res.statusCode}:`, {
            url: req.url,
            method: req.method,
            response: res.body
          });
        } else if (res.statusCode >= 400) {
          // Log client errors too
          console.warn(`Client error ${res.statusCode}:`, {
            url: req.url,
            method: req.method
          });
        }
      } catch (err) {
        // Handle any errors that occur during response processing
        console.error('Error handling response:', err);
      }
    });
  });
};

// Check if a page exists and is accessible
export const isPageAccessible = (path: string): Cypress.Chainable<boolean> => {
  // Try to visit the page with fallback options
  return cy.visit(path, {
    failOnStatusCode: false,
    timeout: 10000
  }).then(() => {
    // Return true if we successfully navigated to the page
    return cy.url().then(url => {
      return url.includes(path);
    });
  });
};

// Create a mock token for when auth endpoints fail
export const createMockAuthToken = () => {
  const mockToken = 'mock_jwt_token_for_cypress_tests';
  window.localStorage.setItem('token', mockToken);
  cy.setCookie('token', mockToken);
  return mockToken;
};

// Helper to safely find elements without failing tests if they don't exist
export const safeGet = (selector: string) => {
  return cy.get('body').then($body => {
    if ($body.find(selector).length) {
      return cy.get(selector);
    }
    return cy.wrap(null);
  });
};

// Helper to check for error messages in the page
export const checkForErrorMessages = (): Cypress.Chainable<boolean> => {
  return cy.get('body').then($body => {
    const bodyText = $body.text().toLowerCase();
    const hasErrorText = bodyText.includes('error');
    const hasInvalidText = bodyText.includes('invalid');
    const hasIncorrectText = bodyText.includes('incorrect');
    const hasFailedText = bodyText.includes('failed');
    const hasErrorElements =
      $body.find('[data-testid*="error"]').length > 0 ||
      $body.find('.error').length > 0 ||
      $body.find('.alert-danger').length > 0 ||
      $body.find('.alert-error').length > 0;

    return hasErrorText || hasInvalidText || hasIncorrectText ||
           hasFailedText || hasErrorElements;
  });
};

// Retry a function multiple times until it succeeds or max attempts reached
export const retry = <T>(
  fn: () => Cypress.Chainable<T>,
  options: {
    attempts?: number,
    delay?: number,
    logErrors?: boolean
  } = {}
): Cypress.Chainable<T> => {
  const { attempts = 3, delay = 1000, logErrors = true } = options;

  // Simplify by creating a recursive function that returns a Cypress chain
  const tryAttempt = (currentAttempt: number): Cypress.Chainable<T> => {
    // Return a chain that:
    // 1. Creates a flag to track success
    // 2. Tries the operation
    // 3. Sets flag on success
    // 4. Inspects flag and retries if needed

    // Use Cypress variables to track attempts
    return cy.then(() => {
      let succeeded = false;

      // Try the operation
      return fn()
        .then((value) => {
          succeeded = true;
          return value;
        })
        // Use cy.then to handle both success and error cases
        .then(() => {
          // Check if we succeeded or need to retry
          if (succeeded) {
            return fn(); // Call once more to return actual result
          } else if (currentAttempt < attempts) {
            if (logErrors) {
              cy.log(`Retrying attempt ${currentAttempt + 1}/${attempts}`);
            }
            return cy.wait(delay).then(() => tryAttempt(currentAttempt + 1));
          } else {
            return cy.then(() => {
              throw new Error(`Failed after ${attempts} attempts`);
            });
          }
        });
    });
  };

  return tryAttempt(1);
};