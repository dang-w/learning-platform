describe('Analytics Viewing', () => {
  it('should load the analytics page', () => {
    cy.visit('/analytics');
    cy.get('body').should('exist');
  });
});