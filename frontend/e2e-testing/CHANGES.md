# E2E Testing Infrastructure Changes

## Restructuring (March 2025)

We've made significant improvements to the E2E testing infrastructure to enhance maintainability, stability, and organization:

### 1. Configuration Consolidation

- Consolidated multiple Cypress configuration files into a single `cypress.config.ts`
- Created TypeScript type definitions in `cypress.d.ts` for custom commands and tasks
- Added ESLint configuration to properly handle TypeScript in Cypress files

### 2. Test Page Access

- Removed test pages from the `src/app/e2e-test-fixes` directory
- Created an API route at `/api/e2e-test-page` that serves test pages dynamically
- Added middleware configuration to allow access to test pages only in development mode
- Implemented custom commands for accessing test pages:
  ```typescript
  cy.visitTestPage('resources');
  cy.visitTestPage('knowledge');
  ```

### 3. Improved Command Structure

- Added `getByTestId` command for more resilient element selection
- Created authentication bypass commands to simplify test setup
- Updated existing tests to use the new commands

### 4. Enhanced Scripts

- Created `run-tests.sh` for running tests with proper configuration
- Updated `run-with-dashboard.sh` to use the consolidated configuration
- Improved package.json scripts to use the new structure

### 5. Organized Directory Structure

- Moved old test-fixes to `e2e-testing/backup` for reference
- Ensured all test-related files are contained within the `e2e-testing` directory
- Documented the new structure in the README.md

## Benefits

1. **Better Separation of Concerns**: Test-related code is now entirely contained within the e2e-testing directory
2. **Improved Maintainability**: Single source of truth for configuration
3. **Enhanced Stability**: Isolated test pages for UI testing without auth dependencies
4. **Better Developer Experience**: Cleaner commands and structure

## Usage

See the [README.md](./README.md) for detailed instructions on using the new testing infrastructure.