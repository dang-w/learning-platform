import { BasePage } from './BasePage';

interface NoteFormData {
  title: string;
  content: string;
  tags?: string[];
}

export class NotesPage extends BasePage {
  // Selectors for note-related elements
  private selectors = {
    // Page elements
    notesPage: '[data-testid="notes-page"]',
    notesList: '[data-testid="notes-list"]',
    noteItem: '[data-testid="note-item"]',
    emptyState: '[data-testid="empty-state"]',

    // Note form elements
    noteForm: '[data-testid="note-form"]',
    titleInput: '[data-testid="note-title-input"]',
    contentInput: '[data-testid="note-content-input"]',
    tagsInput: '[data-testid="note-tags-input"]',
    tagItem: (tag: string) => `[data-testid="tag-${tag}"]`,
    formError: '[data-testid="form-error"]',

    // Action buttons
    addNoteButton: '[data-testid="add-note-button"]',
    saveNoteButton: '[data-testid="save-note-button"]',
    editNoteButton: '[data-testid="edit-note-button"]',
    deleteNoteButton: '[data-testid="delete-note-button"]',
    confirmDeleteButton: '[data-testid="confirm-delete-button"]',

    // Filters and search
    searchInput: '[data-testid="notes-search-input"]',
    tagFilter: (tag: string) => `[data-testid="tag-option-${tag}"]`,
    clearFilters: '[data-testid="clear-filters"]',

    // Notifications
    successNotification: '[data-testid="success-notification"]',
    errorNotification: '[data-testid="error-notification"]'
  };

  /**
   * Navigate to notes page with resilient handling
   */
  visitNotes(): Cypress.Chainable<void> {
    return this.visitProtected('/notes');
  }

  /**
   * Check if notes page has loaded
   */
  isNotesPageLoaded(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.notesPage);
  }

  /**
   * Check if add note button is available
   */
  isAddNoteButtonAvailable(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.addNoteButton);
  }

  /**
   * Click the add note button
   */
  clickAddNote(): void {
    this.click(this.selectors.addNoteButton);
    // Wait for form to be visible
    cy.get(this.selectors.noteForm, { timeout: 10000 }).should('be.visible');
  }

  /**
   * Fill the note form with provided data
   */
  fillNoteForm(noteData: NoteFormData): void {
    // Fill title
    this.type(this.selectors.titleInput, noteData.title);

    // Fill content
    this.type(this.selectors.contentInput, noteData.content);

    // Add tags if provided
    if (noteData.tags && noteData.tags.length > 0) {
      noteData.tags.forEach(tag => {
        this.type(this.selectors.tagsInput, `${tag}{enter}`);
        // Wait for tag to appear
        cy.get(this.selectors.tagItem(tag)).should('be.visible');
      });
    }
  }

  /**
   * Submit the note form
   */
  submitNoteForm(): void {
    this.click(this.selectors.saveNoteButton);
  }

  /**
   * Filter notes by tag
   */
  filterByTag(tag: string): void {
    this.click(this.selectors.tagFilter(tag));
    // Wait for filtered results
    cy.get(this.selectors.notesList).should('exist');
  }

  /**
   * Search notes
   */
  searchNotes(query: string): void {
    this.type(this.selectors.searchInput, query);
    // Wait for search results to update
    cy.wait(500); // Allow for debounce
  }

  /**
   * Delete a note by title
   */
  deleteNote(title: string): void {
    cy.contains(this.selectors.noteItem, title)
      .find(this.selectors.deleteNoteButton)
      .click();
    this.click(this.selectors.confirmDeleteButton);
  }

  /**
   * Check if a note exists by title
   */
  noteExists(title: string): Cypress.Chainable<boolean> {
    return cy.get('body').then($body => {
      return $body.find(this.selectors.notesList).text().includes(title);
    });
  }

  /**
   * Verify success notification is shown
   */
  verifySuccessNotification(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.successNotification);
  }

  /**
   * Verify error notification is shown
   */
  verifyErrorNotification(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.errorNotification);
  }

  /**
   * Take a screenshot with notes prefix
   */
  takeScreenshot(name: string): void {
    cy.screenshot(`notes-${name}`);
  }
}