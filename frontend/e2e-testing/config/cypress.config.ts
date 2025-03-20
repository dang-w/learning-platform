// Use ES modules syntax since the project uses ES modules
import { defineConfig } from 'cypress';
import { join } from 'path';

// Create a module-level variable for the reporter
let mochawesomeReporter: ((on: Cypress.PluginEvents) => void) | undefined;

// Import mochawesome reporter using dynamic import
// @ts-expect-error - Dynamic import may not be properly typed
import('cypress-mochawesome-reporter/plugin').then((module) => {
  // Store for later use in setupNodeEvents
  mochawesomeReporter = module.default;
});

// Base directory for e2e testing
const E2E_BASE = 'e2e-testing';

export default defineConfig({
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'cypress-mochawesome-reporter',
    cypressMochawesomeReporterReporterOptions: {
      reportDir: join(E2E_BASE, 'reports'),
      charts: true,
      reportPageTitle: 'Learning Platform E2E Tests',
      embeddedScreenshots: true,
      inlineAssets: true,
    },
  },
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: join(E2E_BASE, 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'),
    supportFile: join(E2E_BASE, 'cypress/support/e2e.js'),
    fixturesFolder: join(E2E_BASE, 'cypress/fixtures'),
    downloadsFolder: join(E2E_BASE, 'cypress/downloads'),
    screenshotsFolder: join(E2E_BASE, 'cypress/screenshots'),
    videosFolder: join(E2E_BASE, 'cypress/videos'),
    setupNodeEvents(on, config) {
      // Initialize mochawesome reporter
      if (mochawesomeReporter) {
        mochawesomeReporter(on);
      }

      // Basic error logging tasks
      // @ts-expect-error - Cypress task type checking bypass
      on('task', {
        log(message: string) {
          console.log(message);
          return null;
        },
        table(message: Record<string, unknown>) {
          console.table(message);
          return null;
        },
      });

      return config;
    },
    // Add default settings to make tests more resilient
    experimentalModifyObstructiveThirdPartyCode: true,
    experimentalInteractiveRunEvents: true,
    retries: {
      runMode: 2,      // Retry failed tests in CI
      openMode: 0      // Don't retry in dev mode
    },
    video: process.env.CI === 'true',  // Only record videos in CI
    videoCompression: 32,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 15000,       // Increased from 8000
    requestTimeout: 20000,             // Increased from 10000
    responseTimeout: 20000,            // Increased from 10000
    pageLoadTimeout: 45000,           // Increased from 30000
    viewportWidth: 1024,
    viewportHeight: 768,
    numTestsKeptInMemory: 5,           // Limit memory usage
    experimentalMemoryManagement: true, // Enable experimental memory management
    chromeWebSecurity: false,          // Disable Chrome web security for testing
    testIsolation: true,              // Enable test isolation
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    supportFile: join(E2E_BASE, 'cypress/support/component.ts'),
    indexHtmlFile: join(E2E_BASE, 'cypress/support/component-index.html'),
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}'
  },
});