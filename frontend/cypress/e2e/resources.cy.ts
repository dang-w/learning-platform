describe('Resource Browsing and Usage', () => {
  it('should load the resources page', () => {
    cy.visit('/resources');
    cy.get('body').should('exist');
  });
});