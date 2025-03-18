import { setupAuthenticatedTest } from '../support/beforeEach';
import { seedStudyMetrics } from '../support/seedTestData';

describe('Progress Analytics', () => {
  beforeEach(() => {
    // Setup authenticated test and navigate to analytics page
    setupAuthenticatedTest('/analytics');

    // Seed test study metrics
    seedStudyMetrics(14);
  });

  it('should display analytics overview', () => {
    // Check that analytics overview is displayed
    cy.get('[data-testid="analytics-overview"]').should('be.visible');

    // Check that study time section is displayed
    cy.get('[data-testid="study-time-section"]').should('be.visible');

    // Check that resource completion section is displayed
    cy.get('[data-testid="resource-completion-section"]').should('be.visible');

    // Check that knowledge retention section is displayed
    cy.get('[data-testid="knowledge-retention-section"]').should('be.visible');

    // Check that learning path progress section is displayed
    cy.get('[data-testid="learning-path-progress-section"]').should('be.visible');
  });

  it('should allow filtering analytics by date range', () => {
    // Test date range filter
    cy.get('[data-testid="date-range-selector"]').click();

    // Select last week
    cy.get('[data-testid="date-range-last-week"]').click();

    // Verify charts are updated
    cy.get('[data-testid="study-time-chart"]').should('be.visible');
    cy.get('[data-testid="resource-completion-chart"]').should('be.visible');

    // Select last month
    cy.get('[data-testid="date-range-selector"]').click();
    cy.get('[data-testid="date-range-last-month"]').click();

    // Verify charts are updated
    cy.get('[data-testid="study-time-chart"]').should('be.visible');
    cy.get('[data-testid="resource-completion-chart"]').should('be.visible');

    // Select custom range
    cy.get('[data-testid="date-range-selector"]').click();
    cy.get('[data-testid="date-range-custom"]').click();

    // Set custom date range (last 3 months)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    const formattedStartDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const formattedEndDate = endDate.toISOString().split('T')[0]; // YYYY-MM-DD

    cy.get('[data-testid="custom-start-date"]').type(formattedStartDate);
    cy.get('[data-testid="custom-end-date"]').type(formattedEndDate);
    cy.get('[data-testid="apply-custom-range"]').click();

    // Verify charts are updated
    cy.get('[data-testid="study-time-chart"]').should('be.visible');
    cy.get('[data-testid="resource-completion-chart"]').should('be.visible');
  });

  it('should allow adding a new study metric', () => {
    // Click on add metric button
    cy.get('[data-testid="add-metric"]').click();

    // Fill out the metric form
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    cy.get('input[name="date"]').type(today);
    cy.get('input[name="study_hours"]').type('2.5');
    cy.get('input[name="topics"]').type('python,testing,cypress');
    cy.get('input[name="focus_score"]').type('8');
    cy.get('textarea[name="notes"]').type('Study session during Cypress testing');

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Verify the metric was added
    cy.get('[data-testid="success-notification"]').should('be.visible');

    // Verify the charts are updated
    cy.get('[data-testid="study-time-chart"]').should('be.visible');
  });

  it('should display study time analytics', () => {
    // Click on study time tab
    cy.get('[data-testid="study-time-tab"]').click();

    // Verify study time charts are displayed
    cy.get('[data-testid="study-time-chart"]').should('be.visible');
    cy.get('[data-testid="focus-score-chart"]').should('be.visible');
    cy.get('[data-testid="topics-distribution-chart"]').should('be.visible');

    // Test chart type toggle
    cy.get('[data-testid="chart-type-selector"]').click();
    cy.get('[data-testid="chart-type-bar"]').click();

    // Verify chart type changed
    cy.get('[data-testid="study-time-chart"]').should('be.visible');
  });

  it('should display resource completion analytics', () => {
    // Click on resource completion tab
    cy.get('[data-testid="resource-completion-tab"]').click();

    // Verify resource completion charts are displayed
    cy.get('[data-testid="resource-completion-chart"]').should('be.visible');
    cy.get('[data-testid="resource-type-distribution-chart"]').should('be.visible');
    cy.get('[data-testid="resource-difficulty-distribution-chart"]').should('be.visible');

    // Test chart type toggle
    cy.get('[data-testid="chart-type-selector"]').click();
    cy.get('[data-testid="chart-type-doughnut"]').click();

    // Verify chart type changed
    cy.get('[data-testid="resource-type-distribution-chart"]').should('be.visible');
  });

  it('should display knowledge retention analytics', () => {
    // Click on knowledge retention tab
    cy.get('[data-testid="knowledge-retention-tab"]').click();

    // Verify knowledge retention charts are displayed
    cy.get('[data-testid="review-history-chart"]').should('be.visible');
    cy.get('[data-testid="confidence-trend-chart"]').should('be.visible');
    cy.get('[data-testid="concepts-by-topic-chart"]').should('be.visible');

    // Test chart type toggle
    cy.get('[data-testid="chart-type-selector"]').click();
    cy.get('[data-testid="chart-type-line"]').click();

    // Verify chart type changed
    cy.get('[data-testid="confidence-trend-chart"]').should('be.visible');
  });

  it('should display learning path progress analytics', () => {
    // Click on learning path progress tab
    cy.get('[data-testid="learning-path-tab"]').click();

    // Verify learning path progress charts are displayed
    cy.get('[data-testid="goals-progress-chart"]').should('be.visible');
    cy.get('[data-testid="milestones-progress-chart"]').should('be.visible');
    cy.get('[data-testid="roadmap-progress-chart"]').should('be.visible');

    // Test chart type toggle
    cy.get('[data-testid="chart-type-selector"]').click();
    cy.get('[data-testid="chart-type-pie"]').click();

    // Verify chart type changed
    cy.get('[data-testid="goals-progress-chart"]').should('be.visible');
  });

  it('should generate and display weekly report', () => {
    // Click on reports tab
    cy.get('[data-testid="reports-tab"]').click();

    // Click on generate report button
    cy.get('[data-testid="generate-report"]').click();

    // Select weekly report
    cy.get('[data-testid="report-type-weekly"]').click();

    // Select week
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const formattedWeekStart = weekStart.toISOString().split('T')[0]; // YYYY-MM-DD

    // Type the formatted date string
    cy.get('input[name="week_start"]').clear().type(formattedWeekStart);

    // Generate report
    cy.get('[data-testid="generate-report-button"]').click();

    // Verify report is displayed
    cy.get('[data-testid="weekly-report"]').should('be.visible');
    cy.get('[data-testid="report-study-time"]').should('be.visible');
    cy.get('[data-testid="report-resources-completed"]').should('be.visible');
    cy.get('[data-testid="report-concepts-reviewed"]').should('be.visible');
    cy.get('[data-testid="report-goals-progress"]').should('be.visible');
  });

  it('should allow exporting analytics data', () => {
    // Click on export button
    cy.get('[data-testid="export-data"]').click();

    // Select export format
    cy.get('[data-testid="export-format-csv"]').click();

    // Select data to export
    cy.get('[data-testid="export-study-time"]').check();
    cy.get('[data-testid="export-resource-completion"]').check();
    cy.get('[data-testid="export-knowledge-retention"]').check();

    // Click export button
    cy.get('[data-testid="confirm-export"]').click();

    // Verify export was successful
    cy.get('[data-testid="success-notification"]').should('be.visible');
  });
});