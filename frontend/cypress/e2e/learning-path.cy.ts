describe('Learning Path Page', () => {
  it('should load the learning path page', () => {
    cy.visit('/learning-path');
    cy.get('body').should('exist');
  });
});