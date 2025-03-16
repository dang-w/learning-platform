describe('Dashboard Page', () => {
  it('should load the dashboard page', () => {
    cy.visit('/dashboard');
    cy.get('body').should('exist');
  });
});