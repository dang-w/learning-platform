# Cypress Automation Setup

This directory contains the Cypress test automation setup for the Learning Platform frontend.

## Test Structure

- `e2e/`: Contains all end-to-end test files
- `support/`: Contains helper functions and custom commands
- `downloads/`: Default directory for downloaded files during tests
- `reports/`: Generated test reports (created during test runs)
- `screenshots/`: Screenshots captured during test failures
- `videos/`: Videos recorded during test runs

## Available Commands

Run these commands from the frontend directory:

- `npm run cypress`: Open Cypress in interactive mode
- `npm run cypress:headless`: Run Cypress tests in headless mode
- `npm run e2e`: Start the dev server and open Cypress
- `npm run e2e:headless`: Start the dev server and run Cypress tests headlessly
- `npm run cypress:report`: Run tests with Mochawesome reporter
- `npm run cypress:parallel`: Run tests in parallel (2 threads by default)
- `npm run cypress:ci`: Run tests with reporting in CI mode
- `npm run generate:report`: Generate a combined HTML report from test results

## CI/CD Integration

Tests are automatically run on GitHub Actions for:
- Pull requests to `main` and `develop` branches
- Pushes to `main` and `develop` branches

Artifacts generated during CI runs:
- Screenshots (on test failures)
- Videos (always)
- HTML reports (always)

## Debugging Failed Tests

When tests fail, the following artifacts are generated:
1. Screenshots of the failure state
2. Video recordings of the test run
3. Detailed HTML reports with test steps and errors

To view the HTML report locally:
1. Run tests with `npm run cypress:report`
2. Generate the combined report with `npm run generate:report`
3. Open `cypress/reports/final/index.html` in your browser

## Adding New Tests

1. Create a new `.cy.ts` file in the `e2e/` directory
2. Follow the existing test patterns
3. Run the tests to verify they work as expected

## Best Practices

- Keep tests independent of each other
- Use custom commands for repetitive actions
- Add meaningful assertions
- Use data attributes for test selectors
- Keep test files focused on specific features