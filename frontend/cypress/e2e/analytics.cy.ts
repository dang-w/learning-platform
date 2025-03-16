describe('Analytics Viewing', () => {
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

    // Mock analytics summary data
    cy.intercept('GET', '/api/analytics/summary', {
      statusCode: 200,
      body: {
        studyTime: {
          total: 4500, // minutes
          daily: 45,
          weekly: 315,
          monthly: 1350
        },
        completion: {
          resources: {
            completed: 12,
            inProgress: 5,
            total: 20
          },
          knowledgeItems: {
            learned: 87,
            inProgress: 15,
            total: 120
          },
          learningPaths: {
            completed: 2,
            inProgress: 1,
            total: 5
          }
        },
        streak: {
          current: 15,
          longest: 30
        }
      }
    }).as('getAnalyticsSummary');

    // Mock study time data for chart
    cy.intercept('GET', '/api/analytics/study-time?period=week', {
      statusCode: 200,
      body: [
        { date: '2023-03-10', minutes: 60 },
        { date: '2023-03-11', minutes: 45 },
        { date: '2023-03-12', minutes: 30 },
        { date: '2023-03-13', minutes: 75 },
        { date: '2023-03-14', minutes: 50 },
        { date: '2023-03-15', minutes: 40 },
        { date: '2023-03-16', minutes: 15 }
      ]
    }).as('getWeeklyStudyTime');

    // Mock resource progress data
    cy.intercept('GET', '/api/analytics/resources/progress', {
      statusCode: 200,
      body: [
        {
          id: 1,
          title: 'JavaScript: The Good Parts',
          progress: 100,
          lastAccessed: '2023-03-10T14:30:00Z'
        },
        {
          id: 2,
          title: 'React Fundamentals',
          progress: 65,
          lastAccessed: '2023-03-15T10:15:00Z'
        },
        {
          id: 3,
          title: 'TypeScript in 50 Lessons',
          progress: 30,
          lastAccessed: '2023-03-16T16:45:00Z'
        }
      ]
    }).as('getResourceProgress');

    // Mock knowledge area progress data
    cy.intercept('GET', '/api/analytics/knowledge/progress', {
      statusCode: 200,
      body: [
        {
          id: 1,
          title: 'JavaScript Basics',
          progress: 90,
          itemsLearned: 18,
          totalItems: 20
        },
        {
          id: 2,
          title: 'React Hooks',
          progress: 60,
          itemsLearned: 6,
          totalItems: 10
        },
        {
          id: 3,
          title: 'TypeScript',
          progress: 25,
          itemsLearned: 3,
          totalItems: 12
        }
      ]
    }).as('getKnowledgeProgress');

    // Visit the analytics page
    cy.visit('/analytics');
    cy.wait('@getUser');
    cy.wait('@getAnalyticsSummary');
    cy.wait('@getWeeklyStudyTime');
    cy.wait('@getResourceProgress');
    cy.wait('@getKnowledgeProgress');
  });

  it('should display analytics summary', () => {
    cy.contains('h1', 'Learning Analytics').should('be.visible');

    // Study time section
    cy.contains('Study Time').should('be.visible');
    cy.contains('Total: 75 hours').should('be.visible');
    cy.contains('Daily Average: 45 minutes').should('be.visible');
    cy.contains('Weekly: 5.25 hours').should('be.visible');
    cy.contains('Monthly: 22.5 hours').should('be.visible');

    // Completion section
    cy.contains('Completion Status').should('be.visible');
    cy.contains('Resources: 12/20 completed').should('be.visible');
    cy.contains('Knowledge Items: 87/120 learned').should('be.visible');
    cy.contains('Learning Paths: 2/5 completed').should('be.visible');

    // Streak section
    cy.contains('Learning Streak').should('be.visible');
    cy.contains('Current Streak: 15 days').should('be.visible');
    cy.contains('Longest Streak: 30 days').should('be.visible');
  });

  it('should display study time chart', () => {
    cy.contains('Study Time Trend').should('be.visible');
    cy.get('[data-testid="study-time-chart"]').should('be.visible');

    // Chart should have 7 data points (for a week)
    cy.get('[data-testid="study-time-chart"] .recharts-layer.recharts-bar-rectangle').should('have.length', 7);
  });

  it('should switch between time periods for study time chart', () => {
    // Mock monthly study time data with 30 days
    cy.intercept('GET', '/api/analytics/study-time?period=month', {
      statusCode: 200,
      body: [
        { date: '2023-03-01', minutes: 35 },
        { date: '2023-03-02', minutes: 42 },
        { date: '2023-03-03', minutes: 28 },
        { date: '2023-03-04', minutes: 65 },
        { date: '2023-03-05', minutes: 50 },
        { date: '2023-03-06', minutes: 45 },
        { date: '2023-03-07', minutes: 30 },
        { date: '2023-03-08', minutes: 55 },
        { date: '2023-03-09', minutes: 40 },
        { date: '2023-03-10', minutes: 60 },
        { date: '2023-03-11', minutes: 45 },
        { date: '2023-03-12', minutes: 30 },
        { date: '2023-03-13', minutes: 75 },
        { date: '2023-03-14', minutes: 50 },
        { date: '2023-03-15', minutes: 40 },
        { date: '2023-03-16', minutes: 15 },
        { date: '2023-03-17', minutes: 25 },
        { date: '2023-03-18', minutes: 35 },
        { date: '2023-03-19', minutes: 45 },
        { date: '2023-03-20', minutes: 55 },
        { date: '2023-03-21', minutes: 65 },
        { date: '2023-03-22', minutes: 40 },
        { date: '2023-03-23', minutes: 30 },
        { date: '2023-03-24', minutes: 20 },
        { date: '2023-03-25', minutes: 45 },
        { date: '2023-03-26', minutes: 50 },
        { date: '2023-03-27', minutes: 60 },
        { date: '2023-03-28', minutes: 70 },
        { date: '2023-03-29', minutes: 55 },
        { date: '2023-03-30', minutes: 40 }
      ]
    }).as('getMonthlyStudyTime');

    // Switch to monthly view
    cy.contains('button', 'Month').click();
    cy.wait('@getMonthlyStudyTime');

    // Chart should have 30 data points (for a month)
    cy.get('[data-testid="study-time-chart"] .recharts-layer.recharts-bar-rectangle').should('have.length', 30);
  });

  it('should display resource progress', () => {
    cy.contains('Resource Progress').should('be.visible');

    // Check if all resources are displayed
    cy.contains('JavaScript: The Good Parts').should('be.visible');
    cy.contains('React Fundamentals').should('be.visible');
    cy.contains('TypeScript in 50 Lessons').should('be.visible');

    // Check progress bars
    cy.contains('JavaScript: The Good Parts')
      .parent()
      .find('[role="progressbar"]')
      .should('have.attr', 'aria-valuenow', '100');

    cy.contains('React Fundamentals')
      .parent()
      .find('[role="progressbar"]')
      .should('have.attr', 'aria-valuenow', '65');

    cy.contains('TypeScript in 50 Lessons')
      .parent()
      .find('[role="progressbar"]')
      .should('have.attr', 'aria-valuenow', '30');
  });

  it('should display knowledge area progress', () => {
    cy.contains('Knowledge Area Progress').should('be.visible');

    // Check if all knowledge areas are displayed
    cy.contains('JavaScript Basics').should('be.visible');
    cy.contains('React Hooks').should('be.visible');
    cy.contains('TypeScript').should('be.visible');

    // Check progress information
    cy.contains('JavaScript Basics')
      .parent()
      .contains('90%')
      .should('be.visible');

    cy.contains('JavaScript Basics')
      .parent()
      .contains('18/20 items')
      .should('be.visible');

    cy.contains('React Hooks')
      .parent()
      .contains('60%')
      .should('be.visible');

    cy.contains('React Hooks')
      .parent()
      .contains('6/10 items')
      .should('be.visible');
  });

  it('should generate and download analytics report', () => {
    // Mock the API call to generate report
    cy.intercept('GET', '/api/analytics/report/generate', {
      statusCode: 200,
      body: {
        reportUrl: 'https://example.com/reports/user-1-analytics.pdf'
      }
    }).as('generateReport');

    cy.contains('button', 'Generate Report').click();
    cy.wait('@generateReport');

    // Check if download link is displayed
    cy.contains('a', 'Download Report').should('be.visible');
    cy.contains('a', 'Download Report').should('have.attr', 'href', 'https://example.com/reports/user-1-analytics.pdf');
  });

  it('should display learning focus distribution chart', () => {
    // Mock learning focus data
    cy.intercept('GET', '/api/analytics/learning-focus', {
      statusCode: 200,
      body: [
        { category: 'JavaScript', percentage: 40 },
        { category: 'React', percentage: 25 },
        { category: 'TypeScript', percentage: 15 },
        { category: 'CSS', percentage: 10 },
        { category: 'HTML', percentage: 10 }
      ]
    }).as('getLearningFocus');

    cy.contains('Learning Focus').click();
    cy.wait('@getLearningFocus');

    cy.contains('Learning Focus Distribution').should('be.visible');
    cy.get('[data-testid="learning-focus-chart"]').should('be.visible');

    // Check if all categories are displayed
    cy.contains('JavaScript (40%)').should('be.visible');
    cy.contains('React (25%)').should('be.visible');
    cy.contains('TypeScript (15%)').should('be.visible');
    cy.contains('CSS (10%)').should('be.visible');
    cy.contains('HTML (10%)').should('be.visible');
  });

  it('should display learning goals and progress', () => {
    // Mock learning goals data
    cy.intercept('GET', '/api/analytics/goals', {
      statusCode: 200,
      body: [
        {
          id: 1,
          title: 'Complete React Fundamentals course',
          progress: 65,
          deadline: '2023-04-15T00:00:00Z',
          status: 'in_progress'
        },
        {
          id: 2,
          title: 'Learn 20 TypeScript concepts',
          progress: 40,
          deadline: '2023-04-30T00:00:00Z',
          status: 'in_progress'
        },
        {
          id: 3,
          title: 'Read JavaScript: The Good Parts',
          progress: 100,
          deadline: '2023-03-10T00:00:00Z',
          status: 'completed'
        }
      ]
    }).as('getLearningGoals');

    cy.contains('Goals').click();
    cy.wait('@getLearningGoals');

    cy.contains('Learning Goals').should('be.visible');

    // Check if all goals are displayed
    cy.contains('Complete React Fundamentals course').should('be.visible');
    cy.contains('Learn 20 TypeScript concepts').should('be.visible');
    cy.contains('Read JavaScript: The Good Parts').should('be.visible');

    // Check progress and status
    cy.contains('Complete React Fundamentals course')
      .parent()
      .contains('65%')
      .should('be.visible');

    cy.contains('Complete React Fundamentals course')
      .parent()
      .contains('In Progress')
      .should('be.visible');

    cy.contains('Read JavaScript: The Good Parts')
      .parent()
      .contains('100%')
      .should('be.visible');

    cy.contains('Read JavaScript: The Good Parts')
      .parent()
      .contains('Completed')
      .should('be.visible');
  });

  it('should compare progress with learning community', () => {
    // Mock community comparison data
    cy.intercept('GET', '/api/analytics/community-comparison', {
      statusCode: 200,
      body: {
        studyTime: {
          user: 45, // daily average in minutes
          community: 38
        },
        resourcesCompleted: {
          user: 12,
          community: 8
        },
        knowledgeItemsLearned: {
          user: 87,
          community: 65
        },
        streak: {
          user: 15,
          community: 10
        }
      }
    }).as('getCommunityComparison');

    cy.contains('Community').click();
    cy.wait('@getCommunityComparison');

    cy.contains('Community Comparison').should('be.visible');

    // Check if comparison metrics are displayed
    cy.contains('Daily Study Time').should('be.visible');
    cy.contains('You: 45 minutes').should('be.visible');
    cy.contains('Community Average: 38 minutes').should('be.visible');

    cy.contains('Resources Completed').should('be.visible');
    cy.contains('You: 12').should('be.visible');
    cy.contains('Community Average: 8').should('be.visible');

    cy.contains('Knowledge Items Learned').should('be.visible');
    cy.contains('You: 87').should('be.visible');
    cy.contains('Community Average: 65').should('be.visible');

    cy.contains('Current Streak').should('be.visible');
    cy.contains('You: 15 days').should('be.visible');
    cy.contains('Community Average: 10 days').should('be.visible');
  });
});