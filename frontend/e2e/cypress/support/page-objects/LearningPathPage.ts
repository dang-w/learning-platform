/**
 * Learning Path Page Object for learning path-related interactions
 * This class provides methods for interacting with the learning path page
 */

import { BasePage } from './BasePage';

export class LearningPathPage extends BasePage {
  // Define selectors as private constants
  private selectors = {
    // Main container elements
    learningPathContainer: '[data-testid="learning-path-overview"]',
    goalsSection: '[data-testid="goals-section"]',
    milestonesSection: '[data-testid="milestones-section"]',
    roadmapSection: '[data-testid="roadmap-section"]',

    // Navigation tabs
    goalsTab: '[data-testid="goals-tab"]',
    milestonesTab: '[data-testid="milestones-tab"]',
    roadmapTab: '[data-testid="roadmap-tab"]',
    progressTab: '[data-testid="progress-tab"]',

    // Goals elements
    goalsList: '[data-testid="goals-list"]',
    goalItem: '[data-testid="goal-item"]',
    goalTitle: '[data-testid="goal-title"]',
    addGoalButton: '[data-testid="add-goal"]',
    editGoalButton: '[data-testid="edit-goal"]',
    completeGoalButton: '[data-testid="complete-goal"]',
    confirmCompleteButton: '[data-testid="confirm-complete"]',
    deleteGoalButton: '[data-testid="delete-goal"]',
    confirmDeleteButton: '[data-testid="confirm-delete"]',
    completedBadge: '[data-testid="completed-badge"]',

    // Goal form elements
    goalForm: 'form',
    goalTitleInput: 'input[name="title"]',
    goalDescriptionInput: 'textarea[name="description"]',
    goalTargetDateInput: 'input[name="target_date"]',
    goalPriorityInput: 'input[name="priority"]',
    goalCategoryInput: 'input[name="category"]',
    submitButton: 'button[type="submit"]',

    // Milestones elements
    milestonesList: '[data-testid="milestones-list"]',
    milestoneItem: '[data-testid="milestone-item"]',
    milestoneTitle: '[data-testid="milestone-title"]',
    addMilestoneButton: '[data-testid="add-milestone"]',
    resourceSelector: '[data-testid="resource-selector"]',
    resourceOption: '[data-testid="resource-option"]',

    // Roadmap elements
    roadmapTitle: '[data-testid="roadmap-title"]',
    editRoadmapButton: '[data-testid="edit-roadmap"]',
    addPhaseButton: '[data-testid="add-phase"]',
    phaseTitle: 'input[name="phases[0].title"]',
    phaseDescription: 'textarea[name="phases[0].description"]',
    addPhaseItemButton: '[data-testid="add-phase-item-0"]',
    phaseItemTitle: 'input[name="phases[0].items[0].title"]',

    // Progress elements
    goalsProgressChart: '[data-testid="goals-progress-chart"]',
    milestonesProgressChart: '[data-testid="milestones-progress-chart"]',
    roadmapProgressChart: '[data-testid="roadmap-progress-chart"]',
    dateRangeSelector: '[data-testid="date-range-selector"]',
    dateRangeLastMonth: '[data-testid="date-range-last-month"]',

    // Notifications
    successNotification: '[data-testid="success-notification"]',
    errorNotification: '[data-testid="error-notification"]',

    // Roadmap Visualization Elements
    roadmapVisualization: '[data-testid="roadmap-visualization"]',
    roadmapGoal: '[data-testid="roadmap-goal"]',
    goalDetailsModal: '[data-testid="goal-details-modal"]',
    closeModalButton: '[data-testid="close-modal-button"]',
    goalDescription: '[data-testid="goal-description"]',
    goalDeadline: '[data-testid="goal-deadline"]',
    goalPriority: '[data-testid="goal-priority"]',
    goalStatus: '[data-testid="goal-status"]',

    // Goal Status Update
    goalStatusSelect: '[data-testid="goal-status-select"]',
    goalStatusInProgress: '[data-testid="goal-status-in-progress"]',
    saveGoalButton: '[data-testid="save-goal-button"]',

    // Milestone Management in Goal Modal
    addMilestoneButton2: '[data-testid="add-milestone-button"]',
    addMilestoneForm: '[data-testid="add-milestone-form"]',
    milestoneTitleInput: '[data-testid="milestone-title-input"]',
    milestoneDescriptionInput: '[data-testid="milestone-description-input"]',
    milestoneDeadlineInput: '[data-testid="milestone-deadline-input"]',
    saveMilestoneButton: '[data-testid="save-milestone-button"]',

    // Roadmap Filters
    roadmapFilters: '[data-testid="roadmap-filters"]',
    filterStatus: '[data-testid="filter-status"]',
    filterStatusInProgress: '[data-testid="filter-status-in-progress"]',
    filterPriority: '[data-testid="filter-priority"]',
    filterPriorityHigh: '[data-testid="filter-priority-high"]',

    // Roadmap View Controls
    roadmapViewControls: '[data-testid="roadmap-view-controls"]',
    viewTimelineButton: '[data-testid="view-timeline-button"]',
    timelineVisualization: '[data-testid="timeline-visualization"]',
    timelineGoal: '[data-testid="timeline-goal"]'
  };

  /**
   * Navigate to the learning path page
   */
  visitLearningPath(): Cypress.Chainable<void> {
    return this.visitProtected('/learning-path');
  }

  /**
   * Check if the learning path page is loaded by waiting for the main container to be visible
   */
  isLearningPathLoaded(): Cypress.Chainable<unknown> {
    return this.waitForElement(this.selectors.learningPathContainer);
  }

  /**
   * Switch to goals tab
   */
  goToGoalsTab(): void {
    this.click(this.selectors.goalsTab);
  }

  /**
   * Switch to milestones tab
   */
  goToMilestonesTab(): void {
    this.click(this.selectors.milestonesTab);
  }

  /**
   * Switch to roadmap tab
   */
  goToRoadmapTab(): void {
    this.click(this.selectors.roadmapTab);
  }

  /**
   * Switch to progress tab
   */
  goToProgressTab(): void {
    this.click(this.selectors.progressTab);
  }

  /**
   * Check if goals section is visible
   */
  isGoalsSectionVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.goalsSection);
  }

  /**
   * Check if milestones section is visible
   */
  isMilestonesSectionVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.milestonesSection);
  }

  /**
   * Check if roadmap section is visible
   */
  isRoadmapSectionVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.roadmapSection);
  }

  /**
   * Click the add goal button
   */
  clickAddGoal(): void {
    this.click(this.selectors.addGoalButton);
  }

  /**
   * Fill out the goal form
   * @param goalData The goal data to fill in
   */
  fillGoalForm(goalData: {
    title: string;
    description?: string;
    targetDate?: string;
    priority?: string;
    category?: string;
  }): void {
    // Fill title
    this.type(this.selectors.goalTitleInput, goalData.title);

    // Fill description if provided
    if (goalData.description) {
      this.type(this.selectors.goalDescriptionInput, goalData.description);
    }

    // Fill target date if provided
    if (goalData.targetDate) {
      this.type(this.selectors.goalTargetDateInput, goalData.targetDate);
    }

    // Fill priority if provided
    if (goalData.priority) {
      cy.get(this.selectors.goalPriorityInput).clear();
      this.type(this.selectors.goalPriorityInput, goalData.priority);
    }

    // Fill category if provided
    if (goalData.category) {
      this.type(this.selectors.goalCategoryInput, goalData.category);
    }
  }

  /**
   * Submit the current form
   */
  submitForm(): void {
    this.click(this.selectors.submitButton);
  }

  /**
   * Create a new goal
   * @param goalData The goal data
   */
  createGoal(goalData: {
    title: string;
    description?: string;
    targetDate?: string;
    priority?: string;
    category?: string;
  }): void {
    this.clickAddGoal();
    this.fillGoalForm(goalData);
    this.submitForm();

    // Take a screenshot for documentation
    this.takeScreenshot('goal-created');
  }

  /**
   * Edit the first goal in the list
   * @param goalData The updated goal data
   */
  editFirstGoal(goalData: {
    title: string;
    description?: string;
    targetDate?: string;
    priority?: string;
    category?: string;
  }): void {
    // Click edit on the first goal
    cy.get(this.selectors.goalItem).first().within(() => {
      cy.get(this.selectors.editGoalButton).click();
    });

    // Clear existing inputs
    cy.get(this.selectors.goalTitleInput).clear();
    cy.get(this.selectors.goalDescriptionInput).clear();

    // Fill the form with new data
    this.fillGoalForm(goalData);
    this.submitForm();

    // Take a screenshot for documentation
    this.takeScreenshot('goal-edited');
  }

  /**
   * Mark the first goal as completed
   */
  completeFirstGoal(): void {
    // Click complete on the first goal
    cy.get(this.selectors.goalItem).first().within(() => {
      cy.get(this.selectors.completeGoalButton).click();
    });

    // Confirm completion
    this.click(this.selectors.confirmCompleteButton);

    // Take a screenshot for documentation
    this.takeScreenshot('goal-completed');
  }

  /**
   * Delete the first goal
   */
  deleteFirstGoal(): void {
    // Click delete on the first goal
    cy.get(this.selectors.goalItem).first().within(() => {
      cy.get(this.selectors.deleteGoalButton).click();
    });

    // Confirm deletion
    this.click(this.selectors.confirmDeleteButton);

    // Take a screenshot for documentation
    this.takeScreenshot('goal-deleted');
  }

  /**
   * Check if a goal with the given title exists
   * @param title The goal title to check for
   * @returns Chainable boolean indicating if the goal exists
   */
  goalExists(title: string): Cypress.Chainable<boolean> {
    return cy.get('body').then($body => {
      return $body.find(this.selectors.goalsList).text().includes(title);
    });
  }

  /**
   * Click the add milestone button
   */
  clickAddMilestone(): void {
    this.click(this.selectors.addMilestoneButton);
  }

  /**
   * Fill out the milestone form
   * @param milestoneData The milestone data to fill in
   */
  fillMilestoneForm(milestoneData: {
    title: string;
    description?: string;
    targetDate?: string;
    verificationMethod?: string;
    selectFirstResource?: boolean;
  }): void {
    // Fill title
    this.type(this.selectors.goalTitleInput, milestoneData.title);

    // Fill description if provided
    if (milestoneData.description) {
      this.type(this.selectors.goalDescriptionInput, milestoneData.description);
    }

    // Fill target date if provided
    if (milestoneData.targetDate) {
      this.type(this.selectors.goalTargetDateInput, milestoneData.targetDate);
    }

    // Fill verification method if provided
    if (milestoneData.verificationMethod) {
      this.type('input[name="verification_method"]', milestoneData.verificationMethod);
    }

    // Select first resource if requested
    if (milestoneData.selectFirstResource) {
      this.click(this.selectors.resourceSelector);
      this.click(this.selectors.resourceOption);
    }
  }

  /**
   * Create a new milestone
   * @param milestoneData The milestone data
   */
  createMilestone(milestoneData: {
    title: string;
    description?: string;
    targetDate?: string;
    verificationMethod?: string;
    selectFirstResource?: boolean;
  }): void {
    this.goToMilestonesTab();
    this.clickAddMilestone();
    this.fillMilestoneForm(milestoneData);
    this.submitForm();

    // Take a screenshot for documentation
    this.takeScreenshot('milestone-created');
  }

  /**
   * Click the edit roadmap button
   */
  clickEditRoadmap(): void {
    this.goToRoadmapTab();
    this.click(this.selectors.editRoadmapButton);
  }

  /**
   * Edit the roadmap
   * @param roadmapData The roadmap data
   */
  editRoadmap(roadmapData: {
    title: string;
    description?: string;
    addPhase?: boolean;
    phaseTitle?: string;
    phaseDescription?: string;
    addPhaseItem?: boolean;
    phaseItemTitle?: string;
  }): void {
    this.clickEditRoadmap();

    // Clear existing inputs
    cy.get(this.selectors.goalTitleInput).clear();
    cy.get(this.selectors.goalDescriptionInput).clear();

    // Fill the form with new data
    this.type(this.selectors.goalTitleInput, roadmapData.title);

    if (roadmapData.description) {
      this.type(this.selectors.goalDescriptionInput, roadmapData.description);
    }

    // Add phase if requested
    if (roadmapData.addPhase) {
      this.click(this.selectors.addPhaseButton);

      if (roadmapData.phaseTitle) {
        cy.get(this.selectors.phaseTitle).clear();
        this.type(this.selectors.phaseTitle, roadmapData.phaseTitle);
      }

      if (roadmapData.phaseDescription) {
        cy.get(this.selectors.phaseDescription).clear();
        this.type(this.selectors.phaseDescription, roadmapData.phaseDescription);
      }

      // Add phase item if requested
      if (roadmapData.addPhaseItem && roadmapData.phaseItemTitle) {
        this.click(this.selectors.addPhaseItemButton);
        cy.get(this.selectors.phaseItemTitle).clear();
        this.type(this.selectors.phaseItemTitle, roadmapData.phaseItemTitle);
      }
    }

    this.submitForm();

    // Take a screenshot for documentation
    this.takeScreenshot('roadmap-edited');
  }

  /**
   * Check if learning path progress charts are visible
   */
  areProgressChartsVisible(): Cypress.Chainable<boolean> {
    return cy.get('body').then($body => {
      const hasGoalsChart = $body.find(this.selectors.goalsProgressChart).length > 0;
      const hasMilestonesChart = $body.find(this.selectors.milestonesProgressChart).length > 0;
      const hasRoadmapChart = $body.find(this.selectors.roadmapProgressChart).length > 0;

      return hasGoalsChart && hasMilestonesChart && hasRoadmapChart;
    });
  }

  /**
   * Filter progress by last month
   */
  filterProgressByLastMonth(): void {
    this.click(this.selectors.dateRangeSelector);
    this.click(this.selectors.dateRangeLastMonth);

    // Take a screenshot for documentation
    this.takeScreenshot('progress-filtered-by-month');
  }

  /**
   * Check if a success notification is displayed
   */
  hasSuccessNotification(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.successNotification);
  }

  /**
   * Check if roadmap visualization is visible
   */
  isRoadmapVisualizationVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.roadmapVisualization);
  }

  /**
   * Get the number of goals displayed on the roadmap
   */
  getRoadmapGoalsCount(): Cypress.Chainable<number> {
    return cy.get(this.selectors.roadmapGoal).its('length');
  }

  /**
   * Click on the first goal in the roadmap
   */
  clickFirstRoadmapGoal(): void {
    cy.get(this.selectors.roadmapGoal).first().click();
    this.takeScreenshot('clicked-roadmap-goal');
  }

  /**
   * Check if goal details modal is visible
   */
  isGoalDetailsModalVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.goalDetailsModal);
  }

  /**
   * Check if all goal details are displayed in the modal
   */
  areGoalDetailsDisplayed(): Cypress.Chainable<boolean> {
    return cy.get('body').then($body => {
      const hasTitle = $body.find(this.selectors.goalTitle).length > 0;
      const hasDescription = $body.find(this.selectors.goalDescription).length > 0;
      const hasDeadline = $body.find(this.selectors.goalDeadline).length > 0;
      const hasPriority = $body.find(this.selectors.goalPriority).length > 0;
      const hasStatus = $body.find(this.selectors.goalStatus).length > 0;

      return hasTitle && hasDescription && hasDeadline && hasPriority && hasStatus;
    });
  }

  /**
   * Close the goal details modal
   */
  closeGoalDetailsModal(): void {
    this.click(this.selectors.closeModalButton);
    this.takeScreenshot('closed-goal-modal');
  }

  /**
   * Update the goal status to in-progress
   */
  updateGoalStatusToInProgress(): void {
    this.click(this.selectors.goalStatusSelect);
    this.click(this.selectors.goalStatusInProgress);
    this.click(this.selectors.saveGoalButton);
    this.takeScreenshot('updated-goal-status');
  }

  /**
   * Check if the first roadmap goal has a specific status
   * @param status The status to check for
   */
  firstRoadmapGoalHasStatus(status: string): Cypress.Chainable<boolean> {
    return cy.get(this.selectors.roadmapGoal).first().invoke('attr', 'data-status').then(attrValue => {
      return attrValue === status;
    });
  }

  /**
   * Add a milestone to the current goal in the modal
   * @param milestoneData The milestone data to add
   */
  addMilestoneToGoal(milestoneData: {
    title: string;
    description?: string;
    deadline?: string;
  }): void {
    this.click(this.selectors.addMilestoneButton2);

    // Check if the form appeared
    this.elementExists(this.selectors.addMilestoneForm).then(exists => {
      if (!exists) {
        cy.log('Add milestone form did not appear');
        this.takeScreenshot('milestone-form-not-found');
        return;
      }

      // Fill out the form
      this.type(this.selectors.milestoneTitleInput, milestoneData.title);

      if (milestoneData.description) {
        this.type(this.selectors.milestoneDescriptionInput, milestoneData.description);
      }

      if (milestoneData.deadline) {
        this.type(this.selectors.milestoneDeadlineInput, milestoneData.deadline);
      }

      // Save the milestone
      this.click(this.selectors.saveMilestoneButton);
      this.takeScreenshot('milestone-added');
    });
  }

  /**
   * Check if a milestone with the given title exists in the milestone list
   * @param title The milestone title to check for
   */
  milestoneExists(title: string): Cypress.Chainable<boolean> {
    return cy.get('body').then($body => {
      return $body.find(this.selectors.milestonesList).text().includes(title);
    });
  }

  /**
   * Filter the roadmap by status (in-progress)
   */
  filterRoadmapByInProgressStatus(): void {
    this.click(this.selectors.filterStatus);
    this.click(this.selectors.filterStatusInProgress);
    this.takeScreenshot('filtered-by-status');
  }

  /**
   * Filter the roadmap by priority (high)
   */
  filterRoadmapByHighPriority(): void {
    this.click(this.selectors.filterPriority);
    this.click(this.selectors.filterPriorityHigh);
    this.takeScreenshot('filtered-by-priority');
  }

  /**
   * Switch to timeline view
   */
  switchToTimelineView(): void {
    this.click(this.selectors.viewTimelineButton);
    this.takeScreenshot('timeline-view');
  }

  /**
   * Check if timeline visualization is visible
   */
  isTimelineVisualizationVisible(): Cypress.Chainable<boolean> {
    return this.elementExists(this.selectors.timelineVisualization);
  }

  /**
   * Get the number of goals displayed on the timeline
   */
  getTimelineGoalsCount(): Cypress.Chainable<number> {
    return cy.get(this.selectors.timelineGoal).its('length');
  }
}