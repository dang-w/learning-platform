# Frontend E2E Testing

This directory contains end-to-end and integration tests for the AI/ML Learning Platform frontend using Cypress.

> **Note:** For a comprehensive guide that covers both frontend and backend testing, please refer to the [Unified Testing Guide](/docs/testing/UNIFIED_TESTING_GUIDE.md).

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Test Categories](#test-categories)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Reports](#reports)
- [Writing Tests](#writing-tests)
- [Test Organization](#test-organization)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)
- [Related Documentation](#related-documentation)

## Overview

End-to-end tests validate the application's functionality from a user's perspective, ensuring that all components work together correctly. We use Cypress for both our E2E and integration tests.

## Directory Structure

```
e2e-testing/
├── cypress/
│   ├── e2e/                      # E2E test files
│   │   ├── auth/                 # Authentication tests
│   │   ├── dashboard/            # Dashboard tests
│   │   ├── resources/            # Resource management tests
│   │   ├── knowledge/            # Knowledge management tests
│   │   └── analytics/            # Analytics tests
│   ├── fixtures/                 # Test data files
│   │   ├── users.json            # User data
│   │   └── resources.json        # Resource data
│   ├── integration/              # Integration test files
│   │   ├── api/                  # API integration tests
│   │   └── components/           # Component integration tests
│   ├── plugins/                  # Cypress plugins
│   └── support/                  # Support files
│       ├── commands.js           # Custom commands
│       ├── e2e.js                # E2E specific support
│       └── page-objects/         # Page object models
├── config/                       # Test configuration files
├── reports/                      # Test reports
│   ├── junit/                    # JUnit XML reports
│   ├── mochawesome/              # HTML reports
│   ├── screenshots/              # Test failure screenshots
│   └── videos/                   # Test execution videos
├── test-pages/                   # Test page components
├── scripts/                      # Test helper scripts
├── cypress.config.ts             # Cypress configuration
└── README.md                     # This file
```

## Test Categories

Our tests are organized into the following categories:

### E2E Tests

1. **Authentication Tests**
   - User registration
   - Login
   - Logout
   - Password recovery
   - Protected route access
   - Validation errors

2. **Dashboard Tests**
   - Dashboard layout
   - Widget functionality
   - Navigation elements
   - User-specific greeting
   - Quick navigation
   - Recent activity feed
   - Quick stats
   - Upcoming reviews
   - Learning progress

3. **Resource Management Tests**
   - Adding resources
   - Categorizing resources
   - Resource search and filtering
   - Resource creation
   - Resource editing
   - Resource completion
   - Resource deletion

4. **Knowledge Management Tests**
   - Creating knowledge items
   - Spaced repetition review
   - Knowledge statistics
   - Concept listing and filtering
   - Concept creation
   - Concept editing
   - Concept reviewing
   - Review session

5. **Analytics Tests**
   - Learning progress charts
   - Resource completion statistics
   - Study time tracking
   - Date range filtering
   - Study metric addition
   - Weekly report generation
   - Data export

6. **Learning Path Management Tests**
   - Learning path overview
   - Goal creation
   - Goal editing
   - Goal completion
   - Milestone creation
   - Roadmap editing
   - Learning path progress

7. **Profile Tests**
   - Profile information display
   - Profile information updating
   - Password changing
   - Account statistics
   - Notification preferences
   - User data export

### Integration Tests

1. **API Integration Tests**
   - Backend API interaction
   - Data persistence
   - Error handling

2. **Component Integration Tests**
   - Component interaction
   - State management
   - UI/UX flow

## Getting Started

Prerequisites:
- Node.js (v16+)
- npm or yarn
- Running frontend (localhost:3000)
- Running backend (localhost:8000)

Installation:
```bash
# From the project root
cd frontend
npm install
```

## Running Tests

### Standard Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run all integration tests
npm run test:integration

# Run specific test file
npm run cypress:run -- --spec "cypress/e2e/auth/login.spec.ts"

# Open Cypress UI
npm run cypress:open
```

### Advanced Commands

```bash
# Run tests with resilient retry logic
./cypress/run-resilient-tests.sh

# Run tests with backend logging
./cypress/run-tests-with-logs.sh

# Run fast tests (subset of critical tests)
./cypress/fast-tests.sh

# Run fast tests with backend logging
./cypress/fast-tests-with-logs.sh
```

## Reports

Test reports are generated in the following locations:

- **JUnit Reports**: `reports/junit/`
  - XML format for CI/CD systems

- **HTML Reports**: `reports/mochawesome/`
  - Interactive HTML reports for human review

- **Screenshots**: `reports/screenshots/`
  - Automatically captured on test failures

- **Videos**: `reports/videos/`
  - Recordings of test runs

To generate a report:

```bash
# Run tests with reporting enabled
npm run test:e2e:report
```

## Writing Tests

Follow these guidelines when writing tests:

1. **Use Page Objects**
   - Encapsulate page elements and actions in page object classes
   - See examples in `cypress/support/page-objects/`
   - For more details, see the [Page Objects README](/frontend/e2e-testing/cypress/support/page-objects/README.md)

2. **Follow Test Structure**
   - Arrange: Set up test data and preconditions
   - Act: Perform the actions being tested
   - Assert: Verify the expected outcomes

3. **Data Management**
   - Use fixtures for test data
   - Create test data with API calls for setup
   - Clean up test data after tests

4. **Test Isolation**
   - Each test should be independent
   - Avoid dependencies between tests

Example test:

```typescript
// cypress/e2e/auth/login.spec.ts
import { LoginPage } from '../../support/page-objects/LoginPage';

describe('User Login', () => {
  const loginPage = new LoginPage();

  beforeEach(() => {
    // Reset state between tests
    cy.clearCookies();
    cy.clearLocalStorage();
    loginPage.visit();
  });

  it('should login successfully with valid credentials', () => {
    // Arrange
    const username = 'testuser@example.com';
    const password = 'Password123!';

    // Act
    loginPage.login(username, password);

    // Assert
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid=user-menu]').should('contain', 'Test User');
  });

  it('should show error message with invalid credentials', () => {
    // Arrange
    const username = 'invalid@example.com';
    const password = 'WrongPassword';

    // Act
    loginPage.login(username, password);

    // Assert
    cy.url().should('include', '/login');
    cy.get('[data-testid=error-message]').should('be.visible');
    cy.get('[data-testid=error-message]').should('contain', 'Invalid credentials');
  });
});
```

## Test Organization

The tests are organized in the `cypress/e2e` directory and cover the following areas:

- `auth.cy.ts`: Authentication tests
- `dashboard.cy.ts`: Dashboard functionality tests
- `resources.cy.ts`: Resource management tests
- `url-metadata.cy.ts`: URL metadata extraction tests
- `knowledge.cy.ts`: Knowledge management tests
- `knowledge-spaced-repetition.cy.ts`: Spaced repetition system tests
- `learning-path.cy.ts`: Learning path management tests
- `learning-path-roadmap.cy.ts`: Roadmap visualization tests
- `analytics.cy.ts`: Progress analytics tests
- `analytics-visualization.cy.ts`: Data visualization tests
- `profile.cy.ts`: User profile tests

## Best Practices

- Use `data-testid` attributes for element selection
- Avoid using CSS selectors or text content for element selection
- Use `cy.get().should('be.visible')` to ensure elements are visible
- Use `cy.url().should('include', '/path')` to verify navigation
- Use `cy.get().contains()` to find elements containing specific text
- Use `cy.get().within()` to scope commands to a specific element
- Use custom commands for common operations
- Use data seeding functions to create test data
- Use the `setupAuthenticatedTest` function for authentication
- Use the resilient testing scripts for CI/CD environments

## CI/CD Integration

Tests are automatically run in the CI/CD pipeline:

- **Pull Requests**: Basic test suite runs on all pull requests
- **Merge to Main**: Full test suite including integration tests
- **Nightly**: Performance and load tests

### GitHub Actions Example

```yaml
name: E2E Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  cypress-run:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Cypress run
        uses: cypress-io/github-action@v5
        with:
          working-directory: frontend
          build: npm run build
          start: npm start
          wait-on: 'http://localhost:3000'
```

## Related Documentation

- [Unified Testing Guide](/docs/testing/UNIFIED_TESTING_GUIDE.md): Comprehensive testing guide for the entire project
- [Page Objects README](/frontend/e2e-testing/cypress/support/page-objects/README.md): Detailed documentation on using the Page Object Model
- [Backend Testing Guide](/backend/TESTING.md): Documentation for backend testing
- [Cypress Dashboard Setup](/frontend/e2e-testing/CYPRESS_DASHBOARD_SETUP.md): How to set up the Cypress Dashboard