/**
 * Analytics Page Object for analytics-related interactions
 * This class provides methods for interacting with the analytics page
 */

import { BasePage } from './BasePage';

export class AnalyticsPage extends BasePage {
  // Define selectors as private constants
  private selectors = {
    // Main container elements
    analyticsContainer: '[data-testid="analytics-container"]',
    analyticsHeader: '[data-testid="analytics-header"]',

    // Charts and data displays
    overviewChart: '[data-testid="overview-chart"]',
    usageChart: '[data-testid="usage-chart"]',
    progressChart: '[data-testid="progress-chart"]',
    resourceStatsTable: '[data-testid="resource-stats-table"]',
    conceptStatsTable: '[data-testid="concept-stats-table"]',

    // Filters and controls
    dateRangeFilter: '[data-testid="date-range-filter"]',
    startDateInput: '[data-testid="start-date-input"]',
    endDateInput: '[data-testid="end-date-input"]',
    filterButton: '[data-testid="filter-button"]',
    resetButton: '[data-testid="reset-button"]',

    // Tabs and navigation
    overviewTab: '[data-testid="overview-tab"]',
    resourcesTab: '[data-testid="resources-tab"]',
    conceptsTab: '[data-testid="concepts-tab"]',
    usersTab: '[data-testid="users-tab"]',

    // Export options
    exportButton: '[data-testid="export-button"]',
    exportCSVOption: '[data-testid="export-csv-option"]',
    exportPDFOption: '[data-testid="export-pdf-option"]',

    // Loading states
    loadingSpinner: '[data-testid="loading-spinner"]'
  };

  /**
   * Navigate to the analytics page
   */
  visitAnalytics(): Cypress.Chainable<void> {
    return this.visitProtected('/analytics');
  }

  /**
   * Check if the analytics page is loaded by waiting for the main container
   */
  isAnalyticsPageLoaded(): Cypress.Chainable<unknown> {
    return this.waitForElement(this.selectors.analyticsContainer);
  }

  /**
   * Wait for analytics data to load
   */
  waitForAnalyticsToLoad(timeout = 15000): Cypress.Chainable {
    return this.waitForElement(this.selectors.overviewChart, timeout);
  }

  /**
   * Switch to a specific analytics tab
   * @param tabName The name of the tab to switch to
   */
  switchToTab(tabName: 'overview' | 'resources' | 'concepts' | 'users'): void {
    const tabMap = {
      overview: this.selectors.overviewTab,
      resources: this.selectors.resourcesTab,
      concepts: this.selectors.conceptsTab,
      users: this.selectors.usersTab
    };

    this.click(tabMap[tabName]);

    // Take a screenshot for documentation
    this.takeScreenshot(`analytics-${tabName}-tab`);
  }

  /**
   * Set a custom date range for analytics
   * @param startDate The start date in YYYY-MM-DD format
   * @param endDate The end date in YYYY-MM-DD format
   */
  setDateRange(startDate: string, endDate: string): void {
    this.click(this.selectors.dateRangeFilter);
    this.type(this.selectors.startDateInput, startDate);
    this.type(this.selectors.endDateInput, endDate);
    this.click(this.selectors.filterButton);

    // Take a screenshot of the filtered data
    this.takeScreenshot('analytics-custom-date-range');
  }

  /**
   * Reset filters to default
   */
  resetFilters(): void {
    this.click(this.selectors.resetButton);
  }

  /**
   * Export analytics data in CSV format
   */
  exportAsCSV(): void {
    this.click(this.selectors.exportButton);
    this.click(this.selectors.exportCSVOption);
  }

  /**
   * Export analytics data in PDF format
   */
  exportAsPDF(): void {
    this.click(this.selectors.exportButton);
    this.click(this.selectors.exportPDFOption);
  }

  /**
   * Verify that overview chart is displayed by waiting for it
   */
  verifyOverviewChartVisible(): Cypress.Chainable<unknown> {
    return this.waitForElement(this.selectors.overviewChart);
  }

  /**
   * Verify that usage chart is displayed
   */
  verifyUsageChartVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.usageChart);
  }

  /**
   * Verify that progress chart is displayed
   */
  verifyProgressChartVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.progressChart);
  }

  /**
   * Verify that resource stats table is displayed
   */
  verifyResourceStatsVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.resourceStatsTable);
  }

  /**
   * Verify that concept stats table is displayed
   */
  verifyConceptStatsVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.conceptStatsTable);
  }

  /**
   * Take screenshots of all charts for documentation or visual testing
   */
  captureAllCharts(): void {
    this.switchToTab('overview');
    this.takeScreenshot('overview-chart');

    this.switchToTab('resources');
    this.takeScreenshot('resources-chart');

    this.switchToTab('concepts');
    this.takeScreenshot('concepts-chart');

    this.switchToTab('users');
    this.takeScreenshot('users-chart');
  }
}

// Export singleton instance
export const analyticsPage = new AnalyticsPage();