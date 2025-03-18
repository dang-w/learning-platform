import { defineConfig } from 'cypress';

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
    setupNodeEvents(on, config) {
      // Import the reporter dynamically
      // @ts-expect-error - Dynamic import may not be properly typed
      import('cypress-mochawesome-reporter/plugin').then((plugin) => {
        plugin.default(on);
      });

      // Load our custom plugins using dynamic import instead of require
      return import('../plugins/index').then((pluginModule) => {
        return pluginModule.default(on, config);
      });
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
  },
});