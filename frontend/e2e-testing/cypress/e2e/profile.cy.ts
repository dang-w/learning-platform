/**
 * Profile Page Tests with Page Object Model
 * Using resilient testing patterns for better test stability
 */
import { profilePage } from '../support/page-objects';
import { setupCompleteAuthBypass } from '../support/auth-test-utils';

describe('User Profile', () => {
  const testUser = {
    username: `test-user-${Date.now()}`,
    password: 'TestPassword123!',
    email: `test-user-${Date.now()}@example.com`
  };
  const newPassword = 'NewTestPassword123!';

  beforeEach(() => {
    // Log test start
    cy.log('Starting profile test setup');

    // Setup auth bypass instead of using createDirectTestUser
    cy.log('Setting up auth bypass');
    setupCompleteAuthBypass(testUser.username);

    // Verify auth bypass is working
    cy.window().then(win => {
      cy.log('Checking auth bypass setup');
      cy.log(`Token exists: ${!!win.localStorage.getItem('token')}`);
      cy.log(`User exists: ${!!win.localStorage.getItem('user')}`);
      cy.log(`Auth bypass flag: ${!!win.CYPRESS_AUTH_BYPASS}`);
    });

    // Setup API interceptors
    cy.log('Setting up API interceptors');
    cy.intercept('GET', '**/api/users/me', (req) => {
      cy.log('Intercepted /api/users/me request');
      req.reply({
        statusCode: 200,
        body: {
          id: 'mock-user-id',
          username: testUser.username,
          email: testUser.email,
          fullName: testUser.username,
          role: 'user'
        }
      });
    }).as('getProfile');

    cy.intercept('GET', '**/api/users/statistics', (req) => {
      cy.log('Intercepted /api/users/statistics request');
      req.reply({
        statusCode: 200,
        body: {
          totalCoursesEnrolled: 5,
          completedCourses: 3,
          averageScore: 85,
          totalTimeSpent: 24
        }
      });
    }).as('getStatistics');

    cy.intercept('GET', '**/api/users/notification-preferences', (req) => {
      cy.log('Intercepted /api/users/notification-preferences request');
      req.reply({
        statusCode: 200,
        body: {
          emailNotifications: true,
          courseUpdates: true,
          marketingEmails: false
        }
      });
    }).as('getNotifications');

    // Navigate to profile page and wait for it to load
    cy.log('Navigating to profile page');
    profilePage.visitProfile();

    // Wait for all initial data to load
    cy.log('Waiting for API responses');
    cy.wait(['@getProfile', '@getStatistics', '@getNotifications'], { timeout: 15000 });

    // Log page load status
    cy.document().then(doc => {
      cy.log(`Page title: ${doc.title}`);
      cy.log(`Current URL: ${doc.location.href}`);
    });

    // Intercept and silence uncaught exceptions from the app
    cy.on('uncaught:exception', (err) => {
      cy.log(`Uncaught exception: ${err.message}`);
      // Return false to prevent the error from failing the test
      return false;
    });
  });

  it('should display user profile information', () => {
    // Log test start
    cy.log('Starting profile information test');

    // Wait for profile info elements to be visible
    cy.log('Waiting for profile info elements');
    cy.get('[data-testid="profile-info"]', { timeout: 15000 }).should('be.visible').then($el => {
      cy.log(`Found profile-info element: ${$el.length > 0}`);
    });
    cy.get('[data-testid="profile-username"]', { timeout: 15000 }).should('be.visible').then($el => {
      cy.log(`Found profile-username element: ${$el.length > 0}`);
    });
    cy.get('[data-testid="profile-email"]', { timeout: 15000 }).should('be.visible').then($el => {
      cy.log(`Found profile-email element: ${$el.length > 0}`);
    });

    // Take screenshot of profile page
    cy.log('Taking screenshot');
    profilePage.takeScreenshot('profile-information');
  });

  it('should allow updating profile information if editable', () => {
    // Wait for profile form to be visible
    cy.get('[data-testid="profile-form"]', { timeout: 15000 }).should('be.visible');

    // Update profile info with unique name
    const newName = `Test User ${Date.now()}`;
    cy.get('[data-testid="profile-full-name"]').clear().type(newName);
    cy.get('[data-testid="save-profile-button"]').click();

    // Wait for success message
    cy.get('[data-testid="profile-success"]', { timeout: 15000 }).should('be.visible');
    profilePage.takeScreenshot('profile-update-success');
  });

  it('should allow changing password if feature available', () => {
    // Click the password tab and wait for form
    cy.get('[data-testid="password-tab"]', { timeout: 15000 }).should('be.visible').click();
    cy.get('[data-testid="password-form"]', { timeout: 15000 }).should('be.visible');

    // Fill in password form
    cy.get('[data-testid="current-password-input"]').type(testUser.password);
    cy.get('[data-testid="new-password-input"]').type(newPassword);
    cy.get('[data-testid="confirm-password-input"]').type(newPassword);

    // Submit form
    cy.get('[data-testid="save-password-button"]').click();

    // Wait for success message
    cy.get('[data-testid="success-notification"]', { timeout: 15000 }).should('be.visible');
    profilePage.takeScreenshot('password-change-success');
  });

  it('should display account statistics if available', () => {
    // Click the statistics tab and wait for content
    cy.get('[data-testid="statistics-tab"]', { timeout: 15000 }).should('be.visible').click();
    cy.get('[data-testid="account-statistics"]', { timeout: 15000 }).should('be.visible');
    profilePage.takeScreenshot('account-statistics');

    // Verify statistics values
    cy.contains('Total Courses Enrolled').parent().find('dd').should('contain', '5');
    cy.contains('Completed Courses').parent().find('dd').should('contain', '3');
    cy.contains('Average Score').parent().find('dd').should('contain', '85');
    cy.contains('Total Time Spent').parent().find('dd').should('contain', '24');
  });

  it('should display notification preferences if available', () => {
    // Click the notifications tab and wait for content
    cy.get('[data-testid="notifications-tab"]', { timeout: 15000 }).should('be.visible').click();
    cy.get('[data-testid="notifications-settings"]', { timeout: 15000 }).should('be.visible');
    profilePage.takeScreenshot('notification-preferences');

    // Toggle email notifications
    cy.get('[data-testid="email-notifications-toggle"]').click();

    // Check if the toggle state changed
    cy.get('[data-testid="email-notifications-toggle"]').should('have.attr', 'aria-checked', 'false');
  });

  it('should allow exporting user data', () => {
    // Click the export tab and wait for content
    cy.get('[data-testid="export-tab"]', { timeout: 15000 }).should('be.visible').click();
    cy.get('[data-testid="data-export"]', { timeout: 15000 }).should('be.visible');
    profilePage.takeScreenshot('data-export');

    // Click export button
    cy.get('[data-testid="export-data-button"]').click();

    // Verify the button shows loading state
    cy.get('[data-testid="export-data-button"]').should('contain', 'Exporting...');
  });

  it('should display account deletion option', () => {
    // Click the account tab and wait for content
    cy.get('[data-testid="account-tab"]', { timeout: 15000 }).should('be.visible').click();
    cy.get('[data-testid="delete-account-section"]', { timeout: 15000 }).should('be.visible');
    profilePage.takeScreenshot('account-settings');

    // Click delete account button
    cy.get('[data-testid="delete-account-button"]').click();

    // Verify confirmation dialog appears
    cy.get('[data-testid="delete-account-confirmation"]', { timeout: 15000 }).should('be.visible');
  });
});