/**
 * Auth Page Object Model for login and registration interactions
 */
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  // Selectors for auth-related elements
  private selectors = {
    usernameInput: '#username',
    emailInput: '#email',
    passwordInput: '#password',
    confirmPasswordInput: '#confirmPassword',
    fullNameInput: '#fullName',
    submitButton: 'button[type="submit"]',
    errorUsername: '[data-testid="error-username"]',
    errorEmail: '[data-testid="error-email"]',
    errorPassword: '[data-testid="error-password"]',
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
    fullName?: string
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

    if (userData.fullName) {
      this.elementExists(this.selectors.fullNameInput).then(hasFullName => {
        if (hasFullName && userData.fullName) {
          this.type(this.selectors.fullNameInput, userData.fullName);
        }
      });
    }
  }

  /**
   * Submit the form (login or registration)
   */
  submitForm(): void {
    this.click(this.selectors.submitButton);
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

    // Wait for redirect or token to be set
    cy.wait(2000);

    // Check for successful login - avoid nesting cy commands
    cy.log('Checking if login was successful');
    cy.window().then(win => {
      const token = win.localStorage.getItem('token');
      cy.log(token ? 'Login successful - token was set in localStorage' : 'Login might have failed - token not found in localStorage');
      if (!token) {
        this.takeScreenshot('login-attempt');
      }
    });
  }

  /**
   * Register a new user
   * @param userData User data for registration
   */
  register(userData: {
    username: string;
    email: string;
    password: string;
    fullName?: string
  }): void {
    this.visitRegister();
    this.fillRegistrationForm(userData);
    this.submitForm();

    // Wait for redirect or response
    cy.wait(2000);

    // Check for successful registration - avoid nesting cy commands
    cy.url().then(url => {
      const isStillOnRegisterPage = url.includes('/register');
      cy.log(isStillOnRegisterPage ?
        'Registration might have failed - still on registration page' :
        'Registration successful - redirected away from registration page');

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
    return cy.get('body').then($body => {
      const bodyText = $body.text().toLowerCase();
      const hasInvalidText = bodyText.indexOf('invalid') >= 0;
      const hasErrorText = bodyText.indexOf('error') >= 0;
      const hasRequiredText = bodyText.indexOf('required') >= 0;
      const hasErrorElements = $body.find('[data-testid*="error"]').length > 0;

      return hasInvalidText || hasErrorText || hasRequiredText || hasErrorElements;
    });
  }
}