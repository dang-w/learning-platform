# Page Object Model for E2E Testing

This directory contains the Page Object Model (POM) implementation for the Learning Platform E2E tests. The POM pattern helps make tests more maintainable, reusable, and resilient to changes in the UI.

## What is the Page Object Model?

The Page Object Model is a design pattern that creates an object repository for web UI elements. Each page in the application is represented by a corresponding Page Object class. This approach has several benefits:

- **Separation of concerns**: Test logic is separated from page interaction details
- **Code reuse**: Common interactions are defined once and reused across tests
- **Maintainability**: When the UI changes, only the page object needs to be updated, not every test
- **Readability**: Tests become more readable and focused on behavior rather than implementation details

## Available Page Objects

### BasePage

The `BasePage` class provides common functionality used by all page objects:

- Resilient navigation methods
- Safe element interaction (click, type, etc.)
- Element existence checking
- Screenshot capture for test documentation
- Element waiting utilities

```typescript
import { BasePage } from './page-objects';

// Use as a base class for custom page objects
class MyCustomPage extends BasePage {
  // ...
}
```

### AuthPage

The `AuthPage` handles authentication-related interactions:

- Login form interaction
- Registration form interaction
- Form validation error checking
- Auth state verification

```typescript
import { authPage } from './page-objects';

// Use the singleton instance in tests
it('should login', () => {
  authPage.login('username', 'password');
});
```

### DashboardPage

The `DashboardPage` handles dashboard interactions:

- Dashboard navigation
- Content verification
- Tab switching
- Resource/concept management
- Search and sort functionality

```typescript
import { dashboardPage } from './page-objects';

// Use the singleton instance in tests
it('should show resources', () => {
  dashboardPage.visitDashboard();
  dashboardPage.goToResources();
  dashboardPage.getResourceCount().should('be.gt', 0);
});
```

## How to Use Page Objects in Tests

### Direct Usage with Singleton Instances

For convenience, singleton instances of all page objects are exported:

```typescript
import { authPage, dashboardPage } from '../support/page-objects';

describe('Authentication', () => {
  it('should login successfully', () => {
    authPage.login('testuser', 'password123');
    dashboardPage.isDashboardLoaded().should('be.true');
  });
});
```

### Custom Page Objects

You can create custom page objects by extending the base classes:

```typescript
import { BasePage } from '../support/page-objects';

class ResourcePage extends BasePage {
  // Define selectors
  private selectors = {
    resourceList: '[data-testid="resource-list"]',
    resourceItem: '[data-testid="resource-item"]',
    addButton: '[data-testid="add-resource"]'
  };

  // Define methods
  visitResources() {
    return this.visitProtected('/resources');
  }

  addResource() {
    this.click(this.selectors.addButton);
  }
}

// Create an instance
const resourcePage = new ResourcePage();

// Use in tests
it('should add a resource', () => {
  resourcePage.visitResources();
  resourcePage.addResource();
});
```

## Best Practices

1. **Keep selectors in the page object**: Define all selectors privately in the page class
2. **Create meaningful methods**: Methods should represent user actions or verification steps
3. **Handle resilience at page level**: Error handling and fallback strategies belong in the page object
4. **Take screenshots for documentation**: Use `takeScreenshot` at key points for better debugging
5. **Check element existence**: Always check if elements exist before interacting with them
6. **Use chainable methods**: Return a chainable object when appropriate for fluent API design
7. **Add descriptive logs**: Include cy.log statements to document what the test is doing

## Migration Guide

To migrate existing tests to use the Page Object Model:

1. Replace direct Cypress commands with page object methods
2. Use the resilient navigation methods instead of direct cy.visit()
3. Replace element selection and interaction with page object methods
4. Add screenshot capture for better test documentation
5. Use the provided helper methods for common test patterns

See the script `scripts/update-tests-to-pom.sh` for automated help with this process.