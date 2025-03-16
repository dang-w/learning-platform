describe('Authentication', () => {
  beforeEach(() => {
    // Clear cookies and localStorage before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should display the login form', () => {
    cy.visit('/auth/login');
    cy.get('form').should('exist');
    cy.get('input[name="username"]').should('exist');
    cy.get('input[name="password"]').should('exist');
    cy.get('button[type="submit"]').should('exist');
  });

  it('should show validation errors for empty fields', () => {
    cy.visit('/auth/login');
    cy.get('button[type="submit"]').click();
    cy.get('form').contains('required').should('be.visible');
  });

  it('should allow entering credentials', () => {
    cy.visit('/auth/login');
    cy.get('input[name="username"]').type('testuser');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').should('not.be.disabled');
  });

  it('should have a link to register page', () => {
    cy.visit('/auth/login');
    cy.contains('Create a new account').should('be.visible');
    cy.contains('Create a new account').should('have.attr', 'href', '/auth/register');
  });
});