# Cypress Dashboard Integration Setup

This document provides instructions for setting up Cypress Dashboard integration for the Learning Platform project.

## Prerequisites

Before setting up Cypress Dashboard, ensure that:

1. The project's E2E tests are running locally
2. You have a Cypress Dashboard account
3. You have admin rights to create a new project in Cypress Dashboard

## Setup Steps

### 1. Register on Cypress Dashboard

1. Go to https://dashboard.cypress.io/
2. Create an account or log in with an existing account
3. Create a new organization if needed

### 2. Create a New Project

1. In the Cypress Dashboard, click "Create new project"
2. Enter "Learning Platform" as the project name
3. Choose appropriate settings for your project
4. Click "Create project"

### 3. Get Project ID and Record Key

After creating the project, you'll receive:

1. A unique Project ID
2. A Record Key

These credentials will be used to authenticate your test runs with the Cypress Dashboard.

### 4. Configure Environment Variables

Set the following environment variables:

```bash
# For local development
export CYPRESS_PROJECT_ID=your-project-id
export CYPRESS_RECORD_KEY=your-record-key

# For CI environments, set these in your CI configuration
```

Alternatively, you can add these to a `.env.local` file:

```
CYPRESS_PROJECT_ID=your-project-id
CYPRESS_RECORD_KEY=your-record-key
```

### 5. Update Configuration (If Needed)

The project already has a dashboard configuration file at:
`e2e-testing/cypress/config/cypress.dashboard.config.cjs`

Make sure the project ID is set correctly:

```javascript
module.exports = defineConfig({
  // Dashboard configuration
  projectId: process.env.CYPRESS_PROJECT_ID || 'replace-with-your-project-id',
  // ... rest of the configuration
});
```

### 6. Run Tests with Dashboard Integration

To run tests with Dashboard integration:

```bash
# Run all tests and record results to the dashboard
npm run e2e:dashboard

# Run tests in CI with parallelization
npm run e2e:dashboard-ci
```

## Available Scripts

The following npm scripts are available for Dashboard integration:

- `cypress:dashboard`: Run Cypress tests and record results to the dashboard
- `e2e:dashboard`: Start the development server and run Cypress tests with dashboard recording
- `e2e:dashboard-ci`: Run tests in CI environment with parallelization

## CI/CD Integration

For GitHub Actions, add the following to your workflow:

```yaml
jobs:
  cypress-run:
    runs-on: ubuntu-latest
    strategy:
      # Run tests in parallel
      matrix:
        containers: [1, 2, 3, 4]
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Cypress run
        uses: cypress-io/github-action@v5
        with:
          config-file: e2e-testing/cypress/config/cypress.dashboard.config.cjs
          record: true
          parallel: true
          group: 'CI-tests'
        env:
          CYPRESS_PROJECT_ID: ${{ secrets.CYPRESS_PROJECT_ID }}
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
```

## Benefits of Cypress Dashboard

- **Test Analytics**: Monitor test runs and identify flaky tests
- **Test Parallelization**: Run tests faster by distributing them across multiple machines
- **Failure Analysis**: Easily debug test failures with screenshots, videos, and logs
- **Team Collaboration**: Share test results with your team
- **CI Integration**: Integrate with your CI/CD pipeline

## Troubleshooting

If you encounter issues with Cypress Dashboard integration:

1. Verify that your environment variables are set correctly
2. Ensure that your project ID and record key are valid
3. Check that your firewall allows connections to dashboard.cypress.io
4. Review the Cypress Dashboard documentation for specific error messages