describe('Knowledge Base Navigation', () => {
  beforeEach(() => {
    // Mock authentication
    cy.intercept('GET', '/api/user/me', {
      statusCode: 200,
      body: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User'
      }
    }).as('getUser');

    // Mock knowledge topics
    cy.intercept('GET', '/api/knowledge/topics', {
      statusCode: 200,
      body: [
        { id: 1, title: 'JavaScript Basics', description: 'Fundamentals of JavaScript', itemCount: 15 },
        { id: 2, title: 'React Hooks', description: 'Modern React with Hooks', itemCount: 10 },
        { id: 3, title: 'TypeScript', description: 'Static typing for JavaScript', itemCount: 12 }
      ]
    }).as('getTopics');

    // Mock knowledge items for a specific topic
    cy.intercept('GET', '/api/knowledge/topics/1/items', {
      statusCode: 200,
      body: [
        { id: 1, title: 'Variables and Data Types', type: 'article', completed: true },
        { id: 2, title: 'Functions and Scope', type: 'video', completed: false },
        { id: 3, title: 'Arrays and Objects', type: 'quiz', completed: false }
      ]
    }).as('getTopicItems');

    // Visit the knowledge page
    cy.visit('/knowledge');
    cy.wait('@getUser');
    cy.wait('@getTopics');
  });

  it('should display knowledge topics', () => {
    cy.contains('h1', 'Knowledge Base').should('be.visible');
    cy.contains('JavaScript Basics').should('be.visible');
    cy.contains('React Hooks').should('be.visible');
    cy.contains('TypeScript').should('be.visible');
  });

  it('should navigate to a topic when clicked', () => {
    cy.contains('JavaScript Basics').click();
    cy.url().should('include', '/knowledge/topics/1');
    cy.wait('@getTopicItems');
    cy.contains('h1', 'JavaScript Basics').should('be.visible');
  });

  it('should display topic items', () => {
    cy.contains('JavaScript Basics').click();
    cy.wait('@getTopicItems');
    cy.contains('Variables and Data Types').should('be.visible');
    cy.contains('Functions and Scope').should('be.visible');
    cy.contains('Arrays and Objects').should('be.visible');
  });

  it('should filter topics by search', () => {
    cy.get('input[placeholder*="Search"]').type('React');
    cy.contains('JavaScript Basics').should('not.be.visible');
    cy.contains('React Hooks').should('be.visible');
    cy.contains('TypeScript').should('not.be.visible');
  });

  it('should show topic details when hovering', () => {
    cy.contains('React Hooks').trigger('mouseover');
    cy.contains('Modern React with Hooks').should('be.visible');
    cy.contains('10 items').should('be.visible');
  });

  it('should mark items as completed', () => {
    // Mock the API call to mark an item as completed
    cy.intercept('POST', '/api/knowledge/items/2/complete', {
      statusCode: 200,
      body: { success: true }
    }).as('markComplete');

    cy.contains('JavaScript Basics').click();
    cy.wait('@getTopicItems');

    // Find the "Mark as completed" button for the second item and click it
    cy.contains('Functions and Scope')
      .parent()
      .find('button[aria-label="Mark as completed"]')
      .click();

    cy.wait('@markComplete');

    // Verify the item is now marked as completed
    cy.contains('Functions and Scope')
      .parent()
      .find('[data-testid="completed-icon"]')
      .should('be.visible');
  });
});