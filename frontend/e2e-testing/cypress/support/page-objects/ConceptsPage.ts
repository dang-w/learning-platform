/**
 * Concepts Page Object for managing concept-related interactions
 * This class provides methods for interacting with the concepts page
 */

import { BasePage } from './BasePage';

interface ConceptFormData {
  title: string;
  content?: string;
  description?: string;
  difficulty?: string;
  topics?: string[];
  category?: string;
}

interface ConceptDetails {
  title?: string;
  content?: string;
}

export class ConceptsPage extends BasePage {
  // Define selectors as private constants
  private selectors = {
    // Main container elements
    conceptsContainer: '[data-testid="concepts-container"]',
    conceptsList: '[data-testid="concepts-list"]',
    conceptItem: '[data-testid="concept-item"]',

    // Actions
    addConceptButton: '[data-testid="add-concept-button"]',
    editConceptButton: '[data-testid="edit-concept-button"]',
    deleteConceptButton: '[data-testid="delete-concept-button"]',
    confirmDeleteButton: '[data-testid="confirm-delete-button"]',
    reviewButton: '[data-testid="review-button"]',

    // Form elements
    conceptForm: '[data-testid="concept-form"]',
    conceptTitleInput: '[data-testid="concept-title-input"]',
    conceptDescriptionInput: '[data-testid="concept-description-input"]',
    conceptCategorySelect: '[data-testid="concept-category-select"]',
    conceptDifficultySelect: '[data-testid="concept-difficulty"]',
    conceptTopicsInput: '[data-testid="concept-topics"]',
    markdownEditor: '[data-testid="markdown-editor"]',
    saveConceptButton: '[data-testid="save-concept-button"]',
    submitButton: 'button[type="submit"]',
    cancelButton: '[data-testid="cancel-button"]',

    // Detail view elements
    conceptDetail: '[data-testid="concept-detail"]',
    conceptTitle: '[data-testid="concept-title"]',
    conceptContent: '[data-testid="concept-content"]',

    // Filters and search
    searchInput: '[data-testid="search-concepts-input"]',
    filterDropdown: '[data-testid="filter-dropdown"]',
    filterTopic: '[data-testid="filter-topic"]',
    filterDifficulty: '[data-testid="filter-difficulty"]',
    filterStatus: '[data-testid="filter-status"]',
    clearFilters: '[data-testid="clear-filters"]',
    sortDropdown: '[data-testid="sort-dropdown"]',

    // Review elements
    reviewInterface: '[data-testid="review-interface"]',
    reviewCard: '[data-testid="review-card"]',
    reviewCompletionMessage: '[data-testid="review-completion-message"]',

    // Feedback elements
    successNotification: '[data-testid="success-notification"]',
    errorNotification: '[data-testid="error-notification"]',

    // Empty and loading states
    emptyState: '[data-testid="empty-concepts-state"]',
    loadingSpinner: '[data-testid="loading-spinner"]',

    // Pagination
    pagination: '[data-testid="pagination"]',
    nextPageButton: '[data-testid="next-page-button"]',
    prevPageButton: '[data-testid="prev-page-button"]',

    // Review-specific selectors for spaced repetition
    navKnowledgeReview: '[data-testid="nav-knowledge-review"]',
    navKnowledgeStats: '[data-testid="nav-knowledge-stats"]',
    startReviewButton: '[data-testid="start-review-button"]',
    reviewDashboard: '[data-testid="review-dashboard"]',
    reviewSession: '[data-testid="review-session"]',
    recallRating: (rating: number) => `[data-testid="recall-rating-${rating}"]`,
    submitReviewButton: '[data-testid="submit-review-button"]',
    reviewComplete: '[data-testid="review-complete"]',
    returnToDashboardButton: '[data-testid="return-to-dashboard-button"]',
    nextReviewDate: '[data-testid="next-review-date"]',
    reviewHistory: '[data-testid="review-history"]',
    knowledgeStatistics: '[data-testid="knowledge-statistics"]',
    reviewHistoryChart: '[data-testid="review-history-chart"]',
    recallPerformanceChart: '[data-testid="recall-performance-chart"]',
    conceptsByStatusChart: '[data-testid="concepts-by-status-chart"]',
    filterReviewStatus: '[data-testid="filter-review-status"]',
    filterStatusDue: '[data-testid="filter-status-due"]',
  };

  /**
   * Navigate to the concepts page
   */
  visitConcepts(): Cypress.Chainable<void> {
    return this.visitProtected('/concepts');
  }

  /**
   * Check if the concepts page is loaded
   */
  isConceptsPageLoaded(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.conceptsContainer);
  }

  /**
   * Wait for the concepts list to be loaded
   */
  waitForConceptsToLoad(timeout = 10000): Cypress.Chainable {
    return this.waitForElement(this.selectors.conceptsList, timeout);
  }

  /**
   * Get the number of concepts in the list
   */
  getConceptCount(): Cypress.Chainable<number> {
    return cy.get('body').then($body => {
      if ($body.find(this.selectors.conceptItem).length) {
        return cy.get(this.selectors.conceptItem).its('length');
      }
      return cy.wrap(0);
    });
  }

  /**
   * Search for a concept by title
   * @param searchTerm The search term to use
   */
  searchConcepts(searchTerm: string): void {
    this.type(this.selectors.searchInput, searchTerm);
    // Press enter to submit search
    cy.get(this.selectors.searchInput).type('{enter}');
  }

  /**
   * Filter concepts by category
   * @param category The category to filter by
   */
  filterByCategory(category: string): void {
    this.click(this.selectors.filterDropdown);
    cy.contains(category).click();
  }

  /**
   * Sort concepts by the specified criterion
   * @param sortBy The sort criterion (e.g., 'name', 'date')
   */
  sortConceptsBy(sortBy: string): void {
    this.click(this.selectors.sortDropdown);
    cy.contains(sortBy).click();
  }

  /**
   * Click on a concept by its title
   * @param conceptTitle The title of the concept to click
   */
  clickConcept(conceptTitle: string): void {
    cy.contains(this.selectors.conceptItem, conceptTitle).click();
  }

  /**
   * Click on the first concept in the list
   */
  clickFirstConcept(): void {
    this.elementExists(this.selectors.conceptItem).then(exists => {
      if (exists) {
        cy.get(this.selectors.conceptItem).first().click();
      } else {
        cy.log('No concepts found to click');
      }
    });
  }

  /**
   * Check if a concept exists by title
   * @param title The title to check for
   */
  verifyConceptExists(title: string): Cypress.Chainable<boolean> {
    return cy.get('body').then($body => {
      return $body.find(this.selectors.conceptsList).text().includes(title);
    });
  }

  /**
   * Check if concept detail is visible
   */
  isConceptDetailVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.conceptDetail);
  }

  /**
   * Open the form to create a new concept
   */
  clickAddConcept(): void {
    this.click(this.selectors.addConceptButton);
  }

  /**
   * Check if add concept button is available
   */
  isAddConceptButtonAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.addConceptButton);
  }

  /**
   * Check if the concept form is loaded properly
   */
  isConceptFormLoaded(): Cypress.Chainable<boolean> {
    return cy.get('body').then($body => {
      const hasTitleField = $body.find(this.selectors.conceptTitleInput).length > 0;
      const hasMarkdownEditor = $body.find(this.selectors.markdownEditor).length > 0;
      const hasSubmitButton = $body.find(this.selectors.submitButton).length > 0;
      return hasTitleField && hasMarkdownEditor && hasSubmitButton;
    });
  }

  /**
   * Fill the concept form with provided data
   * @param data The concept data to fill in
   */
  fillConceptForm(data: ConceptFormData): void {
    // Fill title
    this.type(this.selectors.conceptTitleInput, data.title);

    // Fill description if it exists and the field exists
    if (data.description) {
      this.elementExists(this.selectors.conceptDescriptionInput).then(exists => {
        if (exists) {
          this.type(this.selectors.conceptDescriptionInput, data.description as string);
        }
      });
    }

    // Fill content in markdown editor if it exists
    if (data.content) {
      this.elementExists(this.selectors.markdownEditor).then(exists => {
        if (exists) {
          this.type(this.selectors.markdownEditor, data.content as string);
        }
      });
    }

    // Select difficulty if provided
    if (data.difficulty) {
      this.elementExists(this.selectors.conceptDifficultySelect).then(exists => {
        if (exists) {
          this.click(this.selectors.conceptDifficultySelect);
          // Use the cy.get approach to avoid TypeScript errors
          cy.get(`[data-testid="concept-difficulty-${data.difficulty}"]`).click();
        }
      });
    }

    // Add topics if provided - ensures topics is defined and has length
    if (data.topics && data.topics.length > 0) {
      this.elementExists(this.selectors.conceptTopicsInput).then(exists => {
        if (exists) {
          // Ensure it's not undefined before iterating
          const topics = data.topics || [];
          topics.forEach(topic => {
            this.type(this.selectors.conceptTopicsInput, `${topic}{enter}`);
          });
        }
      });
    }

    // Select category if provided and the dropdown exists
    if (data.category) {
      this.elementExists(this.selectors.conceptCategorySelect).then(exists => {
        if (exists) {
          this.click(this.selectors.conceptCategorySelect);
          // Ensure category is defined for cy.contains
          cy.contains(data.category || '').click();
        }
      });
    }
  }

  /**
   * Submit the concept form
   */
  submitConceptForm(): void {
    this.click(this.selectors.submitButton);
  }

  /**
   * Verify success notification is displayed
   */
  verifySuccessNotification(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.successNotification).then(exists => {
      if (exists) {
        cy.get(this.selectors.successNotification).should('be.visible');
      }
      return exists;
    });
  }

  /**
   * Check if the edit button is available
   */
  isEditButtonAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.editConceptButton);
  }

  /**
   * Click the edit button
   */
  clickEditButton(): void {
    this.click(this.selectors.editConceptButton);
  }

  /**
   * Update the concept title
   * @param newTitle The new title for the concept
   */
  updateConceptTitle(newTitle: string): void {
    cy.get(this.selectors.conceptTitleInput).clear().type(newTitle);
  }

  /**
   * Update the concept content/markdown
   * @param newContent The new content for the concept
   */
  updateConceptContent(newContent: string): void {
    cy.get(this.selectors.markdownEditor).clear().type(newContent);
  }

  /**
   * Save the concept changes
   */
  saveConceptChanges(): void {
    this.submitConceptForm();
  }

  /**
   * Verify concept details match expected values
   * @param expected The expected concept details
   */
  verifyConceptDetails(expected: ConceptDetails): void {
    if (expected.title) {
      cy.get(this.selectors.conceptTitle).should('contain', expected.title);
    }

    if (expected.content) {
      cy.get(this.selectors.conceptContent).should('contain', expected.content);
    }
  }

  /**
   * Check if the delete button is available
   */
  isDeleteButtonAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.deleteConceptButton);
  }

  /**
   * Click the delete button
   */
  clickDeleteButton(): void {
    this.click(this.selectors.deleteConceptButton);
  }

  /**
   * Confirm deletion in the confirmation dialog
   */
  confirmDeletion(): void {
    this.click(this.selectors.confirmDeleteButton);
  }

  /**
   * Check if topic filter is available
   */
  isTopicFilterAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.filterTopic);
  }

  /**
   * Filter concepts by topic
   * @param topic The topic to filter by
   */
  filterByTopic(topic: string): void {
    this.click(this.selectors.filterTopic);
    // Use the direct get approach to avoid TypeScript errors
    cy.get(`[data-testid="filter-topic-${topic}"]`).click();
  }

  /**
   * Check if difficulty filter is available
   */
  isDifficultyFilterAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.filterDifficulty);
  }

  /**
   * Filter concepts by difficulty
   * @param difficulty The difficulty level to filter by
   */
  filterByDifficulty(difficulty: string): void {
    this.click(this.selectors.filterDifficulty);
    // Use the direct get approach to avoid TypeScript errors
    cy.get(`[data-testid="filter-difficulty-${difficulty}"]`).click();
  }

  /**
   * Check if status filter is available
   */
  isStatusFilterAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.filterStatus);
  }

  /**
   * Filter concepts by status
   * @param status The status to filter by
   */
  filterByStatus(status: string): void {
    this.click(this.selectors.filterStatus);
    // Use the direct get approach to avoid TypeScript errors
    cy.get(`[data-testid="filter-status-${status}"]`).click();
  }

  /**
   * Check if clear filters button is available
   */
  isClearFiltersAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.clearFilters);
  }

  /**
   * Clear all active filters
   */
  clearFilters(): void {
    this.click(this.selectors.clearFilters);
  }

  /**
   * Check if review button is available
   */
  isReviewButtonAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.reviewButton);
  }

  /**
   * Click the review button to start a review session
   */
  clickReviewButton(): void {
    this.click(this.selectors.reviewButton);
  }

  /**
   * Check if there are concepts available for review
   */
  hasConceptsToReview(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.reviewCard);
  }

  /**
   * Complete a review session by going through all available cards
   */
  completeReviewSession(): void {
    const answerCardAndContinue = () => {
      // Check if there are more cards to review
      this.elementExists(this.selectors.reviewCard).then(hasMoreCards => {
        if (hasMoreCards) {
          // Click the "Good" or similar button to mark the card as reviewed
          cy.get(this.selectors.reviewCard).find('button').contains(/good|correct|right|easy/i).click();

          // Recursively check for more cards
          answerCardAndContinue();
        }
      });
    };

    // Start the recursive process
    answerCardAndContinue();
  }

  /**
   * Verify that the review session has been completed
   */
  verifyReviewCompletion(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.reviewCompletionMessage).then(exists => {
      if (exists) {
        cy.get(this.selectors.reviewCompletionMessage).should('be.visible');
      }
      return exists;
    });
  }

  /**
   * Navigate to knowledge review page
   */
  visitKnowledgeReview(): Cypress.Chainable<void> {
    return this.visitProtected('/knowledge/review');
  }

  /**
   * Navigate to knowledge statistics page
   */
  visitKnowledgeStatistics(): Cypress.Chainable<void> {
    return this.visitProtected('/knowledge/statistics');
  }

  /**
   * Click on the review navigation link
   */
  navigateToReview(): void {
    this.click(this.selectors.navKnowledgeReview);
    cy.url().should('include', '/knowledge/review');
  }

  /**
   * Click on the statistics navigation link
   */
  navigateToStatistics(): void {
    this.click(this.selectors.navKnowledgeStats);
    cy.url().should('include', '/knowledge/statistics');
  }

  /**
   * Check if the review dashboard is visible
   */
  isReviewDashboardVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.reviewDashboard);
  }

  /**
   * Start a review session
   */
  startReviewSession(): void {
    this.click(this.selectors.startReviewButton);
    this.waitForElement(this.selectors.reviewSession);
  }

  /**
   * Check if the review session is visible
   */
  isReviewSessionVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.reviewSession);
  }

  /**
   * Rate concept recall with a rating from 1 (hard) to 5 (easy)
   * @param rating The recall rating (1-5)
   */
  rateConceptRecall(rating: number): void {
    if (rating < 1 || rating > 5) {
      cy.log('Invalid rating provided - should be 1-5');
      return;
    }
    this.click(this.selectors.recallRating(rating));
  }

  /**
   * Submit the review
   */
  submitReview(): void {
    this.click(this.selectors.submitReviewButton);
  }

  /**
   * Check if the review session is complete
   */
  isReviewComplete(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.reviewComplete);
  }

  /**
   * Return to dashboard after review completion
   */
  returnToDashboard(): void {
    this.click(this.selectors.returnToDashboardButton);
    cy.url().should('include', '/knowledge');
  }

  /**
   * Get the ID of the current visible concept
   */
  getCurrentConceptId(): Cypress.Chainable<string | null> {
    // Using aliases and a more direct approach
    let conceptId: string | null = null;

    // @ts-expect-error: Suppress type checking for this block since it works at runtime
    return cy
      .get('body')
      .then($body => {
        const $content = $body.find(this.selectors.conceptContent);
        if ($content.length > 0) {
          conceptId = $content.attr('data-concept-id') || null;
        }
      })
      .then(() => conceptId);
  }

  /**
   * Filter concepts by review status
   * @param status The status to filter by (e.g., 'due', 'upcoming', 'completed')
   */
  filterByReviewStatus(status: string): void {
    this.click(this.selectors.filterReviewStatus);
    cy.get(`[data-testid="filter-status-${status}"]`).click();
    cy.url().should('include', `status=${status}`);
  }

  /**
   * Check if statistics dashboard is visible
   */
  isStatisticsDashboardVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.knowledgeStatistics);
  }

  /**
   * Check if review history chart is visible
   */
  isReviewHistoryChartVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.reviewHistoryChart);
  }

  /**
   * Check if recall performance chart is visible
   */
  isRecallPerformanceChartVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.recallPerformanceChart);
  }

  /**
   * Check if concepts by status chart is visible
   */
  isConceptsByStatusChartVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.conceptsByStatusChart);
  }
}

// Export singleton instance
export const conceptsPage = new ConceptsPage();