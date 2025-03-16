describe('Dashboard Page', () => {
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

    // Mock the learning progress API
    cy.intercept('GET', '/api/progress', {
      statusCode: 200,
      body: {
        completion_rate: 65,
        total_resources: 20,
        completed_resources: 13,
        recent_activity: [
          {
            id: '1',
            type: 'completion',
            resource_id: 'res1',
            resource_title: 'Introduction to React',
            timestamp: new Date().toISOString(),
          },
          {
            id: '2',
            type: 'start',
            resource_id: 'res2',
            resource_title: 'Advanced TypeScript',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    }).as('getProgress');

    // Mock the learning path API
    cy.intercept('GET', '/api/learning-path', {
      statusCode: 200,
      body: {
        goals: [
          { id: '1', title: 'Learn React', progress: 80 },
          { id: '2', title: 'Master TypeScript', progress: 60 },
        ],
        milestones: [
          { id: '1', title: 'Frontend Basics', completed: true },
          { id: '2', title: 'Advanced Frontend', completed: false },
        ],
      },
    }).as('getLearningPath');

    // Visit the dashboard page
    cy.visit('/dashboard');
    cy.wait(['@getSession', '@getProgress', '@getLearningPath']);
  });

  it('displays the dashboard title and welcome message', () => {
    cy.contains('h1', 'Dashboard').should('be.visible');
    cy.contains('Welcome back').should('be.visible');
  });

  it('displays learning progress information', () => {
    cy.contains('Learning Progress').should('be.visible');
    cy.contains('65%').should('be.visible');
    cy.contains('13/20 resources completed').should('be.visible');
  });

  it('displays recent activity feed', () => {
    cy.contains('Recent Activity').should('be.visible');
    cy.contains('Completed').should('be.visible');
    cy.contains('Introduction to React').should('be.visible');
    cy.contains('Started').should('be.visible');
    cy.contains('Advanced TypeScript').should('be.visible');
  });

  it('displays quick actions', () => {
    cy.contains('Quick Actions').should('be.visible');
    cy.contains('Add Resource').should('be.visible');
    cy.contains('Start Review').should('be.visible');
    cy.contains('View Progress').should('be.visible');
    cy.contains('Set Goals').should('be.visible');
  });

  it('navigates to resources page when clicking on View Progress', () => {
    cy.contains('View Progress').click();
    cy.url().should('include', '/resources');
  });

  it('navigates to add resource page when clicking on Add Resource', () => {
    cy.contains('Add Resource').click();
    cy.url().should('include', '/resources/new');
  });

  it('displays learning path progress', () => {
    cy.contains('Learning Path Progress').should('be.visible');
    cy.contains('Learn React').should('be.visible');
    cy.contains('Master TypeScript').should('be.visible');
  });

  it('shows responsive layout on mobile viewport', () => {
    // Test responsive behavior
    cy.viewport('iphone-x');

    // Check that the layout adjusts for mobile
    cy.contains('Dashboard').should('be.visible');
    cy.contains('Learning Progress').should('be.visible');

    // Menu should be collapsed on mobile
    cy.get('button[aria-label="Toggle menu"]').should('be.visible');
  });
});