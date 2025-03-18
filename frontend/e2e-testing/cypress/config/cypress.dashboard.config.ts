import { defineConfig } from 'cypress';

/**
 * Cypress configuration with Dashboard integration
 *
 * NOTE: To use this configuration:
 * 1. Register the project at https://dashboard.cypress.io
 * 2. Set CYPRESS_PROJECT_ID and CYPRESS_RECORD_KEY environment variables
 * 3. Run Cypress with the --config-file flag pointing to this file
 */
export default defineConfig({
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
    setupNodeEvents(on, config) {
      // Import the reporter dynamically
      // @ts-expect-error - Dynamic import may not be properly typed
      import('cypress-mochawesome-reporter/plugin').then((plugin) => {
        plugin.default(on);
      });

      // Register tasks for advanced testing capabilities
      // @ts-expect-error - Bypass type checking for task registration
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        logBackendError({ url, status, message, test }) {
          console.error(`Backend Error in "${test}": ${status} - ${message} (${url})`);
          return null;
        },
        logTest({ name, status }) {
          console.log(`Test: ${name} - Status: ${status}`);
          return null;
        }
      });

      // Load our custom plugins using dynamic import instead of require
      return import('../plugins/index').then((pluginModule) => {
        return pluginModule.default(on, config);
      });
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
  },
});