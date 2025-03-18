import { setupAuthenticatedTest } from '../support/beforeEach';
import { seedStudyMetrics } from '../support/seedTestData';

describe('Progress Analytics - Data Visualization', () => {
  beforeEach(() => {
    setupAuthenticatedTest('/analytics');

    // Seed test study metrics
    seedStudyMetrics(14); // 2 weeks of data

    // Reload the page to see the seeded data
    cy.reload();
  });

  it('should display the analytics dashboard with charts', () => {
    // Check that the analytics dashboard is displayed
    cy.get('[data-testid="analytics-dashboard"]').should('be.visible');

    // Check that the study time chart is displayed
    cy.get('[data-testid="study-time-chart"]').should('be.visible');

    // Check that the resources completed chart is displayed
    cy.get('[data-testid="resources-completed-chart"]').should('be.visible');

    // Check that the concepts reviewed chart is displayed
    cy.get('[data-testid="concepts-reviewed-chart"]').should('be.visible');
  });

  it('should allow filtering analytics by date range', () => {
    // Check that the date range filter is displayed
    cy.get('[data-testid="date-range-filter"]').should('be.visible');

    // Open the date range picker
    cy.get('[data-testid="date-range-filter"]').click();

    // Select the last 7 days
    cy.get('[data-testid="range-last-7-days"]').click();

    // Check that the URL includes the date range parameter
    cy.url().should('include', 'range=7');

    // Check that the charts are updated
    cy.get('[data-testid="study-time-chart"]').should('be.visible');
    cy.get('[data-testid="chart-period-label"]').should('contain', '7 days');
  });

  it('should allow selecting custom date range', () => {
    // Check that the date range filter is displayed
    cy.get('[data-testid="date-range-filter"]').click();

    // Select custom range option
    cy.get('[data-testid="range-custom"]').click();

    // Set start date (7 days ago)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateString = startDate.toISOString().split('T')[0];
    cy.get('[data-testid="custom-start-date"]').type(startDateString);

    // Set end date (today)
    const endDate = new Date();
    const endDateString = endDate.toISOString().split('T')[0];
    cy.get('[data-testid="custom-end-date"]').type(endDateString);

    // Apply the custom range
    cy.get('[data-testid="apply-custom-range"]').click();

    // Check that the URL includes the date range parameters
    cy.url().should('include', `start=${startDateString}`);
    cy.url().should('include', `end=${endDateString}`);

    // Check that the charts are updated
    cy.get('[data-testid="study-time-chart"]').should('be.visible');
  });

  it('should allow toggling between different chart types', () => {
    // Check that the chart type toggle is displayed
    cy.get('[data-testid="chart-type-toggle"]').should('be.visible');

    // Switch to bar chart
    cy.get('[data-testid="chart-type-bar"]').click();

    // Check that the URL includes the chart type parameter
    cy.url().should('include', 'chartType=bar');

    // Check that the bar chart is displayed
    cy.get('[data-testid="study-time-chart"]').should('have.attr', 'data-chart-type', 'bar');

    // Switch to line chart
    cy.get('[data-testid="chart-type-line"]').click();

    // Check that the URL includes the chart type parameter
    cy.url().should('include', 'chartType=line');

    // Check that the line chart is displayed
    cy.get('[data-testid="study-time-chart"]').should('have.attr', 'data-chart-type', 'line');
  });

  it('should allow exporting analytics data', () => {
    // Check that the export button is displayed
    cy.get('[data-testid="export-data-button"]').should('be.visible');

    // Click the export button
    cy.get('[data-testid="export-data-button"]').click();

    // Check that the export options are displayed
    cy.get('[data-testid="export-options"]').should('be.visible');

    // Select CSV export
    cy.get('[data-testid="export-csv"]').click();

    // Check that the download starts
    // Note: We can't directly test file downloads in Cypress, but we can check that the request is made
    cy.intercept('GET', '/api/analytics/export?format=csv').as('exportCsv');
    cy.wait('@exportCsv').its('response.statusCode').should('eq', 200);
  });

  it('should allow adding a new study metric', () => {
    // Check that the add metric button is displayed
    cy.get('[data-testid="add-metric-button"]').should('be.visible');

    // Click the add metric button
    cy.get('[data-testid="add-metric-button"]').click();

    // Check that the add metric form is displayed
    cy.get('[data-testid="add-metric-form"]').should('be.visible');

    // Fill out the form
    const today = new Date().toISOString().split('T')[0];
    cy.get('[data-testid="metric-date-input"]').type(today);
    cy.get('[data-testid="study-time-input"]').type('60');
    cy.get('[data-testid="resources-completed-input"]').type('2');
    cy.get('[data-testid="concepts-reviewed-input"]').type('5');

    // Submit the form
    cy.get('[data-testid="save-metric-button"]').click();

    // Check that the form is closed
    cy.get('[data-testid="add-metric-form"]').should('not.exist');

    // Check that the charts are updated
    cy.get('[data-testid="study-time-chart"]').should('be.visible');
  });

  it('should generate a weekly report', () => {
    // Check that the generate report button is displayed
    cy.get('[data-testid="generate-report-button"]').should('be.visible');

    // Click the generate report button
    cy.get('[data-testid="generate-report-button"]').click();

    // Check that the report options are displayed
    cy.get('[data-testid="report-options"]').should('be.visible');

    // Select weekly report
    cy.get('[data-testid="weekly-report"]').click();

    // Check that the report is generated
    cy.get('[data-testid="report-content"]', { timeout: 10000 }).should('be.visible');

    // Check that the report contains the expected sections
    cy.get('[data-testid="report-summary"]').should('be.visible');
    cy.get('[data-testid="report-charts"]').should('be.visible');
    cy.get('[data-testid="report-recommendations"]').should('be.visible');
  });
});