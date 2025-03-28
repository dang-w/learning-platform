# Unified Testing Guide for AI/ML Learning Platform

This document consolidates all testing information for the AI/ML Learning Platform, providing a single source of truth for testing approaches, methodologies, and practical implementation details.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Approach](#testing-approach)
3. [Testing Infrastructure](#testing-infrastructure)
4. [Running Tests](#running-tests)
5. [E2E Testing](#e2e-testing)
6. [E2E Testing Fixes](#e2e-testing-fixes)
7. [API-Based Testing Pattern](#api-based-testing-pattern)
8. [Manual Testing Plan](#manual-testing-plan)
9. [Creating New Tests](#creating-new-tests)
10. [Test Data Management](#test-data-management)
11. [Common Issues and Solutions](#common-issues-and-solutions)
12. [Reporting Test Results](#reporting-test-results)

## Testing Philosophy

Our testing approach is guided by these key principles:

- **Beyond Test Coverage**: Tests should verify functional correctness, not just code coverage
- **Domain-Specific Validation**: Special attention to AI/ML-specific features like spaced repetition
- **Integration Focus**: End-to-end functionality is prioritized alongside component testing
- **Automation First**: All tests should be automatable and part of CI/CD pipelines
- **Test Data Realism**: Using realistic AI/ML learning data in tests

## Testing Approach

Our testing strategy follows a comprehensive approach that includes:

- **Unit Testing**: Testing individual components in isolation
- **Integration Testing**: Testing the interaction between components
- **E2E Testing**: Testing the entire application flow from end to end
- **Performance Testing**: Ensuring the application performs well under load
- **Accessibility Testing**: Ensuring the application is accessible to all users

The primary goal is to ensure high-quality, bug-free code while maintaining good test coverage.

## Testing Infrastructure

### Directory Structure

```
learning-platform/
├── frontend/
│   ├── e2e-testing/
│   │   ├── cypress/
│   │   │   ├── e2e/            - E2E test files
│   │   │   ├── fixtures/       - Test fixtures and data
│   │   │   ├── support/        - Support files for tests
│   │   │   └── test-pages/     - Special test pages for E2E testing
│   │   ├── config/             - Configuration files for testing
│   │   └── scripts/            - Scripts for running tests
│   └── src/
│       └── __tests__/          - Unit tests
├── backend/
│   └── tests/                  - Backend API tests
└── docs/
    └── testing/                - Testing documentation
```

### Tools and Frameworks

- **Frontend**:
  - Unit/Component Testing: Jest, React Testing Library
  - E2E Testing: Cypress
- **Backend**:
  - Unit Testing: pytest
  - API Testing: pytest with requests
- **CI/CD**:
  - GitHub Actions for automated testing
  - Cypress Dashboard for E2E test monitoring

## Running Tests

### Frontend Tests

#### Unit Tests

```bash
# Run from the frontend directory
cd frontend

# Run all unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

#### E2E Tests

```bash
# Run from the frontend directory
cd frontend

# Open Cypress UI
npm run cypress:open

# Run all E2E tests headlessly
npm run cypress:run

# Run specific test
npm run cypress:run -- --spec "cypress/e2e/authentication.cy.ts"

# Run with resilient test setup (recommended)
npm run test:e2e:resilient
```

### Backend Tests

```bash
# Run from the backend directory
cd backend

# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run with coverage
pytest --cov=app tests/
```

## E2E Testing

E2E testing validates the entire application flow from the user's perspective. Our E2E tests use Cypress and follow these principles:

1. **Independence**: Each test should be independent and not rely on the state from previous tests
2. **Resilience**: Tests should handle unexpected conditions gracefully
3. **Clarity**: Tests should clearly indicate what they're testing
4. **Performance**: Tests should run efficiently

### Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup code - runs before each test
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/path');
  });

  it('should perform specific action', () => {
    // Test code
    cy.get('[data-testid="element"]').click();
    cy.get('[data-testid="result"]').should('contain', 'Expected Result');
  });
});
```

### Authentication in Tests

For tests requiring authentication, use one of these approaches:

1. **Test-specific bypass pages**: Use pages under `/e2e-test-fixes/` that don't require real authentication
2. **Authentication helper**: Use `cy.login()` custom command
3. **Local storage token**: Set `window.localStorage.setItem('token', 'test-token')`

Example:
```typescript
// Using test-specific bypass page
cy.visit('/e2e-test-fixes/resources-test');

// Using auth helper
cy.login('test@example.com', 'password');

// Using local storage
cy.window().then(win => {
  win.localStorage.setItem('token', 'test-token');
});
```

## E2E Testing Fixes

### Common Issues and Solutions

#### Authentication Bypass

If tests fail due to authentication issues:

1. Use the bypass authentication helper:
```typescript
cy.bypassMainLayoutAuth();
```

2. Visit test pages directly:
```typescript
cy.visit('/e2e-test-fixes/resources-test');
```

#### Form Interaction Issues

If tests have trouble interacting with forms:

1. Add appropriate waits:
```typescript
cy.get('[data-testid="form-element"]', { timeout: 10000 });
```

2. Ensure form elements are visible:
```typescript
cy.get('[data-testid="form-element"]').should('be.visible').click();
```

3. Use force option for challenging clicks:
```typescript
cy.get('[data-testid="button"]').click({ force: true });
```

#### Test Data Management

For consistent test data:

1. Use fixtures:
```typescript
cy.fixture('resources').then(resources => {
  // Use resources data
});
```

2. Use the seed helpers:
```typescript
cy.seedResources(3); // Creates 3 test resources
```

## API-Based Testing Pattern

### Overview

API-based testing provides a more resilient and reliable testing strategy compared to UI-based tests, especially in CI/CD environments where UI rendering can be unpredictable.

### Benefits of API-Based Testing

1. **Resilience**: API tests are less brittle than UI tests, as they don't rely on DOM elements or CSS selectors that might change frequently.
2. **Speed**: API tests execute much faster than UI tests, as they don't need to render pages or wait for animations.
3. **Isolation**: API tests isolate specific functionality, making it easier to identify where issues occur.
4. **Coverage**: API tests can verify business logic without the complexity of UI interaction.
5. **Reliability**: API tests are less prone to timing issues, network fluctuations, or rendering problems that plague UI tests.

### Implementation Pattern

We have successfully implemented this pattern for:

- Resources management (CRUD operations)
- Knowledge concepts management (CRUD operations)

#### Core Components for API Testing

1. **Authentication Setup**:
   ```typescript
   let authToken = 'cypress-test-token';

   before(() => {
     // Generate a proper auth token for testing
     cy.task('generateJWT', { sub: 'test-user', role: 'user' }).then(token => {
       authToken = token as string;
     });
   });
   ```

2. **API Test Structure**:
   ```typescript
   it('should create a resource via API', () => {
     const resource = {
       title: `Test Resource ${Date.now()}`,
       url: 'https://example.com/test',
       type: 'article'
     };

     cy.request({
       method: 'POST',
       url: '/api/resources',
       body: resource,
       headers: { Authorization: `Bearer ${authToken}` }
     }).then(response => {
       expect(response.status).to.eq(201);
       expect(response.body.title).to.eq(resource.title);
       // Verify the UI reflects the API change
       cy.visit('/resources');
       cy.contains(resource.title).should('be.visible');
     });
   });
   ```

## Manual Testing Plan

Manual testing complements automated testing by verifying the user experience and catching issues that automated tests might miss. Here are key manual testing workflows:

### Authentication Flow Testing

1. **Registration Testing**
   - Verify all form fields (Full Name, Username, Email, Password, Confirm Password)
   - Test validation (empty form, invalid email, mismatched passwords)
   - Complete registration with valid data and verify success

2. **Login Testing**
   - Verify form fields (Email/Username, Password)
   - Test validation (empty fields, invalid credentials)
   - Successful login and verification of redirection to dashboard

3. **Password Reset Testing**
   - Request password reset
   - Verify email delivery (check test email service)
   - Complete password reset with valid new password

### Key Feature Testing Workflows

For each core feature, manual testing should verify:
- UI rendering correctly (responsive design, component layout)
- Input validation working as expected
- Expected business logic operation
- Error handling and user feedback
- Performance and responsiveness

Detailed workflows for each feature are available in the archived MANUAL_TESTING_PLAN.md document.

## Creating New Tests

### Steps to Create a New Test

1. **Identify the feature** to test
2. **Determine necessary test cases** covering happy path and edge cases
3. **Create a new test file** in the appropriate directory
4. **Implement test cases** using the recommended patterns
5. **Run and verify** the test passes consistently

### Best Practices

- Use data-testid attributes for element selection
- Keep tests focused on a single feature or behavior
- Use page objects for complex pages
- Mock API calls for faster tests
- Add meaningful assertions that validate behavior
- Use descriptive test and step names

### Example Test Structure

```typescript
import { ResourcesPage } from '../support/page-objects/ResourcesPage';

describe('Resources Management', () => {
  const resourcesPage = new ResourcesPage();

  beforeEach(() => {
    resourcesPage.visitResources();
  });

  it('should create a new resource', () => {
    const title = `Test Resource ${Date.now()}`;
    resourcesPage.addResource({
      title,
      url: 'https://example.com',
      type: 'article'
    });
    resourcesPage.verifyResourceExists(title);
  });
});
```

## Test Data Management

### Test Data Principles

1. **Isolation**: Test data should be isolated from production data
2. **Consistency**: Test data should be consistent across test runs
3. **Relevancy**: Test data should be relevant to the test case
4. **Cleanup**: Test data should be cleaned up after tests

### Test Data Strategies

1. **Fixtures**: Static data defined in JSON files
2. **Seeding**: Programmatically creating test data before tests
3. **API-based**: Creating data using API calls
4. **Mocking**: Mocking API responses for predictable data

### Example: Seeding Test Data

```typescript
// In support/seedTestData.ts
export const seedResources = (count = 3) => {
  const resources = [];

  for (let i = 0; i < count; i++) {
    resources.push({
      title: `Test Resource ${i + 1}`,
      url: `https://example.com/resource-${i + 1}`,
      description: `Description for test resource ${i + 1}`,
      type: i % 3 === 0 ? 'article' : i % 3 === 1 ? 'video' : 'course',
      tags: [`tag-${i + 1}`, 'test', i % 2 === 0 ? 'important' : 'optional']
    });
  }

  cy.request({
    method: 'POST',
    url: '/api/resources/batch',
    body: { resources },
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('token')}`
    }
  });
};
```

## Common Issues and Solutions

### Authentication Issues

- **Issue**: Tests fail due to authentication redirects
- **Solution**: Use test-specific pages or authentication bypass

### Timing Issues

- **Issue**: Tests fail because elements aren't ready
- **Solution**: Add appropriate timeouts and waits

### Selector Issues

- **Issue**: Elements can't be found
- **Solution**: Use data-testid attributes consistently

### API Response Issues

- **Issue**: Tests fail due to unexpected API responses
- **Solution**: Mock API responses or use resilient testing patterns

## Reporting Test Results

### Automated Test Reports

Test results are automatically generated and stored in:
- Cypress Dashboard (for E2E tests)
- GitHub Actions summary (for all tests)
- `frontend/mochawesome-report/` (for local E2E tests)

### Manual Test Reporting

For manual test runs, use the following template:

```markdown
# Test Results: [Feature Name]

## Summary
- Date: [Test Date]
- Tester: [Tester Name]
- Environment: [Test Environment]
- Build Version: [Build Number/Version]

## Results
- Total Tests: [Number]
- Passing: [Number]
- Failing: [Number]
- Skipped: [Number]

## Failing Tests
1. [Test Name]
   - Error: [Error Message]
   - Steps to Reproduce: [Steps]
   - Screenshots: [Links]

## Notes
[Any additional notes or observations]
```