import { BasePage } from './BasePage';

interface NoteFormData {
  notes: string;
}

export class LibraryPage extends BasePage {
  public readonly selectors = {
    // Tabs
    centralLibraryTab: '[data-testid="central-library-tab"]',
    userResourcesTab: '[data-testid="user-resources-tab"]',

    // Resource Cards
    resourceCard: '[data-testid="resource-card"]',
    resourceTitle: '[data-testid="resource-title"]', // Assuming this exists within resource-card
    completedBadge: '[data-testid="completed-badge"]', // Assuming this exists within resource-card

    // Filter Sidebar
    filterSidebar: '[data-testid="filter-sidebar"]',
    searchInput: '[data-testid="library-search-input"]', // Assuming a specific testid
    topicsSection: '[data-testid="topics-filter-section"]', // Assuming wrapper testid
    topicCheckbox: (topic: string) => `[data-testid="topic-filter-${topic}"] input[type="checkbox"]`, // Assuming testid per topic
    topicLabel: (topic: string) => `[data-testid="topic-filter-${topic}"] label`, // Assuming testid per topic label
    resourceTypeSection: '[data-testid="resource-type-filter-section"]', // Assuming wrapper testid
    resourceTypeCheckbox: (type: string) => `[data-testid="resource-type-filter-${type}"] input[type="checkbox"]`,
    resourceTypeLabel: (type: string) => `[data-testid="resource-type-filter-${type}"] label`,
    difficultySection: '[data-testid="difficulty-filter-section"]', // Assuming wrapper testid
    difficultyCheckbox: (difficulty: string) => `[data-testid="difficulty-filter-${difficulty}"] input[type="checkbox"]`,
    difficultyLabel: (difficulty: string) => `[data-testid="difficulty-filter-${difficulty}"] label`,

    // Pagination
    paginationControls: '[data-testid="pagination-controls"]',
    previousPageButton: '[data-testid="pagination-previous-button"]', // Assuming specific testid
    nextPageButton: '[data-testid="pagination-next-button"]', // Assuming specific testid

    // Resource Card Actions
    markCompleteButton: '[data-testid="mark-complete-button"]', // Assuming specific testid
    addEditNoteButton: '[data-testid="add-edit-note-button"]', // Assuming specific testid

    // Note Dialog
    noteDialog: '[data-testid="note-dialog"]', // Assuming testid for the dialog container
    noteDialogTitle: '[data-testid="note-dialog-title"]',
    noteTextArea: '[data-testid="note-textarea"]', // Assuming testid
    saveNoteButton: '[data-testid="save-note-button"]', // Assuming testid
    cancelNoteButton: '[data-testid="cancel-note-button"]', // Assuming testid

    // General
    loadingSkeleton: '.animate-pulse', // Added selector for skeleton loaders
    loadingSpinner: '[data-testid="loading-spinner"]', // Standard loading indicator
    emptyStateMessage: '[data-testid="empty-state-message"]', // Standard empty state
    pageTitle: 'h1', // Generally safe to use h1 for page title

    // *** NEW Selectors for Add Resource Modal ***
    addResourceButton: '[data-testid="library-add-resource-button"]', // Button on My Resources view
    addResourceModal: '[data-testid="add-resource-modal"]',
    addUrlInput: '[data-testid="resource-url"]', // Assuming name attribute
    addTitleInput: '[data-testid="resource-title-input"]',
    addTypeSelect: '[data-testid="resource-type"]',
    addSummaryInput: '[data-testid="resource-description"]',
    addTopicsInput: '[data-testid="add-resource-modal"] [data-testid="resource-topics"]', // Use the correct data-testid
    addDifficultySelect: '[data-testid="resource-difficulty"]',
    addEstimatedTimeInput: '[data-testid="resource-estimated-time"]',
    submitAddResourceButton: '[data-testid="add-resource-modal"] button[type="submit"]', // Assuming type submit
    cancelAddResourceButton: '[data-testid="add-resource-modal"] button:contains("Cancel")', // Assuming text Cancel
    // Optional: Add selectors for metadata button if it exists in this form
    // extractMetadataButton: '[data-testid="add-resource-modal"] button:contains("Fetch Metadata")',
    // *** END NEW Selectors ***
  };

  /**
   * Navigate to the library page using protected navigation.
   */
  visitLibrary(): Cypress.Chainable<void> {
    return this.visitProtected('/library');
  }

   /**
   * Navigate to the library page via UI element (e.g., sidebar link)
   * Assumes a nav link with data-testid="nav-library" exists.
   */
  navigateToLibraryViaUI(): void {
    cy.get('[data-testid="nav-library"]', { timeout: 10000 })
      .should('be.visible')
      .click();
    cy.url().should('include', '/library');
    this.isLibraryPageLoaded(); // Verify page loaded after click
  }

  /**
   * Check if the main library page elements are loaded.
   */
  isLibraryPageLoaded(): Cypress.Chainable<boolean> {
    cy.contains(this.selectors.pageTitle, 'Resource Library').should('be.visible');
    this.elementExists(this.selectors.centralLibraryTab);
    this.elementExists(this.selectors.userResourcesTab);
    return this.elementExists(this.selectors.filterSidebar);
  }

  /**
   * Switch to the Central Library tab.
   */
  switchToCentralLibrary(): void {
    this.click(this.selectors.centralLibraryTab);
    cy.get(this.selectors.centralLibraryTab).should('have.class', 'bg-blue-600').and('have.class', 'text-white');
  }

  /**
   * Switch to the My Resources tab.
   */
  switchToMyResources(): void {
    this.click(this.selectors.userResourcesTab);
    cy.get(this.selectors.userResourcesTab).should('have.class', 'bg-blue-600').and('have.class', 'text-white');
  }

  /**
   * Get a specific resource card by its title.
   * @param title The title of the resource.
   */
  getResourceCardByTitle(title: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.contains(this.selectors.resourceCard, title);
  }

   /**
   * Checks if a resource card with the given title exists.
   * @param title The title of the resource.
   */
  resourceExists(title: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.contains(this.selectors.resourceCard, title).should('be.visible');
  }

  /**
   * Checks if a resource card with the given title does not exist.
   * @param title The title of the resource.
   */
  resourceDoesNotExist(title: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.contains(this.selectors.resourceCard, title).should('not.exist');
  }

  /**
   * Search for resources using the search input.
   * @param term The search term.
   * @param debounceWait Optional wait time in ms for debouncing. Defaults to 500ms.
   */
  searchResources(term: string, debounceWait: number = 500): void {
    if (term) {
        this.type(this.selectors.searchInput, term);
    } else {
        cy.get(this.selectors.searchInput).clear();
    }
    cy.wait(debounceWait); // Wait for potential debounce
  }

  /**
   * Check/uncheck a topic filter.
   * @param topic The topic name.
   * @param check True to check, false to uncheck.
   */
  toggleTopicFilter(topic: string, check: boolean = true): void {
    const wrapperSelector = `[data-testid="topic-filter-${topic}"]`;
    const checkbox = cy.get(wrapperSelector, { timeout: 7000 })
                       .should('exist') // Ensure wrapper exists first
                       .find('input[type="checkbox"]');
    if (check) {
      checkbox.check({ force: true });
    } else {
      checkbox.uncheck({ force: true });
    }
    // Add a small wait for potential UI updates/API calls after filtering
    cy.wait(500);
  }

   /**
   * Check/uncheck a resource type filter.
   * @param type The resource type name.
   * @param check True to check, false to uncheck.
   */
  toggleResourceTypeFilter(type: string, check: boolean = true): void {
    // Target the wrapper div, then find the checkbox inside
    const wrapperSelector = `[data-testid="resource-type-filter-${type}"]`;
    const checkbox = cy.get(wrapperSelector, { timeout: 7000 })
                       .should('exist') // Ensure wrapper exists first
                       .find('input[type="checkbox"]');
    if (check) {
      checkbox.check({ force: true });
    } else {
      checkbox.uncheck({ force: true });
    }
    // Add a small wait for potential UI updates/API calls after filtering
    cy.wait(500);
   }

   /**
    * Check/uncheck a difficulty filter.
    * @param difficulty The difficulty level.
    * @param check True to check, false to uncheck.
    */
   toggleDifficultyFilter(difficulty: string, check: boolean = true): void {
    // Target the wrapper div, then find the checkbox inside
    const wrapperSelector = `[data-testid="difficulty-filter-${difficulty}"]`;
    const checkbox = cy.get(wrapperSelector, { timeout: 7000 })
                       .should('exist') // Ensure wrapper exists first
                       .find('input[type="checkbox"]');
    if (check) {
      checkbox.check({ force: true });
    } else {
      checkbox.uncheck({ force: true });
    }
    // Add a small wait for potential UI updates/API calls after filtering
    cy.wait(500);
   }

  /**
   * Click the next page button. Assumes it's enabled.
   */
  goToNextPage(): void {
    this.click(this.selectors.nextPageButton);
  }

  /**
   * Click the previous page button. Assumes it's enabled.
   */
  goToPreviousPage(): void {
    this.click(this.selectors.previousPageButton);
  }

  /**
   * Assert pagination button state.
   * @param button 'next' or 'previous'
   * @param state 'enabled' or 'disabled'
   */
  checkPaginationButtonState(button: 'next' | 'previous', state: 'enabled' | 'disabled'): void {
    const selector = button === 'next' ? this.selectors.nextPageButton : this.selectors.previousPageButton;
    const condition = state === 'enabled' ? 'not.be.disabled' : 'be.disabled';
    cy.get(selector).should(condition);
  }

  /**
   * Mark a resource as complete by its title.
   * @param title The title of the resource.
   */
  markResourceComplete(title: string): void {
    this.getResourceCardByTitle(title)
      .find(this.selectors.markCompleteButton)
      .should('be.visible')
      .click();
  }

  /**
   * Mark a resource as incomplete by its title.
   * @param title The title of the resource.
   */
  markResourceIncomplete(title: string): void {
    this.getResourceCardByTitle(title)
      .find(this.selectors.markIncompleteButton)
      .should('be.visible')
      .click();
  }

  /**
   * Check if a resource is marked as complete by its title.
   * @param title The title of the resource.
   */
  isResourceCompleted(title: string): void {
    this.getResourceCardByTitle(title)
      .find(this.selectors.completedBadge)
      .should('be.visible');
    this.getResourceCardByTitle(title)
        .find(this.selectors.markCompleteButton)
        .should('contain.text', 'Completed'); // Example assertion based on text change
  }

  /**
   * Check if a resource is marked as incomplete by its title.
   * @param title The title of the resource.
   */
  isResourceIncomplete(title: string): void {
    this.getResourceCardByTitle(title)
      .find(this.selectors.completedBadge)
      .should('not.exist');
    this.getResourceCardByTitle(title)
        .find(this.selectors.markCompleteButton)
        .should('not.contain.text', 'Completed'); // Example
  }

  /**
   * Open the notes dialog for a resource by its title.
   * @param title The title of the resource.
   */
  openNotesDialog(title: string): void {
    this.getResourceCardByTitle(title)
      .find(this.selectors.addEditNoteButton)
      .should('be.visible')
      .click();
    cy.get(this.selectors.noteDialog).should('be.visible');
  }

  /**
   * Check the title of the currently open note dialog.
   * @param expectedTitle The expected title.
   */
  checkNoteDialogTitle(expectedTitle: string): void {
    cy.get(this.selectors.noteDialogTitle).should('contain.text', expectedTitle);
  }

  /**
   * Fill the notes text area in the dialog.
   * @param noteData The note content.
   */
  fillNotesForm(noteData: NoteFormData): void {
      cy.get(this.selectors.noteTextArea).clear().type(noteData.notes);
  }

  /**
   * Get the current value of the notes text area.
   */
  getNotesText(): Cypress.Chainable<string | number | string[]> {
      return cy.get(this.selectors.noteTextArea).invoke('val');
  }

  /**
   * Click the save button in the notes dialog.
   */
  saveNote(): void {
    this.click(this.selectors.saveNoteButton);
    cy.get(this.selectors.noteDialog).should('not.exist');
  }

  /**
   * Click the cancel button in the notes dialog.
   */
  cancelNote(): void {
    this.click(this.selectors.cancelNoteButton);
    cy.get(this.selectors.noteDialog).should('not.exist');
  }

  // --- *** NEW Methods for Add Resource Modal *** ---

  /**
   * Clicks the Add Resource button (visible on My Resources view).
   */
  clickAddResource(): void {
    cy.get(this.selectors.addResourceButton)
      .should('be.visible')
      .click();
  }

  /**
   * Checks if the Add Resource modal is visible.
   */
  isAddResourceModalVisible(): void {
    cy.get(this.selectors.addResourceModal).should('be.visible');
  }

  /**
   * Checks if the Add Resource modal is closed.
   */
  isAddResourceModalClosed(): void {
    cy.get(this.selectors.addResourceModal).should('not.exist');
  }

  /**
   * Fills the Add Resource form within the modal.
   * Requires ResourceCreateInput type to be available/imported.
   */
  fillAddResourceForm(resourceData: Partial<import('@/types/resource').ResourceCreateInput>): void {
    cy.log('Filling Add Resource form...');
    // URL
    if (resourceData.url) {
        cy.get(this.selectors.addUrlInput).type(resourceData.url);
        // Optional: Add interaction with metadata button if applicable
        // cy.get(this.selectors.extractMetadataButton).click();
        // cy.wait(1000); // Wait for metadata
    }
    // Title
    if (resourceData.title) {
        cy.get(this.selectors.addTitleInput).clear().type(resourceData.title);
    }
    // Type
    if (resourceData.type) {
        // Select by value directly
        cy.get(this.selectors.addTypeSelect).select(resourceData.type);
    }
    // Summary
    if (resourceData.summary) {
        cy.get(this.selectors.addSummaryInput).type(resourceData.summary);
    }
    // Difficulty
    if (resourceData.difficulty) {
        cy.get(this.selectors.addDifficultySelect).select(resourceData.difficulty);
    }
    // Estimated Time
    if (resourceData.estimated_time !== undefined) { // Check if the property exists (Reverted back to snake_case)
        cy.get(this.selectors.addEstimatedTimeInput)
          .type(resourceData.estimated_time.toString(), { force: true, delay: 50 });
    }
    // Topics (assuming react-select or similar - adjust selector/interaction)
    if (resourceData.topics && resourceData.topics.length > 0) {
        resourceData.topics.forEach((topic: string) => {
            cy.get(this.selectors.addTopicsInput).type(`${topic}{enter}`);
            cy.wait(50); // Small wait for tag to render
        });
    }
    cy.log('Add Resource form filled.');
  }

  /**
   * Clicks the submit button in the Add Resource modal.
   */
  submitAddResourceForm(): void {
    cy.get(this.selectors.submitAddResourceButton).click();
  }

  /**
   * Clicks the cancel button in the Add Resource modal.
   */
  cancelAddResourceForm(): void {
    cy.get(this.selectors.cancelAddResourceButton).click();
  }
  // --- *** END NEW Methods *** ---
}

// Export singleton instance
export const libraryPage = new LibraryPage();