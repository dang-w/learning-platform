describe('Authentication', () => {
  beforeEach(() => {
    // Clear cookies and localStorage before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should display the login form', () => {
    cy.visit('/login');
    cy.get('form').should('exist');
    cy.get('input[name="username"]').should('exist');
    cy.get('input[name="password"]').should('exist');
    cy.get('button[type="submit"]').should('exist');
  });

  it('should show validation errors for empty fields', () => {
    cy.visit('/login');
    cy.get('button[type="submit"]').click();
    cy.get('form').contains('required').should('be.visible');
  });

  it('should show error message for invalid credentials', () => {
    cy.visit('/login');
    cy.get('input[name="username"]').type('invaliduser');
    cy.get('input[name="password"]').type('invalidpassword');
    cy.get('button[type="submit"]').click();
    cy.contains('Invalid username or password').should('be.visible');
  });

  it('should redirect to dashboard after successful login', () => {
    // Intercept the login API call and mock a successful response
    cy.intercept('POST', '/api/token', {
      statusCode: 200,
      body: {
        access_token: 'fake-token',
        token_type: 'bearer',
      },
    }).as('loginRequest');

    cy.visit('/login');
    cy.get('input[name="username"]').type('testuser');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    // Wait for the API call to complete
    cy.wait('@loginRequest');

    // Check that we're redirected to the dashboard
    cy.url().should('include', '/dashboard');
  });
});