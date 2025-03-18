import { setupAuthenticatedTest, testUser } from '../support/beforeEach';

describe('User Profile', () => {
  const newPassword = 'NewTestPassword123!';

  beforeEach(() => {
    // Setup authenticated test and navigate to profile page
    setupAuthenticatedTest();

    // Navigate to profile page
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="profile-link"]').click();
    cy.url().should('include', '/profile');
  });

  it('should display user profile information', () => {
    // Check that profile information is displayed
    cy.get('[data-testid="profile-info"]').should('be.visible');

    // Check that username is displayed
    cy.get('[data-testid="profile-username"]').should('be.visible');

    // Check that email is displayed
    cy.get('[data-testid="profile-email"]').should('contain', testUser.email);

    // Check that account creation date is displayed
    cy.get('[data-testid="profile-created-at"]').should('be.visible');
  });

  it('should allow updating profile information', () => {
    // Click on edit profile button
    cy.get('[data-testid="edit-profile"]').click();

    // Update full name
    const newFullName = `Test User ${Date.now()}`;
    cy.get('input[name="full_name"]').clear().type(newFullName);

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Verify the profile was updated
    cy.get('[data-testid="success-notification"]').should('be.visible');

    // Verify the updated profile information is displayed
    cy.get('[data-testid="profile-full-name"]').should('contain', newFullName);
  });

  it('should allow changing password', () => {
    // Click on change password tab
    cy.get('[data-testid="change-password-tab"]').click();

    // Fill out the change password form
    cy.get('input[name="current_password"]').type(testUser.password);
    cy.get('input[name="new_password"]').type(newPassword);
    cy.get('input[name="confirm_password"]').type(newPassword);

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Verify the password was changed
    cy.get('[data-testid="success-notification"]').should('be.visible');

    // Logout
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();

    // Login with new password
    cy.visit('/auth/login');
    cy.get('input[name="username"]').type(testUser.username);
    cy.get('input[name="password"]').type(newPassword);
    cy.get('button[type="submit"]').click();

    // Verify login was successful
    cy.url().should('include', '/dashboard');

    // Change password back for future tests
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="profile-link"]').click();
    cy.get('[data-testid="change-password-tab"]').click();

    cy.get('input[name="current_password"]').type(newPassword);
    cy.get('input[name="new_password"]').type(testUser.password);
    cy.get('input[name="confirm_password"]').type(testUser.password);

    cy.get('button[type="submit"]').click();
  });

  it('should display account statistics', () => {
    // Click on statistics tab
    cy.get('[data-testid="account-statistics-tab"]').click();

    // Check that account statistics are displayed
    cy.get('[data-testid="account-statistics"]').should('be.visible');

    // Check that resources count is displayed
    cy.get('[data-testid="resources-count"]').should('be.visible');

    // Check that concepts count is displayed
    cy.get('[data-testid="concepts-count"]').should('be.visible');

    // Check that study hours is displayed
    cy.get('[data-testid="study-hours"]').should('be.visible');

    // Check that goals count is displayed
    cy.get('[data-testid="goals-count"]').should('be.visible');
  });

  it('should display notification preferences', () => {
    // Click on notifications tab
    cy.get('[data-testid="notifications-tab"]').click();

    // Check that notification preferences are displayed
    cy.get('[data-testid="notification-preferences"]').should('be.visible');

    // Toggle email notifications
    cy.get('[data-testid="email-notifications-toggle"]').click();

    // Toggle review reminders
    cy.get('[data-testid="review-reminders-toggle"]').click();

    // Toggle goal reminders
    cy.get('[data-testid="goal-reminders-toggle"]').click();

    // Save preferences
    cy.get('[data-testid="save-preferences"]').click();

    // Verify preferences were saved
    cy.get('[data-testid="success-notification"]').should('be.visible');
  });

  it('should allow exporting user data', () => {
    // Click on data export tab
    cy.get('[data-testid="data-export-tab"]').click();

    // Check that data export options are displayed
    cy.get('[data-testid="data-export-options"]').should('be.visible');

    // Select export format
    cy.get('[data-testid="export-format-json"]').click();

    // Select data to export
    cy.get('[data-testid="export-resources"]').check();
    cy.get('[data-testid="export-concepts"]').check();
    cy.get('[data-testid="export-metrics"]').check();
    cy.get('[data-testid="export-goals"]').check();

    // Click export button
    cy.get('[data-testid="export-data"]').click();

    // Verify export was initiated
    cy.get('[data-testid="success-notification"]').should('be.visible');
  });

  it('should display account deletion option', () => {
    // Click on account tab
    cy.get('[data-testid="account-tab"]').click();

    // Check that account deletion option is displayed
    cy.get('[data-testid="delete-account-section"]').should('be.visible');

    // Click delete account button
    cy.get('[data-testid="delete-account-button"]').click();

    // Verify confirmation dialog is displayed
    cy.get('[data-testid="delete-account-confirmation"]').should('be.visible');

    // Cancel deletion
    cy.get('[data-testid="cancel-deletion"]').click();

    // Verify confirmation dialog is closed
    cy.get('[data-testid="delete-account-confirmation"]').should('not.exist');
  });
});