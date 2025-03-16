describe('Learning Path Page', () => {
  beforeEach(() => {
    // Mock the authentication state
    cy.intercept('GET', '/api/auth/session', {
      statusCode: 200,
      body: {
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    }).as('getSession');

    // Mock the learning path API
    cy.intercept('GET', '/api/learning-path', {
      statusCode: 200,
      body: {
        goals: [
          { id: '1', title: 'Master React', description: 'Learn React fundamentals and advanced concepts', progress: 75 },
          { id: '2', title: 'TypeScript Expert', description: 'Become proficient in TypeScript', progress: 45 },
          { id: '3', title: 'Full-Stack Development', description: 'Learn both frontend and backend technologies', progress: 30 },
        ],
        milestones: [
          {
            id: '1',
            title: 'Frontend Basics',
            description: 'HTML, CSS, and JavaScript fundamentals',
            completed: true,
            resources: [
              { id: 'r1', title: 'HTML Fundamentals', completed: true },
              { id: 'r2', title: 'CSS Basics', completed: true },
              { id: 'r3', title: 'JavaScript Essentials', completed: true },
            ]
          },
          {
            id: '2',
            title: 'React Fundamentals',
            description: 'Core React concepts and patterns',
            completed: true,
            resources: [
              { id: 'r4', title: 'React Components', completed: true },
              { id: 'r5', title: 'React Hooks', completed: true },
              { id: 'r6', title: 'State Management', completed: false },
            ]
          },
          {
            id: '3',
            title: 'Advanced Frontend',
            description: 'Advanced React and TypeScript',
            completed: false,
            resources: [
              { id: 'r7', title: 'TypeScript with React', completed: false },
              { id: 'r8', title: 'Performance Optimization', completed: false },
            ]
          },
        ],
      },
    }).as('getLearningPath');

    // Visit the learning path page
    cy.visit('/learning-path');
    cy.wait(['@getSession', '@getLearningPath']);
  });

  it('displays the learning path title and description', () => {
    cy.contains('h1', 'Learning Path').should('be.visible');
    cy.contains('Track your learning journey, set goals, and monitor your progress').should('be.visible');
  });

  it('displays the progress tracker', () => {
    cy.get('[data-testid="progress-tracker"]').should('be.visible');
  });

  it('displays tabs for Goals, Roadmap, and Milestones', () => {
    cy.contains('button', 'Goals').should('be.visible');
    cy.contains('button', 'Roadmap').should('be.visible');
    cy.contains('button', 'Milestones').should('be.visible');
  });

  it('displays goals list when on Goals tab', () => {
    cy.contains('button', 'Goals').click();
    cy.contains('Master React').should('be.visible');
    cy.contains('TypeScript Expert').should('be.visible');
    cy.contains('Full-Stack Development').should('be.visible');
  });

  it('displays roadmap when on Roadmap tab', () => {
    cy.contains('button', 'Roadmap').click();
    cy.contains('Frontend Basics').should('be.visible');
    cy.contains('React Fundamentals').should('be.visible');
    cy.contains('Advanced Frontend').should('be.visible');
  });

  it('displays milestones list when on Milestones tab', () => {
    cy.contains('button', 'Milestones').click();
    cy.contains('Frontend Basics').should('be.visible');
    cy.contains('HTML, CSS, and JavaScript fundamentals').should('be.visible');
    cy.contains('React Fundamentals').should('be.visible');
    cy.contains('Core React concepts and patterns').should('be.visible');
  });

  it('shows milestone details when clicking on a milestone', () => {
    cy.contains('button', 'Milestones').click();
    cy.contains('React Fundamentals').click();

    // Check that the milestone details are displayed
    cy.contains('React Components').should('be.visible');
    cy.contains('React Hooks').should('be.visible');
    cy.contains('State Management').should('be.visible');
  });

  it('shows correct progress indicators for goals', () => {
    cy.contains('button', 'Goals').click();

    // Check that the progress bars are displayed correctly
    cy.contains('Master React').parent().within(() => {
      cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '75');
    });

    cy.contains('TypeScript Expert').parent().within(() => {
      cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '45');
    });
  });

  it('shows responsive layout on mobile viewport', () => {
    // Test responsive behavior
    cy.viewport('iphone-x');

    // Check that the layout adjusts for mobile
    cy.contains('Learning Path').should('be.visible');

    // Tabs should still be visible but might be stacked or in a different layout
    cy.contains('button', 'Goals').should('be.visible');
    cy.contains('button', 'Roadmap').should('be.visible');
    cy.contains('button', 'Milestones').should('be.visible');
  });
});