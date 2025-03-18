import { setupAuthenticatedTest } from '../support/beforeEach';
import { seedGoals } from '../support/seedTestData';

describe('Learning Path Management', () => {
  beforeEach(() => {
    // Setup authenticated test and navigate to learning path page
    setupAuthenticatedTest('/learning-path');

    // Seed test goals
    seedGoals(5);
  });

  it('should display learning path overview', () => {
    // Check that learning path overview is displayed
    cy.get('[data-testid="learning-path-overview"]').should('be.visible');

    // Check that goals section is displayed
    cy.get('[data-testid="goals-section"]').should('be.visible');

    // Check that milestones section is displayed
    cy.get('[data-testid="milestones-section"]').should('be.visible');

    // Check that roadmap section is displayed
    cy.get('[data-testid="roadmap-section"]').should('be.visible');
  });

  it('should allow creating a new goal', () => {
    // Click on add goal button
    cy.get('[data-testid="add-goal"]').click();

    // Fill out the goal form
    const goalTitle = `Test Goal ${Date.now()}`;
    cy.get('input[name="title"]').type(goalTitle);
    cy.get('textarea[name="description"]').type('This is a test goal created by Cypress');

    // Set target date (1 month from now)
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 1);
    const formattedDate = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
    cy.get('input[name="target_date"]').type(formattedDate);

    cy.get('input[name="priority"]').clear().type('8');
    cy.get('input[name="category"]').type('Testing');

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Verify the goal was created
    cy.get('[data-testid="success-notification"]').should('be.visible');

    // Verify the goal appears in the list
    cy.get('[data-testid="goals-list"]').contains(goalTitle).should('be.visible');
  });

  it('should allow editing an existing goal', () => {
    // Find the first goal and click edit
    cy.get('[data-testid="goal-item"]').first().within(() => {
      cy.get('[data-testid="edit-goal"]').click();
    });

    // Update the goal title
    const updatedTitle = `Updated Goal ${Date.now()}`;
    cy.get('input[name="title"]').clear().type(updatedTitle);

    // Update the description
    cy.get('textarea[name="description"]').clear().type('This goal was updated by Cypress');

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Verify the goal was updated
    cy.get('[data-testid="success-notification"]').should('be.visible');

    // Verify the updated goal appears in the list
    cy.get('[data-testid="goals-list"]').contains(updatedTitle).should('be.visible');
  });

  it('should allow marking a goal as completed', () => {
    // Find the first goal and click complete
    cy.get('[data-testid="goal-item"]').first().within(() => {
      cy.get('[data-testid="complete-goal"]').click();
    });

    // Confirm completion
    cy.get('[data-testid="confirm-complete"]').click();

    // Verify the goal was marked as completed
    cy.get('[data-testid="success-notification"]').should('be.visible');

    // Verify the goal shows as completed in the list
    cy.get('[data-testid="goal-item"]').first().within(() => {
      cy.get('[data-testid="completed-badge"]').should('be.visible');
    });
  });

  it('should allow creating a new milestone', () => {
    // Click on milestones tab
    cy.get('[data-testid="milestones-tab"]').click();

    // Click on add milestone button
    cy.get('[data-testid="add-milestone"]').click();

    // Fill out the milestone form
    const milestoneTitle = `Test Milestone ${Date.now()}`;
    cy.get('input[name="title"]').type(milestoneTitle);
    cy.get('textarea[name="description"]').type('This is a test milestone created by Cypress');

    // Set target date (2 weeks from now)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14);
    const formattedDate = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
    cy.get('input[name="target_date"]').type(formattedDate);

    cy.get('input[name="verification_method"]').type('Cypress Test');

    // Add resources (assuming there are resources to select)
    cy.get('[data-testid="resource-selector"]').click();
    cy.get('[data-testid="resource-option"]').first().click();

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Verify the milestone was created
    cy.get('[data-testid="success-notification"]').should('be.visible');

    // Verify the milestone appears in the list
    cy.get('[data-testid="milestones-list"]').contains(milestoneTitle).should('be.visible');
  });

  it('should allow editing the roadmap', () => {
    // Click on roadmap tab
    cy.get('[data-testid="roadmap-tab"]').click();

    // Click on edit roadmap button
    cy.get('[data-testid="edit-roadmap"]').click();

    // Update the roadmap title
    const updatedTitle = `Updated Roadmap ${Date.now()}`;
    cy.get('input[name="title"]').clear().type(updatedTitle);

    // Update the description
    cy.get('textarea[name="description"]').clear().type('This roadmap was updated by Cypress');

    // Add a new phase
    cy.get('[data-testid="add-phase"]').click();
    cy.get('input[name="phases[0].title"]').clear().type('Phase 1: Testing');
    cy.get('textarea[name="phases[0].description"]').clear().type('First phase of testing');

    // Add an item to the phase
    cy.get('[data-testid="add-phase-item-0"]').click();
    cy.get('input[name="phases[0].items[0].title"]').clear().type('Learn Cypress');

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Verify the roadmap was updated
    cy.get('[data-testid="success-notification"]').should('be.visible');

    // Verify the updated roadmap appears
    cy.get('[data-testid="roadmap-title"]').contains(updatedTitle).should('be.visible');
  });

  it('should display learning path progress', () => {
    // Click on progress tab
    cy.get('[data-testid="progress-tab"]').click();

    // Verify progress charts are displayed
    cy.get('[data-testid="goals-progress-chart"]').should('be.visible');
    cy.get('[data-testid="milestones-progress-chart"]').should('be.visible');
    cy.get('[data-testid="roadmap-progress-chart"]').should('be.visible');

    // Test date range filter
    cy.get('[data-testid="date-range-selector"]').click();
    cy.get('[data-testid="date-range-last-month"]').click();

    // Verify charts are updated
    cy.get('[data-testid="goals-progress-chart"]').should('be.visible');
  });

  it('should allow deleting a goal', () => {
    // Get the title of the first goal
    let goalTitle;
    cy.get('[data-testid="goal-item"]').first().within(() => {
      cy.get('[data-testid="goal-title"]').invoke('text').then((text) => {
        goalTitle = text;
      });
    });

    // Find the first goal and click delete
    cy.get('[data-testid="goal-item"]').first().within(() => {
      cy.get('[data-testid="delete-goal"]').click();
    });

    // Confirm deletion
    cy.get('[data-testid="confirm-delete"]').click();

    // Verify the goal was deleted
    cy.get('[data-testid="success-notification"]').should('be.visible');

    // Verify the goal no longer appears in the list
    cy.get('[data-testid="goals-list"]').contains(goalTitle).should('not.exist');
  });
});