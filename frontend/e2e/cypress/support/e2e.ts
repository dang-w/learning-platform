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

// Import other utility files
import './error-handling';
import './dashboard-helper';
import './seedTestData';
// Import seed utilities and functions from resilient data
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

// Load page objects for easier test maintenance
import './page-objects';

// Use Mochawesome reporter for better reports
import 'cypress-mochawesome-reporter/register';

// Add Testing Library support
import '@testing-library/cypress/add-commands';

// Expose getRandomInt utility for test data generation
Cypress.getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Global error handling
Cypress.on('uncaught:exception', (err) => {
  // Use error handler from error-handling.ts
  console.error(`Uncaught exception: ${err.message}`);

  // Log to Cypress task
  if (Cypress.task && typeof Cypress.task.logError === 'function') {
    Cypress.task.logError({
      message: err.message,
      stack: err.stack,
      test: Cypress.currentTest ? Cypress.currentTest.title : 'Unknown'
    });
  }

  // Return false to prevent test failure on uncaught exceptions
  return false;
});

// Handle backend API errors
Cypress.on('fail', (err) => {
  // Check if the error is related to the backend API
  if (err.message.includes('api/') || err.message.includes('Network Error')) {
    console.error(`Backend API error detected: ${err.message}`);

    // Retry the test if enabled
    if (Cypress.env('RETRY_ON_API_FAILURE') === 'true') {
      Cypress.emit('test:retry');
    }
  }

  // Re-throw the error to fail the test
  throw err;
});

// Add global logging for better debugging
Cypress.on('command:start', (command) => {
  if (Cypress.env('DEBUG_COMMANDS') === 'true') {
    console.log(`Starting command: ${command.name}`);
  }
});

// Setup authentication interceptors for all tests
before(() => {
  // Setup authentication interceptors for consistent behavior
  // Intercept the actual token endpoint used for login
  cy.intercept('POST', '**/api/auth/token', (req) => {
    // Allow real login requests to proceed but monitor them
    req.continue((res) => {
      if (res.statusCode >= 400) {
        console.warn(`Login API (/api/auth/token) failed with status ${res.statusCode}`);
      }
    });
  }).as('loginRequest'); // Renamed alias for clarity, though might not be used globally

  // Optional: If registration also changed endpoint, update intercept similarly if needed
  // cy.intercept('POST', '**/api/users/register', { middleware: true }, (req) => { ... });
});

// Export seed utilities for use in test files
window.seedResourcesReliably = seedResourcesReliably;
window.seedConceptsReliably = seedConceptsReliably;
window.seedGoalsReliably = seedGoalsReliably;
window.seedAllDataReliably = seedAllDataReliably;
window.setupAuthenticatedTestWithData = setupAuthenticatedTestWithData;
window.elementExists = elementExists;
window.safeClick = safeClick;
window.safeType = safeType;

// SIMPLIFIED VERSION - DISABLED ERROR REPORTING TO FIX CHAINING ISSUES
// Removed unused logBackendError function

// Automatically log out and clear cache before each test
beforeEach(() => {
  // Clear local storage and cookies
  cy.clearLocalStorage();
  cy.clearCookies();
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
      // Check if there's a server error and log it *to console*
      if (response.status >= 500) {
        console.error(`⚠️ Server error ${response.status} for ${mergedOptions.method || 'GET'} ${mergedOptions.url}`, response.body);
        // Removed cy.log and cy.then(logBackendError) to avoid async issues
      }
      // Just return the original response
      return response;
    });
  }

  // If it's a simple string URL, just pass through
  return originalFn(...args);
});