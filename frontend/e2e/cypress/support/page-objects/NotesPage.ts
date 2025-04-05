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
  visitNotes(): void {
    this.visitProtected('/notes');
  }

  /**
   * Check if notes page has loaded by waiting for the container
   */
  isNotesPageLoaded(): Cypress.Chainable<unknown> {
    return this.waitForElement(this.selectors.notesPage);
  }

  /**
   * Check if add note button is available by waiting for it
   */
  isAddNoteButtonAvailable(): Cypress.Chainable<unknown> {
    return this.waitForElement(this.selectors.addNoteButton);
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
    // Removed explicit wait for list - Test should wait for @getNotes and then verify list/notes
  }

  /**
   * Search notes
   */
  searchNotes(query: string): void {
    this.type(this.selectors.searchInput, query);
    // Removed fixed wait - test should wait for @getNotes interception
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
   * Check if a note exists by title using cy.contains within the page
   * Returns a chainable that can be asserted with .should('exist') or .should('not.exist')
   */
  noteExists(title: string): Cypress.Chainable<JQuery<HTMLElement>> {
    // Search within the main notes page container
    return cy.get(this.selectors.notesPage)
             .contains(this.selectors.noteItem, title, { timeout: 7000 });
  }

  /**
   * Verify success notification is shown by waiting for it
   * @param timeout Optional timeout in ms
   */
  verifySuccessNotification(timeout = 10000): Cypress.Chainable<unknown> {
    return this.waitForElement(this.selectors.successNotification, timeout);
  }

  /**
   * Verify error notification is shown by waiting for it
   * @param timeout Optional timeout in ms
   */
  verifyErrorNotification(timeout = 10000): Cypress.Chainable<unknown> {
    return this.waitForElement(this.selectors.errorNotification, timeout);
  }

  /**
   * Take a screenshot with notes prefix
   */
  takeScreenshot(name: string): void {
    cy.screenshot(`notes-${name}`);
  }
}