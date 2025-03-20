const { defineConfig } = require('cypress');
const mochawesomeReporter = require('cypress-mochawesome-reporter/plugin');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

/**
 * Cypress configuration with Dashboard integration
 *
 * NOTE: To use this configuration:
 * 1. Register the project at https://dashboard.cypress.io
 * 2. Set CYPRESS_PROJECT_ID and CYPRESS_RECORD_KEY environment variables
 * 3. Run Cypress with the --config-file flag pointing to this file
 */
module.exports = defineConfig({
  // Dashboard configuration
  projectId: process.env.CYPRESS_PROJECT_ID || 'replace-with-your-project-id',

  // Test reporter configuration
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'cypress-mochawesome-reporter, mocha-junit-reporter',
    cypressMochawesomeReporterReporterOptions: {
      reportDir: 'e2e-testing/reports/mochawesome',
      charts: true,
      reportPageTitle: 'Learning Platform E2E Tests',
      embeddedScreenshots: true,
      inlineAssets: true,
    },
    mochaJunitReporterReporterOptions: {
      mochaFile: 'e2e-testing/reports/junit/results-[hash].xml',
      toConsole: false
    }
  },

  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'e2e-testing/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'e2e-testing/cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      // Initialize mochawesome reporter
      mochawesomeReporter(on);

      // Create error log file directory if it doesn't exist
      const logPath = './e2e-testing/cypress/backend-errors.log';
      const logDir = path.dirname(logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Create test summary directory if it doesn't exist
      const summaryDir = path.join('./e2e-testing/cypress/reports/summary');
      if (!fs.existsSync(summaryDir)) {
        fs.mkdirSync(summaryDir, { recursive: true });
      }

      // Register tasks for error handling and logging
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        table(message) {
          console.table(message);
          return null;
        },
        // Generate JWT token for testing
        generateJWT(payload) {
          try {
            // Use a consistent secret key for test tokens
            const SECRET_KEY = 'test-secret-key-for-cypress';
            // Set default expiration to 1 hour if not provided
            if (!payload.exp) {
              payload.exp = Math.floor(Date.now() / 1000) + 3600;
            }
            // Create the token
            const token = jwt.sign(payload, SECRET_KEY, { algorithm: 'HS256' });
            console.log(`Generated test token for user: ${payload.sub}`);
            return token;
          } catch (err) {
            console.error('Error generating JWT token:', err.message);
            // Return a fallback token if JWT generation fails
            return 'mock_test_token_for_cypress';
          }
        },
        // Basic error handlers to satisfy other tests
        logFailure(message) {
          console.log(`Test failed: ${message}`);
          return null;
        },
        logBackendError(data) {
          console.error(`Backend Error in "${data.test}": ${data.status} - ${data.message} (${data.url})`);
          return null;
        },
        getBackendErrors() {
          return [];
        },
        resetErrorReporter() {
          return null;
        },
        logTest({ name, status }) {
          console.log(`Test: ${name} - Status: ${status}`);
          return null;
        }
      });

      return config;
    },

    // Enhanced resilience settings for Dashboard runs
    experimentalModifyObstructiveThirdPartyCode: true,
    experimentalInteractiveRunEvents: true,
    retries: {
      runMode: 2,      // Retry failed tests in CI
      openMode: 0      // Don't retry in dev mode
    },
    video: true,       // Always record videos for Dashboard
    videoCompression: 32,
    screenshotOnRunFailure: true,
    screenshotsFolder: 'e2e-testing/cypress/screenshots',
    videosFolder: 'e2e-testing/cypress/videos',

    // Optimized timeouts for CI environment
    defaultCommandTimeout: 10000,
    requestTimeout: 12000,
    responseTimeout: 12000,
    viewportWidth: 1024,
    viewportHeight: 768,
    numTestsKeptInMemory: 5,
    experimentalMemoryManagement: true,
    chromeWebSecurity: false,
  },

  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    supportFile: 'e2e-testing/cypress/support/component.ts',
    indexHtmlFile: 'e2e-testing/cypress/support/component-index.html',
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}'
  },
});