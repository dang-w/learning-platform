#!/usr/bin/env node

/**
 * Script to help migrate Cypress tests to use the Page Object Model pattern
 *
 * Usage: node migrate-to-pom.js [path-to-test-file]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import glob from 'glob';
import chalk from 'chalk';

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the root of the project
const projectRoot = path.join(__dirname, '..');
const testFilesGlob = 'cypress/e2e/**/*.cy.{js,ts}';

// Common selectors and their page object method mappings
const selectorMappings = {
  // Auth selectors
  '[data-testid="login-form"]': '// Use authPage.login() instead',
  '[data-testid="username-input"]': '// Use authPage.login() instead',
  '[data-testid="password-input"]': '// Use authPage.login() instead',
  '[data-testid="login-button"]': '// Use authPage.login() instead',
  '[data-testid="register-form"]': '// Use authPage.register() instead',

  // Dashboard selectors
  '[data-testid="dashboard-container"]': '// Use dashboardPage.isDashboardLoaded() instead',
  '[data-testid="dashboard-header"]': '// Use dashboardPage methods instead',
  '[data-testid="resources-tab"]': '// Use dashboardPage.goToResources() instead',
  '[data-testid="concepts-tab"]': '// Use dashboardPage.goToConcepts() instead',

  // Resources selectors
  '[data-testid="resources-container"]': '// Use resourcesPage.isResourcesPageLoaded() instead',
  '[data-testid="resource-list"]': '// Use resourcesPage methods instead',
  '[data-testid="resource-item"]': '// Use resourcesPage methods instead',
  '[data-testid="add-resource-button"]': '// Use resourcesPage.clickAddResource() instead',

  // Concepts selectors
  '[data-testid="concepts-container"]': '// Use conceptsPage.isConceptsPageLoaded() instead',
  '[data-testid="concepts-list"]': '// Use conceptsPage methods instead',
  '[data-testid="concept-item"]': '// Use conceptsPage methods instead',
  '[data-testid="add-concept-button"]': '// Use conceptsPage.clickAddConcept() instead',

  // Profile selectors
  '[data-testid="profile-container"]': '// Use profilePage.isProfilePageLoaded() instead',
  '[data-testid="edit-profile-button"]': '// Use profilePage.clickEditProfile() instead',

  // Analytics selectors
  '[data-testid="analytics-container"]': '// Use analyticsPage.isAnalyticsPageLoaded() instead',
  '[data-testid="overview-chart"]': '// Use analyticsPage.verifyOverviewChartVisible() instead'
};

// Command mappings to page object methods
const commandMappings = {
  'cy.visit(\'/login\')': 'authPage.visit(\'/login\')',
  'cy.visit(\'/dashboard\')': 'dashboardPage.visitDashboard()',
  'cy.visit(\'/resources\')': 'resourcesPage.visitResources()',
  'cy.visit(\'/concepts\')': 'conceptsPage.visitConcepts()',
  'cy.visit(\'/profile\')': 'profilePage.visitProfile()',
  'cy.visit(\'/analytics\')': 'analyticsPage.visitAnalytics()',

  'cy.get(\'[data-testid="login-button"]\').click()': 'authPage.submitLoginForm()',
  'cy.get(\'[data-testid="register-button"]\').click()': 'authPage.submitRegistrationForm()',

  'cy.get(\'[data-testid="dashboard-container"]\')': 'dashboardPage.isDashboardLoaded()',
  'cy.get(\'[data-testid="resources-tab"]\').click()': 'dashboardPage.goToResources()',
  'cy.get(\'[data-testid="concepts-tab"]\').click()': 'dashboardPage.goToConcepts()',

  'cy.get(\'[data-testid="add-resource-button"]\').click()': 'resourcesPage.clickAddResource()',

  'cy.get(\'[data-testid="add-concept-button"]\').click()': 'conceptsPage.clickAddConcept()'
};

// Page object import statement to add
const importStatement = `
// Import page objects
import {
  authPage,
  dashboardPage,
  resourcesPage,
  conceptsPage,
  analyticsPage,
  profilePage
} from '../../support/page-objects';
`;

/**
 * Process a test file to suggest Page Object Model migrations
 * @param {string} filePath - Path to the test file
 */
function processFile(filePath) {
  console.log(chalk.blue(`\nProcessing file: ${filePath}`));

  // Read the file content
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');

  // Check if imports are already there
  const hasPageObjectImports = fileContent.includes('from \'../../support/page-objects\'');

  // Track suggestions
  const suggestions = [];
  let lineNumber = 0;

  // Process each line
  lines.forEach((line, index) => {
    lineNumber = index + 1;

    // Check for selectors
    Object.entries(selectorMappings).forEach(([selector, suggestion]) => {
      if (line.includes(selector)) {
        suggestions.push({
          lineNumber,
          original: line.trim(),
          suggestion,
          type: 'selector'
        });
      }
    });

    // Check for commands
    Object.entries(commandMappings).forEach(([command, replacement]) => {
      if (line.includes(command)) {
        suggestions.push({
          lineNumber,
          original: line.trim(),
          suggestion: line.trim().replace(command, replacement),
          type: 'command'
        });
      }
    });
  });

  // Print suggestions
  if (suggestions.length > 0) {
    console.log(chalk.green(`Found ${suggestions.length} potential migrations:`));

    if (!hasPageObjectImports) {
      console.log(chalk.yellow(`\nAdd these imports at the top of the file:`));
      console.log(chalk.cyan(importStatement));
    }

    console.log(chalk.yellow('\nSuggested changes:'));
    suggestions.forEach(({ lineNumber, original, suggestion, type }) => {
      console.log(chalk.gray(`Line ${lineNumber}:`));
      console.log(chalk.red(`  - ${original}`));
      console.log(chalk.green(`  + ${type === 'selector' ? suggestion : suggestion}`));
      console.log();
    });
  } else {
    console.log(chalk.green('No migrations needed for this file.'));
  }
}

/**
 * Find all test files and process them
 */
function processAllFiles() {
  const files = glob.sync(path.join(projectRoot, testFilesGlob));

  if (files.length === 0) {
    console.log(chalk.red('No test files found.'));
    return;
  }

  console.log(chalk.blue(`Found ${files.length} test files to process.`));

  files.forEach(file => {
    processFile(file);
  });

  console.log(chalk.green('\nDone processing all files.'));
  console.log(chalk.yellow('\nNext steps:'));
  console.log('1. Manually apply the suggested changes to each file');
  console.log('2. Update tests to use the Page Object Model methods');
  console.log('3. Add screenshot documentation at critical points with page.takeScreenshot()');
  console.log('4. Run the tests to ensure everything is working correctly');
}

/**
 * Process a specific file
 * @param {string} specificFile - Path to a specific file
 */
function processSpecificFile(specificFile) {
  const resolvedPath = path.resolve(process.cwd(), specificFile);

  if (!fs.existsSync(resolvedPath)) {
    console.log(chalk.red(`File not found: ${resolvedPath}`));
    return;
  }

  processFile(resolvedPath);
}

// Main script
const args = process.argv.slice(2);

if (args.length > 0) {
  processSpecificFile(args[0]);
} else {
  processAllFiles();
}

// Print help and usage info
console.log(chalk.blue('\nHow to use the Page Object Model in your tests:'));
console.log('- Import page objects at the top of your test file');
console.log('- Replace direct cy.get() calls with page object methods');
console.log('- Add screenshots at critical points with page.takeScreenshot()');
console.log('- See docs in cypress/support/page-objects/README.md');