describe('Knowledge Base Navigation', () => {
  it('should load the knowledge page', () => {
    cy.visit('/knowledge');
    cy.get('body').should('exist');
  });
});