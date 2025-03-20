/**
 * Profile Page Object for profile-related interactions
 * This class provides methods for interacting with the user profile page
 */

import { BasePage } from './BasePage';

export class ProfilePage extends BasePage {
  // Define selectors as private constants
  private selectors = {
    // Loading states
    loadingSpinner: '[data-testid="profile-loading"]',

    // Main container elements
    profileContainer: '[data-testid="profile-info"]',
    profileHeader: '[data-testid="profile-header"]',

    // Profile sections
    personalInfoSection: '[data-testid="personal-info-section"]',
    securitySection: '[data-testid="security-section"]',
    preferencesSection: '[data-testid="preferences-section"]',
    activitySection: '[data-testid="activity-section"]',

    // Form elements
    editProfileButton: '[data-testid="edit-profile-button"]',
    saveProfileButton: '[data-testid="save-profile-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    nameInput: '[data-testid="name-input"]',
    emailInput: '[data-testid="email-input"]',
    bioInput: '[data-testid="bio-input"]',
    avatarUpload: '[data-testid="avatar-upload"]',

    // Password change
    changePasswordButton: '[data-testid="change-password-button"]',
    currentPasswordInput: '[data-testid="current-password-input"]',
    newPasswordInput: '[data-testid="new-password-input"]',
    confirmPasswordInput: '[data-testid="confirm-password-input"]',
    updatePasswordButton: '[data-testid="update-password-button"]',

    // Preferences
    emailNotificationsToggle: '[data-testid="email-notifications-toggle"]',
    darkModeToggle: '[data-testid="dark-mode-toggle"]',
    languageSelect: '[data-testid="language-select"]',
    savePreferencesButton: '[data-testid="save-preferences-button"]',

    // Activity
    activityList: '[data-testid="activity-list"]',
    activityItem: '[data-testid="activity-item"]',
    loadMoreButton: '[data-testid="load-more-button"]',

    // Error and success messages
    errorMessage: '[data-testid="error-message"]',
    successMessage: '[data-testid="success-message"]'
  };

  /**
   * Navigate to the profile page and wait for loading to complete
   */
  visitProfile(): void {
    this.visitProtected('/profile');
    this.waitForLoadingComplete();

    // Wait for the profile container to be visible
    cy.get(this.selectors.profileContainer, { timeout: 15000 }).should('be.visible');
  }

  /**
   * Wait for loading to complete
   */
  waitForLoadingComplete(): void {
    // Wait for loading spinner to appear and disappear, but don't fail if it doesn't appear
    cy.get('body').then(($body) => {
      if ($body.find(this.selectors.loadingSpinner).length > 0) {
        cy.get(this.selectors.loadingSpinner).should('exist');
        cy.get(this.selectors.loadingSpinner).should('not.exist');
      }
    });
  }

  /**
   * Check if the profile page is loaded
   */
  isProfilePageLoaded(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.profileContainer);
  }

  /**
   * Click edit profile button
   */
  clickEditProfile(): void {
    this.click(this.selectors.editProfileButton);
  }

  /**
   * Update user profile information
   * @param name The new name
   * @param bio The new bio
   */
  updateProfileInfo(name: string, bio: string): void {
    this.clickEditProfile();

    // Clear existing values
    cy.get(this.selectors.nameInput).clear();
    cy.get(this.selectors.bioInput).clear();

    // Enter new values
    this.type(this.selectors.nameInput, name);
    this.type(this.selectors.bioInput, bio);

    // Save changes
    this.click(this.selectors.saveProfileButton);

    // Take a screenshot for documentation
    this.takeScreenshot('profile-updated');
  }

  /**
   * Upload a new avatar image
   * @param filePath The path to the image file
   */
  uploadAvatar(filePath: string): void {
    this.clickEditProfile();

    // Upload file using a safer method that works without attachFile
    cy.get(this.selectors.avatarUpload).then(($input) => {
      // Check if element is an input with type file
      if ($input.prop('tagName') === 'INPUT' && $input.attr('type') === 'file') {
        cy.wrap($input).selectFile(filePath, { force: true });
      } else {
        cy.log('Avatar upload element is not a file input, using alternative approach');
        // Use the Cypress selectFile command which works on any element
        cy.get(this.selectors.avatarUpload).selectFile(filePath, { force: true });
      }
    });

    // Save changes
    this.click(this.selectors.saveProfileButton);

    // Take a screenshot for documentation
    this.takeScreenshot('avatar-updated');
  }

  /**
   * Change user password
   * @param currentPassword The current password
   * @param newPassword The new password
   */
  changePassword(currentPassword: string, newPassword: string): void {
    this.click(this.selectors.changePasswordButton);

    this.type(this.selectors.currentPasswordInput, currentPassword);
    this.type(this.selectors.newPasswordInput, newPassword);
    this.type(this.selectors.confirmPasswordInput, newPassword);

    this.click(this.selectors.updatePasswordButton);

    // Take a screenshot for documentation
    this.takeScreenshot('password-changed');
  }

  /**
   * Toggle email notifications
   * @param enable Whether to enable or disable email notifications
   */
  toggleEmailNotifications(enable: boolean): void {
    cy.get(this.selectors.emailNotificationsToggle).then(($toggle) => {
      const isEnabled = $toggle.attr('aria-checked') === 'true';

      if ((enable && !isEnabled) || (!enable && isEnabled)) {
        this.click(this.selectors.emailNotificationsToggle);
      }
    });

    this.click(this.selectors.savePreferencesButton);
  }

  /**
   * Toggle dark mode
   * @param enable Whether to enable or disable dark mode
   */
  toggleDarkMode(enable: boolean): void {
    cy.get(this.selectors.darkModeToggle).then(($toggle) => {
      const isEnabled = $toggle.attr('aria-checked') === 'true';

      if ((enable && !isEnabled) || (!enable && isEnabled)) {
        this.click(this.selectors.darkModeToggle);
      }
    });

    this.click(this.selectors.savePreferencesButton);

    // Take a screenshot with dark mode
    if (enable) {
      this.takeScreenshot('dark-mode-enabled');
    } else {
      this.takeScreenshot('dark-mode-disabled');
    }
  }

  /**
   * Change language preference
   * @param language The language to select
   */
  changeLanguage(language: string): void {
    this.click(this.selectors.languageSelect);
    cy.contains(language).click();

    this.click(this.selectors.savePreferencesButton);
  }

  /**
   * Get the number of activity items
   */
  getActivityCount(): Cypress.Chainable<number> {
    return cy.get(this.selectors.activityItem).its('length');
  }

  /**
   * Click the load more button in the activity section
   */
  loadMoreActivity(): void {
    this.click(this.selectors.loadMoreButton);
  }

  /**
   * Check if error message is displayed
   */
  hasErrorMessage(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.errorMessage);
  }

  /**
   * Check if success message is displayed
   */
  hasSuccessMessage(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.successMessage);
  }

  /**
   * Get the text of error message
   */
  getErrorMessage(): Cypress.Chainable<string> {
    return cy.get(this.selectors.errorMessage).invoke('text');
  }

  /**
   * Get the text of success message
   */
  getSuccessMessage(): Cypress.Chainable<string> {
    return cy.get(this.selectors.successMessage).invoke('text');
  }
}

// Export singleton instance
export const profilePage = new ProfilePage();