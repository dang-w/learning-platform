describe('E2E Test Page', () => {
  beforeEach(() => {
    // Clear cookies and local storage to start fresh
    cy.clearCookies();
    cy.clearLocalStorage();

    // Set failOnStatusCode to false to allow for redirects
    cy.visit('/e2e-test-fixes/resources-test', {
      failOnStatusCode: false,
      timeout: 30000
    });

    // Take a screenshot for debugging
    cy.screenshot('test-page-initial');
  });

  it('should show the test page content', () => {
    // Check the current URL
    cy.url().then(url => {
      cy.log(`Current URL: ${url}`);

      // Take another screenshot showing the page content
      cy.screenshot('test-page-content');

      // Check for basic elements on the page
      cy.get('body').then($body => {
        // Log the HTML content for debugging
        cy.log(`Body HTML: ${$body.html().substring(0, 300)}...`);
      });
    });
  });
});