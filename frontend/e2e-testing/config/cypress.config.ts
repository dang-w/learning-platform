// Use ES modules syntax since the project uses ES modules
import { defineConfig } from 'cypress';

// @ts-ignore
const mochawesomeReporter = require('cypress-mochawesome-reporter/plugin');

// Define types for our tasks
interface CustomTasks {
  log(message: string): null;
  table(message: any): null;
}

export default defineConfig({
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'cypress-mochawesome-reporter',
    cypressMochawesomeReporterReporterOptions: {
      reportDir: 'e2e-testing/reports',
      charts: true,
      reportPageTitle: 'Learning Platform E2E Tests',
      embeddedScreenshots: true,
      inlineAssets: true,
    },
  },
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'e2e-testing/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'e2e-testing/cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      // Initialize mochawesome reporter
      mochawesomeReporter(on);

      // @ts-ignore - Basic error logging tasks
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        table(message) {
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
    screenshotsFolder: 'e2e-testing/cypress/screenshots',
    videosFolder: 'e2e-testing/cypress/videos',
    defaultCommandTimeout: 8000,       // Reduced from 10000
    requestTimeout: 10000,             // Reduced from 15000
    responseTimeout: 10000,            // Reduced from 15000
    viewportWidth: 1024,               // Reduced from 1280
    viewportHeight: 768,               // Reduced from 800
    numTestsKeptInMemory: 5,           // Limit memory usage
    experimentalMemoryManagement: true, // Enable experimental memory management
    chromeWebSecurity: false,          // Disable Chrome web security for testing
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