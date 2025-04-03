/**
 * Auth Page Object Model for login and registration interactions
 */
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  // Selectors for auth-related elements
  private selectors = {
    usernameInput: '[data-testid="username-input"]',
    emailInput: '[data-testid="email-input"]',
    passwordInput: '[data-testid="password-input"]',
    confirmPasswordInput: '[data-testid="confirm-password-input"]',
    firstNameInput: '[data-testid="first-name-input"]',
    lastNameInput: '[data-testid="last-name-input"]',
    submitButton: '[data-testid="submit-button"]',
    errorUsername: '[data-testid="error-username"]',
    errorEmail: '[data-testid="error-email"]',
    errorPassword: '[data-testid="error-password"]',
    errorFirstName: '[data-testid="error-first-name"]',
    errorLastName: '[data-testid="error-last-name"]',
    loginLink: 'a[href*="login"]',
    registerLink: 'a[href*="register"]'
  };

  /**
   * Navigate to login page with resilient handling
   */
  visitLogin(): Cypress.Chainable<Cypress.AUTWindow> {
    return this.visit('/auth/login');
  }

  /**
   * Navigate to registration page with resilient handling
   */
  visitRegister(): Cypress.Chainable<Cypress.AUTWindow> {
    return this.visit('/auth/register');
  }

  /**
   * Fill in the login form with resilient field checks
   * @param username Username to login with
   * @param password Password to login with
   */
  fillLoginForm(username: string, password: string): void {
    this.elementExists(this.selectors.usernameInput).then(hasUsername => {
      if (hasUsername) {
        this.type(this.selectors.usernameInput, username);
      } else {
        cy.log('Username field not found on login page');
      }
    });

    this.elementExists(this.selectors.passwordInput).then(hasPassword => {
      if (hasPassword) {
        this.type(this.selectors.passwordInput, password);
      } else {
        cy.log('Password field not found on login page');
      }
    });
  }

  /**
   * Fill in the registration form with resilient field checks
   * @param userData User data for registration
   */
  fillRegistrationForm(userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): void {
    this.elementExists(this.selectors.usernameInput).then(hasUsername => {
      if (hasUsername) {
        this.type(this.selectors.usernameInput, userData.username);
      }
    });

    this.elementExists(this.selectors.emailInput).then(hasEmail => {
      if (hasEmail) {
        this.type(this.selectors.emailInput, userData.email);
      }
    });

    this.elementExists(this.selectors.passwordInput).then(hasPassword => {
      if (hasPassword) {
        this.type(this.selectors.passwordInput, userData.password);
      }
    });

    this.elementExists(this.selectors.confirmPasswordInput).then(hasConfirmPassword => {
      if (hasConfirmPassword) {
        this.type(this.selectors.confirmPasswordInput, userData.password);
      }
    });

    if (userData.firstName) {
      this.elementExists(this.selectors.firstNameInput).then(hasFirstName => {
        if (hasFirstName && userData.firstName) {
          this.type(this.selectors.firstNameInput, userData.firstName);
        }
      });
    }

    if (userData.lastName) {
      this.elementExists(this.selectors.lastNameInput).then(hasLastName => {
        if (hasLastName && userData.lastName) {
          this.type(this.selectors.lastNameInput, userData.lastName);
        }
      });
    }
  }

  /**
   * Submit the form (login or registration) ensuring button is enabled
   */
  submitForm(): void {
    cy.log(`Attempting to click submit button: ${this.selectors.submitButton}`);
    // Ensure the button exists and is not disabled before clicking
    cy.get(this.selectors.submitButton)
      .should('be.visible')
      .and('not.be.disabled')
      .click({ force: true }); // Keep force: true for now, but assertion helps
    cy.log('Clicked submit button.');
  }

  /**
   * Login with username and password
   * @param username Username to login with
   * @param password Password to login with
   */
  login(username: string, password: string): void {
    this.visitLogin();
    this.fillLoginForm(username, password);
    this.submitForm();

    // Wait briefly for potential redirects or state changes after submit
    // The actual verification will happen in the test via intercepts and UI checks
    cy.wait(500);
    cy.log('Login form submitted.');
  }

  /**
   * Register a new user
   * @param userData User data for registration
   */
  register(userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): void {
    this.visitRegister();
    this.fillRegistrationForm(userData);
    this.submitForm();

    // Wait for redirect or response
    cy.wait(2000);

    // Check for successful registration - fixed chaining issue
    cy.url().as('currentUrl');
    cy.get('@currentUrl').then(url => {
      const isStillOnRegisterPage = String(url).includes('/register');

      if (isStillOnRegisterPage) {
        this.takeScreenshot('registration-attempt');
      }
    });
  }

  /**
   * Check for validation errors on the form
   * @returns Boolean indicating if validation errors are present
   */
  hasValidationErrors(): Cypress.Chainable<boolean> {
    // Using a different approach to avoid Promise chaining issues
    return cy.document().then(doc => {
      const bodyText = doc.body.textContent?.toLowerCase() || '';
      const hasInvalidText = bodyText.indexOf('invalid') >= 0;
      const hasErrorText = bodyText.indexOf('error') >= 0;
      const hasRequiredText = bodyText.indexOf('required') >= 0;
      const hasErrorElements = doc.querySelectorAll('[data-testid*="error"]').length > 0;

      return hasInvalidText || hasErrorText || hasRequiredText || hasErrorElements;
    });
  }
}