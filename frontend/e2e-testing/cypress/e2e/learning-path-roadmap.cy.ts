import { setupAuthenticatedTest } from '../support/beforeEach';
import { seedGoals } from '../support/seedTestData';

describe('Learning Path - Roadmap Visualization', () => {
  beforeEach(() => {
    setupAuthenticatedTest('/learning-path');

    // Seed test goals
    seedGoals(5);

    // Reload the page to see the seeded goals
    cy.reload();
  });

  it('should display the learning path roadmap', () => {
    // Check that the roadmap visualization is displayed
    cy.get('[data-testid="roadmap-visualization"]').should('be.visible');

    // Check that the goals are displayed on the roadmap
    cy.get('[data-testid="roadmap-goal"]').should('have.length.at.least', 1);
  });

  it('should allow viewing goal details from the roadmap', () => {
    // Click on a goal in the roadmap
    cy.get('[data-testid="roadmap-goal"]').first().click();

    // Check that the goal details modal is displayed
    cy.get('[data-testid="goal-details-modal"]').should('be.visible');

    // Check that the goal title is displayed
    cy.get('[data-testid="goal-title"]').should('be.visible');

    // Check that the goal description is displayed
    cy.get('[data-testid="goal-description"]').should('be.visible');

    // Check that the goal deadline is displayed
    cy.get('[data-testid="goal-deadline"]').should('be.visible');

    // Check that the goal priority is displayed
    cy.get('[data-testid="goal-priority"]').should('be.visible');

    // Check that the goal status is displayed
    cy.get('[data-testid="goal-status"]').should('be.visible');

    // Close the modal
    cy.get('[data-testid="close-modal-button"]').click();
    cy.get('[data-testid="goal-details-modal"]').should('not.exist');
  });

  it('should allow updating goal status from the roadmap', () => {
    // Click on a goal in the roadmap
    cy.get('[data-testid="roadmap-goal"]').first().click();

    // Check that the goal details modal is displayed
    cy.get('[data-testid="goal-details-modal"]').should('be.visible');

    // Update the goal status
    cy.get('[data-testid="goal-status-select"]').click();
    cy.get('[data-testid="goal-status-in-progress"]').click();

    // Save the changes
    cy.get('[data-testid="save-goal-button"]').click();

    // Check that the modal is closed
    cy.get('[data-testid="goal-details-modal"]').should('not.exist');

    // Check that the goal status is updated in the roadmap
    cy.get('[data-testid="roadmap-goal"]').first().should('have.attr', 'data-status', 'in_progress');
  });

  it('should allow adding milestones to a goal', () => {
    // Click on a goal in the roadmap
    cy.get('[data-testid="roadmap-goal"]').first().click();

    // Check that the goal details modal is displayed
    cy.get('[data-testid="goal-details-modal"]').should('be.visible');

    // Click on the add milestone button
    cy.get('[data-testid="add-milestone-button"]').click();

    // Check that the add milestone form is displayed
    cy.get('[data-testid="add-milestone-form"]').should('be.visible');

    // Fill out the milestone form
    cy.get('[data-testid="milestone-title-input"]').type('Test Milestone');
    cy.get('[data-testid="milestone-description-input"]').type('Test milestone description');
    cy.get('[data-testid="milestone-deadline-input"]').type('2023-12-31');

    // Save the milestone
    cy.get('[data-testid="save-milestone-button"]').click();

    // Check that the milestone is added to the goal
    cy.get('[data-testid="milestone-list"]').should('contain', 'Test Milestone');
  });

  it('should allow filtering the roadmap by status', () => {
    // Check that the filter controls are displayed
    cy.get('[data-testid="roadmap-filters"]').should('be.visible');

    // Filter by status
    cy.get('[data-testid="filter-status"]').click();
    cy.get('[data-testid="filter-status-in-progress"]').click();

    // Check that the URL includes the filter parameter
    cy.url().should('include', 'status=in_progress');

    // Check that the filtered roadmap is displayed
    cy.get('[data-testid="roadmap-visualization"]').should('be.visible');
  });

  it('should allow filtering the roadmap by priority', () => {
    // Check that the filter controls are displayed
    cy.get('[data-testid="roadmap-filters"]').should('be.visible');

    // Filter by priority
    cy.get('[data-testid="filter-priority"]').click();
    cy.get('[data-testid="filter-priority-high"]').click();

    // Check that the URL includes the filter parameter
    cy.url().should('include', 'priority=high');

    // Check that the filtered roadmap is displayed
    cy.get('[data-testid="roadmap-visualization"]').should('be.visible');
  });

  it('should allow viewing the roadmap in timeline view', () => {
    // Check that the view controls are displayed
    cy.get('[data-testid="roadmap-view-controls"]').should('be.visible');

    // Switch to timeline view
    cy.get('[data-testid="view-timeline-button"]').click();

    // Check that the URL includes the view parameter
    cy.url().should('include', 'view=timeline');

    // Check that the timeline view is displayed
    cy.get('[data-testid="timeline-visualization"]').should('be.visible');

    // Check that the goals are displayed on the timeline
    cy.get('[data-testid="timeline-goal"]').should('have.length.at.least', 1);
  });
});