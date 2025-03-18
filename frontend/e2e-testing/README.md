# E2E Testing

This directory contains all end-to-end testing related files for the Learning Platform frontend.

## Directory Structure

```
e2e-testing/
├── config/                 # Configuration files
│   ├── cypress.config.ts   # Cypress configuration
│   └── multi-reporter-config.json # Reporter configuration
├── cypress/                # Cypress test files
│   ├── e2e/                # Test specifications
│   ├── plugins/            # Cypress plugins
│   ├── support/            # Support files (commands, utilities)
│   ├── screenshots/        # Test failure screenshots
│   ├── videos/             # Test run videos
│   └── *.sh                # Test runner scripts
├── reports/                # Test reports
│   ├── mochawesome/        # Mochawesome reports
│   └── final/              # Final HTML reports
├── runner-results/         # Parallel test runner results
├── scripts/                # Utility scripts
│   └── generate-report.js  # Report generation script
└── README.md               # This file
```

## Running Tests

All test commands are defined in the root `package.json` file. The main commands are:

- `npm run cypress` - Open Cypress test runner
- `npm run cypress:headless` - Run tests headlessly
- `npm run e2e` - Start the dev server and run Cypress
- `npm run e2e:headless` - Start the dev server and run tests headlessly
- `npm run cypress:parallel` - Run tests in parallel
- `npm run cypress:fast` - Run tests in parallel with optimizations
- `npm run e2e:fast` - Start the dev server and run optimized tests
- `npm run e2e:fast-logged` - Run tests with enhanced logging
- `npm run generate:report` - Generate HTML test report

## Scripts

The following scripts provide different ways to run the tests:

- `fast-tests.sh` - Run tests in parallel with optimizations
- `fast-tests-with-logs.sh` - Run tests with enhanced logging
- `run-resilient-tests.sh` - Run tests with automatic retries and error handling
- `backend-logs.sh` - Monitor backend logs during test runs

## Reports

Test reports are generated in the `reports` directory:

- Mochawesome HTML reports in `reports/final`
- JSON reports in `reports/mochawesome`
- Summary reports in `cypress/reports/summary`