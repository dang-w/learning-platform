describe('Profile Management', () => {
  it('should load the profile page', () => {
    cy.visit('/profile');
    cy.get('body').should('exist');
  });
});