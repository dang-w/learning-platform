/// <reference types="node" />

// Combined Cypress configuration file for all test scenarios
import { defineConfig } from 'cypress';
import { join } from 'path';
// For ESM compatibility, we need to use dynamic import for the plugin
// and properly handle the ESM/CJS interoperability

// Base directory for e2e testing (relative to frontend directory)
const E2E_BASE_DIR = 'e2e';

// Store test data between tests
const testData: Record<string, unknown> = {};

export default defineConfig({
  // Common reporter configuration
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'cypress-mochawesome-reporter, mocha-junit-reporter',
    cypressMochawesomeReporterReporterOptions: {
      reportDir: join(E2E_BASE_DIR, 'cypress/reports/mochawesome'),
      charts: true,
      reportPageTitle: 'Learning Platform E2E Tests',
      embeddedScreenshots: true,
      inlineAssets: true,
    },
    mochaJunitReporterReporterOptions: {
      mochaFile: join(E2E_BASE_DIR, 'cypress/reports/junit/results-[hash].xml'),
      toConsole: false
    }
  },

  // Dashboard configuration (when used with --record flag)
  projectId: process.env.CYPRESS_PROJECT_ID || 'learning-platform-tests',

  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: join(E2E_BASE_DIR, 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'),
    supportFile: join(E2E_BASE_DIR, 'cypress/support/e2e.js'),
    fixturesFolder: join(E2E_BASE_DIR, 'cypress/fixtures'),
    downloadsFolder: join(E2E_BASE_DIR, 'cypress/downloads'),
    screenshotsFolder: join(E2E_BASE_DIR, 'cypress/screenshots'),
    videosFolder: join(E2E_BASE_DIR, 'cypress/videos'),
    setupNodeEvents(on, config) {
      // Import reporter plugin using import() to handle ESM/CJS compatibility
      import('cypress-mochawesome-reporter/plugin').then((plugin) => {
        if (plugin.default && typeof plugin.default === 'function') {
          plugin.default(on);
        }
      }).catch((err) => {
        console.error('Error loading mochawesome reporter plugin:', err);
      });

      // Register tasks for testing
      on('task', {
        log(message: string) {
          console.log(message);
          return null;
        },
        table(message: object) {
          console.table(message);
          return null;
        },
        setTestData(data: Record<string, unknown>) {
          console.log('Setting test data:', data);
          Object.assign(testData, data);
          return testData;
        },
        getTestData(key?: string) {
          if (key) {
            console.log(`Getting test data for key: ${key}`);
            return testData[key] || null;
          }
          console.log('Getting all test data');
          return testData;
        },
        clearTestData() {
          console.log('Clearing test data');
          Object.keys(testData).forEach(key => {
            delete testData[key];
          });
          return null;
        },
        logFailure(message: string) {
          console.log(`Test failed: ${message}`);
          return null;
        },
        logBackendError({ url, status, message, test }: { url: string; status: number; message: string; test: string }) {
          console.error(`Backend Error in "${test}": ${status} - ${message} (${url})`);
          return null;
        },
        logTest({ name, status }: { name: string; status: string }) {
          console.log(`Test: ${name} - Status: ${status}`);
          return null;
        },
        getBackendErrors() {
          return [];
        },
        resetErrorReporter() {
          return null;
        },
        createTestSummary(data: { specs: Array<{name: string; passes: number; failures: number; skipped?: number; notes?: string}>; errors?: string[] }) {
          console.log(`Test summary created with ${data.specs.length} specs`);
          return 'Summary created';
        },
        // Generate JWT token for authentication in tests
        generateJWT({ sub, role = 'user' }: { sub: string; role?: string; expiresIn?: string }): string {
          try {
            // In a real implementation, this would use jsonwebtoken
            // For now, we're returning a mock token
            const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIke3N1Yn0iLCJyb2xlIjoiJHtyb2xlfSIsImlhdCI6MTUxNjIzOTAyMn0.mockSignature${Date.now()}`;
            console.log(`Generated mock JWT token for ${sub} with role ${role}`);
            return mockToken;
          } catch (error) {
            console.error('Error generating JWT:', error);
            // Return a fallback token instead of null to match the type definition
            return `fallback-token-${Date.now()}`;
          }
        },
        // Create a direct test user without backend connectivity
        createDirectTestUser(userData: { username: string; email: string; password: string; fullName: string; }): Promise<{
          success: boolean;
          method: string;
          endpoint?: string;
          alreadyExists?: boolean;
          error?: string;
        }> {
          return new Promise((resolve) => {
            try {
              // Create a mock user response for logging purposes
              const mockUser = {
                id: `test-${Date.now()}`,
                username: userData.username,
                email: userData.email,
                fullName: userData.fullName,
                role: 'user',
                createdAt: new Date().toISOString(),
                isTestUser: true
              };

              console.log(`Created test user: ${userData.username}`, mockUser);
              resolve({
                success: true,
                method: 'direct',
                endpoint: '/mock/users'
              });
            } catch (error) {
              console.error('Error creating test user:', error);
              resolve({
                success: false,
                method: 'direct',
                error: String(error)
              });
            }
          });
        },
        // Task to trigger backend database reset for testing
        async resetDatabase() {
          console.log('[Cypress Task] Attempting to reset backend database...');
          try {
            // NOTE: Requires backend endpoint at POST /api/test-utils/reset-db
            // Ensure your backend test utility endpoint is running and accessible.
            // Use native fetch within the Node context of the task.
            const response = await fetch('http://localhost:8000/api/test-utils/reset-db', {
              method: 'POST',
              headers: {
                // Add any necessary headers, e.g., an API key if your endpoint is protected
                'Content-Type': 'application/json',
                // Example: 'X-Test-Reset-Key': process.env.TEST_RESET_API_KEY || ''
              },
              // Add body if needed by the backend endpoint
              // body: JSON.stringify({}),
            });

            if (!response.ok) {
              const responseBody = await response.text(); // Read body for more details
              throw new Error(`Backend database reset failed: ${response.status} ${response.statusText} - ${responseBody}`);
            }

            console.log('[Cypress Task] Backend database reset successful.');
            return true; // Indicate success to Cypress test
          } catch (error) {
            console.error('[Cypress Task] Error resetting database:', error);
            // Return false or null to indicate failure - test can check this
            // Throwing the error will fail the task and potentially the test run
            throw error; // Re-throw to make the task failure visible in Cypress logs
          }
        },
      });

      return config;
    },
    // Enhanced resilience settings
    experimentalModifyObstructiveThirdPartyCode: true,
    experimentalInteractiveRunEvents: true,
    retries: {
      runMode: 2,      // Retry failed tests in CI
      openMode: 0      // Don't retry in dev mode
    },
    video: process.env.CI === 'true',  // Only record videos in CI
    videoCompression: 32,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 15000,
    requestTimeout: 20000,
    responseTimeout: 20000,
    pageLoadTimeout: 45000,
    viewportWidth: 1024,
    viewportHeight: 768,
    numTestsKeptInMemory: 5,
    experimentalMemoryManagement: true,
    chromeWebSecurity: false,
    testIsolation: true,
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    supportFile: join(E2E_BASE_DIR, 'cypress/support/component.ts'),
    indexHtmlFile: join(E2E_BASE_DIR, 'cypress/support/component-index.html'),
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}'
  },
});