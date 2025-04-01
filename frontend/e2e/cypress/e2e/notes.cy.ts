/**
 * Notes Management End-to-End Tests
 *
 * This file implements UI-based testing for the notes management functionality,
 * focusing on user interactions with the notes section of the application.
 *
 * Tests cover:
 * - Creating new notes
 * - Editing note content and tags
 * - Filtering notes by tag
 * - Searching notes
 * - Deleting notes
 * - Error states and edge cases
 */
import { NotesPage, authPage } from '../support/page-objects';

// Create a singleton instance of NotesPage
const notesPage = new NotesPage();

describe('Notes Management E2E Tests', () => {
  const username = 'test-user-cypress';
  const password = 'TestPassword123!';

  beforeEach(() => {
    cy.task('resetDatabase').then((success) => {
      if (!success) {
        cy.log('Database reset failed, proceeding with caution...');
      }
    });

    cy.clearCookies();
    cy.clearLocalStorage();

    cy.log(`Ensuring user ${username} exists via API...`);
    cy.registerUserApi({
        username: username,
        email: `${username}@example.com`,
        password: password,
        fullName: 'Test User Cypress'
    }).then((response) => {
        if (response.status === 200 || response.status === 201) {
            cy.log(`User ${username} created or endpoint confirmed existence.`);
        } else if (response.status === 400 && response.body && typeof response.body === 'object' && 'detail' in response.body && typeof response.body.detail === 'string' && response.body.detail.includes('already exists')) {
            cy.log(`User ${username} already existed.`);
        } else {
            cy.log(`Warning: registerUserApi responded with ${response.status}. Proceeding login attempt.`);
            console.error('registerUserApi unexpected response:', response.body);
        }
    });

    cy.log(`Logging in as ${username} via UI...`);
    authPage.visitLogin();
    cy.intercept('POST', '/api/auth/token').as('loginRequestNotes');
    authPage.login(username, password);
    cy.wait('@loginRequestNotes').its('response.statusCode').should('eq', 200);
    cy.log('UI Login successful.');

    notesPage.visitNotes();

    // Intercept API calls for notes with correct prefix
    cy.intercept('POST', '/api/notes').as('createNote');
    cy.intercept('GET', '/api/notes*').as('getNotes'); // Use wildcard for potential query params
    cy.intercept('PUT', '/api/notes/*').as('updateNote'); // Add intercept for PUT if needed
    cy.intercept('DELETE', '/api/notes/*').as('deleteNote');

    // Wait for the initial fetch to complete *before* checking if page loaded
    cy.wait('@getNotes');

    // Call page object methods to ensure elements are visible
    notesPage.isNotesPageLoaded();
    cy.log('Notes page loaded successfully after UI login.');

    cy.on('uncaught:exception', () => {
      return false;
    });
  });

  it('should support complete notes workflow', () => {
    // Verify page loaded and add button exists first
    notesPage.isNotesPageLoaded();
    notesPage.isAddNoteButtonAvailable();

    // Create a new note
    notesPage.clickAddNote();
    const noteTitle = `Test Note ${Date.now()}`;
    notesPage.fillNoteForm({
      title: noteTitle,
      content: 'This is a test note created by Cypress',
      tags: ['test', 'cypress']
    });
    notesPage.submitNoteForm();
    cy.wait('@createNote');
    // Verify success notification and note existence
    notesPage.verifySuccessNotification();
    notesPage.noteExists(noteTitle).should('exist');

    // Filter by tag - Re-intercept before clicking
    cy.intercept('GET', '/api/notes*').as('getNotes');
    notesPage.filterByTag('test');
    cy.wait('@getNotes'); // Wait specifically for the filter request
    cy.wait(200); // Add short wait for UI to settle
    notesPage.noteExists(noteTitle).should('exist');

    // Search for note - synchronous filtering now
    notesPage.searchNotes(noteTitle);
    cy.wait(100); // Add short wait for UI to settle
    notesPage.noteExists(noteTitle).should('exist');

    // Delete note
    notesPage.deleteNote(noteTitle);
    cy.wait('@deleteNote');
    // Verify success notification and note non-existence
    notesPage.verifySuccessNotification();
    notesPage.noteExists(noteTitle).should('not.exist');
  });

  it('should handle error states gracefully', () => {
    // Verify page loaded
    notesPage.isNotesPageLoaded();

    // Test empty form submission
    notesPage.clickAddNote();
    notesPage.submitNoteForm();
    // Check for either title or content error message (DOM check)
    cy.get('.text-red-600').should('be.visible');
    cy.wait(100); // Add small wait for stability

    // Click cancel to reset the form state
    cy.get('[data-testid="cancel-button"]').click();
    // Verify form is hidden (optional but good practice)
    cy.get('[data-testid="note-form"]').should('not.exist');

    // Test duplicate title error (intercept correct endpoint)
    cy.intercept('POST', '/api/notes', {
      statusCode: 409,
      body: { error: 'Note with this title already exists' }
    }).as('createDuplicateNote');

    notesPage.clickAddNote();
    notesPage.fillNoteForm({
      title: 'Duplicate Note',
      content: 'This should fail'
    });
    notesPage.submitNoteForm();
    cy.wait('@createDuplicateNote');
    // Verify error message in store state instead of DOM
    cy.getNotesStoreState().its('errorMessage').should('not.be.null');
    cy.getNotesStoreState().its('errorMessage').should('contain', 'already exists');
  });

  it('should support note organization', () => {
    notesPage.isNotesPageLoaded();

    const notes = [
      { title: `Note A ${Date.now()}`, content: 'Content A', tags: ['work', 'important'] },
      { title: `Note B ${Date.now()}`, content: 'Content B', tags: ['personal'] },
      { title: `Note C ${Date.now()}`, content: 'Content C', tags: ['work'] }
    ];

    // Create notes sequentially
    notes.forEach(note => {
      notesPage.clickAddNote();
      notesPage.fillNoteForm(note);
      notesPage.submitNoteForm();
      cy.wait('@createNote');
      // Verify success notification with increased timeout
      notesPage.verifySuccessNotification(15000);
      cy.wait(200); // Small wait for UI stability if needed
      // Ensure note is visible immediately after creation
      notesPage.noteExists(note.title).should('exist');
    });

    // Test tag filtering (directly filter without re-visiting)
    // notesPage.visitNotes(); // REMOVED: Don't re-visit page
    // cy.wait('@getNotes'); // REMOVED: No fetch triggered here
    // notesPage.isNotesPageLoaded(); // REMOVED: Already loaded

    notesPage.filterByTag('work'); // Use UI interaction

    // Ensure the "No notes found" message is NOT visible after filtering
    cy.contains('No notes found').should('not.exist');

    // Now wait for the note that SHOULD be visible after filtering to appear
    notesPage.noteExists(notes[0].title).should('exist');

    // Assert the others based on the filtering
    notesPage.noteExists(notes[1].title).should('not.exist');
    notesPage.noteExists(notes[2].title).should('exist');

    // Test search functionality - synchronous filtering now
    notesPage.searchNotes(notes[0].title);
    cy.wait(100); // Add short wait for UI to settle
    notesPage.noteExists(notes[0].title).should('exist');
  });

  it('should handle network errors gracefully', () => {
    notesPage.isNotesPageLoaded();

    cy.intercept('POST', '/api/notes', {
      statusCode: 500,
      body: { error: 'Internal server error' }
    }).as('createNoteError');

    notesPage.clickAddNote();
    notesPage.fillNoteForm({
      title: 'Network Error Test',
      content: 'This should fail'
    });
    notesPage.submitNoteForm();
    cy.wait('@createNoteError');
    // Verify error message in store state instead of DOM
    cy.getNotesStoreState().its('errorMessage').should('not.be.null');
    cy.getNotesStoreState().its('errorMessage').should('contain', 'Internal server error');
  });
});