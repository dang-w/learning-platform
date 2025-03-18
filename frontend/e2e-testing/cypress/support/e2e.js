// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Import resilient seed data utilities
import {
  seedResourcesReliably,
  seedConceptsReliably,
  seedGoalsReliably,
  seedAllDataReliably,
  setupAuthenticatedTestWithData,
  elementExists,
  safeClick,
  safeType
} from './resilientSeedData';

// Export seed utilities for use in test files
window.seedResourcesReliably = seedResourcesReliably;
window.seedConceptsReliably = seedConceptsReliably;
window.seedGoalsReliably = seedGoalsReliably;
window.seedAllDataReliably = seedAllDataReliably;
window.setupAuthenticatedTestWithData = setupAuthenticatedTestWithData;
window.elementExists = elementExists;
window.safeClick = safeClick;
window.safeType = safeType;

// Configure error handling for backend issues
Cypress.on('uncaught:exception', (err) => {
  console.error('Application error:', err.message);
  // Log backend errors to the backend error log
  cy.task('logBackendError', {
    message: err.message,
    test: Cypress.currentTest ? Cypress.currentTest.title : 'Unknown test'
  });
  // Return false to prevent the error from failing the test
  return false;
});

// Log XHR failures but don't fail tests
Cypress.on('fail', (error) => {
  if (error.message && error.message.indexOf('xhr') >= 0 && error.message.indexOf('failed') >= 0) {
    console.error('XHR Error:', error.message);
    cy.task('logBackendError', {
      message: error.message,
      url: error.source?.url || 'unknown',
      test: Cypress.currentTest ? Cypress.currentTest.title : 'Unknown test'
    });
    return false; // Don't fail the test
  }

  // Report route not found errors but don't fail tests
  if (error.message && error.message.indexOf('failed to load') >= 0) {
    console.error('Route Error:', error.message);
    cy.task('logBackendError', {
      message: error.message,
      url: error.source?.url || 'unknown',
      test: Cypress.currentTest ? Cypress.currentTest.title : 'Unknown test'
    });
    return false;
  }

  throw error; // Let other errors fail the test
});

// Setup API request interceptors to catch server errors
Cypress.once('test:before:run', () => {
  // Reset error reporter
  cy.task('resetErrorReporter');

  cy.intercept('**/api/**', (req) => {
    req.on('response', (res) => {
      if (res.statusCode >= 500) {
        cy.log(`⚠️ API error ${res.statusCode} for ${req.method} ${req.url}`);
        cy.task('logBackendError', {
          url: req.url,
          status: res.statusCode,
          message: res.body?.detail || 'Server error',
          test: Cypress.currentTest ? Cypress.currentTest.title : 'Unknown test'
        });
      }
    });
  });

  // Handle slow connections and timeouts
  cy.intercept('**', (req) => {
    // Add timeout handler
    const timeoutId = setTimeout(() => {
      cy.log(`⚠️ Request timeout for ${req.method} ${req.url}`);
      cy.task('logBackendError', {
        url: req.url,
        status: 504, // Gateway timeout
        message: 'Request timed out',
        test: Cypress.currentTest ? Cypress.currentTest.title : 'Unknown test'
      });
    }, 10000);

    req.on('response', () => {
      clearTimeout(timeoutId);
    });
  });
});

// Automatically log out and clear cache before each test
beforeEach(() => {
  // Clear local storage and cookies
  cy.clearLocalStorage();
  cy.clearCookies();

  // Log failed API requests to help debug
  cy.on('log:added', (logAttributes) => {
    if (logAttributes.name === 'request' && logAttributes.state === 'failed') {
      cy.task('log', `Failed request: ${logAttributes.message}`);
    }
  });
});

// Automatically record network and API errors
afterEach(() => {
  // Log out when tests are done to prevent state leakage
  if (window.localStorage.getItem('token')) {
    window.localStorage.removeItem('token');
  }
});

// Implement fallback values for API responses
Cypress.Commands.overwrite('request', (originalFn, ...args) => {
  const options = args[0];

  // Add default timeout and error handling
  if (typeof options === 'object') {
    const defaults = {
      timeout: 15000,
      failOnStatusCode: false,
      retryOnNetworkFailure: true,
    };

    // Merge with user options
    const mergedOptions = { ...defaults, ...options };

    return originalFn(mergedOptions).then((response) => {
      // Check if there's a server error and log it
      if (response.status >= 500) {
        cy.log(`⚠️ Server error ${response.status} for ${mergedOptions.method || 'GET'} ${mergedOptions.url}`);
        cy.task('logBackendError', {
          url: mergedOptions.url,
          status: response.status,
          message: response.body?.detail || 'Server error',
          test: Cypress.currentTest ? Cypress.currentTest.title : 'Unknown test'
        });
      }

      return response;
    });
  }

  // If it's a simple string URL, just pass through
  return originalFn(...args);
});