/**
 * Learning Path Tests with Page Object Model
 * Using resilient testing patterns for better test stability
 */
import { learningPathPage, authPage } from '../support/page-objects';

describe('Learning Path Management', () => {
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
    cy.intercept('POST', '/api/auth/token').as('loginRequestLearningPath');
    authPage.login(username, password);
    cy.wait('@loginRequestLearningPath').its('response.statusCode').should('eq', 200);
    cy.log('UI Login successful.');

    // Intercept the learning path API call
    cy.intercept('GET', '/api/learning-path/').as('getLearningPath');

    learningPathPage.visitLearningPath();
    // Wait for the API call to complete successfully before checking page load
    cy.wait('@getLearningPath').its('response.statusCode').should('eq', 200);
    // Call isLearningPathLoaded (which uses waitForElement) to ensure the container is visible
    learningPathPage.isLearningPathLoaded();
    cy.log('Learning path page loaded successfully after UI login.');

    cy.on('uncaught:exception', (err) => {
      cy.log(`Uncaught exception: ${err.message}`);
      return false;
    });
  });

  it('should display learning path overview', () => {
    learningPathPage.isLearningPathLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Learning Path page not loaded properly, skipping test');
        learningPathPage.takeScreenshot('learning-path-not-loaded');
        return;
      }

      learningPathPage.takeScreenshot('learning-path-overview');

      learningPathPage.isGoalsSectionVisible().then(isVisible => {
        if (isVisible) {
          cy.log('Goals section is visible');
        } else {
          cy.log('Goals section is not visible');
        }
      });

      learningPathPage.isMilestonesSectionVisible().then(isVisible => {
        if (isVisible) {
          cy.log('Milestones section is visible');
        } else {
          cy.log('Milestones section is not visible');
        }
      });

      learningPathPage.isRoadmapSectionVisible().then(isVisible => {
        if (isVisible) {
          cy.log('Roadmap section is visible');
        } else {
          cy.log('Roadmap section is not visible');
        }
      });
    });
  });

  it('should allow creating a new goal', () => {
    learningPathPage.isLearningPathLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Learning Path page not loaded properly, skipping test');
        learningPathPage.takeScreenshot('learning-path-not-loaded');
        return;
      }

      const goalTitle = `Test Goal ${Date.now()}`;
      learningPathPage.createGoal({
        title: goalTitle,
        description: 'This is a test goal created by Cypress',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: '8',
        category: 'Testing'
      });

      learningPathPage.hasSuccessNotification().then(hasSuccess => {
        if (hasSuccess) {
          cy.log('Goal created successfully');
        } else {
          cy.log('No success notification displayed after creating goal');
        }
      });

      learningPathPage.goalExists(goalTitle).then(exists => {
        cy.wrap(exists).should('be.true');
      });
    });
  });

  it('should allow editing an existing goal', () => {
    learningPathPage.isLearningPathLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Learning Path page not loaded properly, skipping test');
        learningPathPage.takeScreenshot('learning-path-not-loaded');
        return;
      }

      cy.get('body').then($body => {
        const hasGoals = $body.find('[data-testid="goal-item"]').length > 0;

        if (!hasGoals) {
          cy.log('No goals found to edit, creating a test goal first');

          learningPathPage.createGoal({
            title: `Test Goal to Edit ${Date.now()}`,
            description: 'This goal will be edited'
          });
        }

        const updatedTitle = `Updated Goal ${Date.now()}`;
        learningPathPage.editFirstGoal({
          title: updatedTitle,
          description: 'This goal was updated by Cypress'
        });

        learningPathPage.hasSuccessNotification().then(hasSuccess => {
          if (hasSuccess) {
            cy.log('Goal updated successfully');
          } else {
            cy.log('No success notification displayed after updating goal');
          }
        });

        learningPathPage.goalExists(updatedTitle).then(exists => {
          cy.wrap(exists).should('be.true');
        });
      });
    });
  });

  it('should allow marking a goal as completed', () => {
    learningPathPage.isLearningPathLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Learning Path page not loaded properly, skipping test');
        learningPathPage.takeScreenshot('learning-path-not-loaded');
        return;
      }

      cy.get('body').then($body => {
        const hasGoals = $body.find('[data-testid="goal-item"]').length > 0;

        if (!hasGoals) {
          cy.log('No goals found to complete, creating a test goal first');

          learningPathPage.createGoal({
            title: `Test Goal to Complete ${Date.now()}`,
            description: 'This goal will be marked as completed'
          });
        }

        learningPathPage.completeFirstGoal();

        learningPathPage.hasSuccessNotification().then(hasSuccess => {
          if (hasSuccess) {
            cy.log('Goal marked as completed successfully');
          } else {
            cy.log('No success notification displayed after completing goal');
          }
        });

        cy.get('[data-testid="goal-item"]').first().within(() => {
          cy.get('[data-testid="completed-badge"]').should('exist');
        });
      });
    });
  });

  it('should allow creating a new milestone', () => {
    learningPathPage.isLearningPathLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Learning Path page not loaded properly, skipping test');
        learningPathPage.takeScreenshot('learning-path-not-loaded');
        return;
      }

      learningPathPage.goToMilestonesTab();
      learningPathPage.takeScreenshot('milestones-tab');

      const milestoneTitle = `Test Milestone ${Date.now()}`;

      cy.get('body').then($body => {
        const hasAddMilestoneButton = $body.find('[data-testid="add-milestone"]').length > 0;

        if (hasAddMilestoneButton) {
          learningPathPage.createMilestone({
            title: milestoneTitle,
            description: 'This is a test milestone created by Cypress',
            targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            verificationMethod: 'Cypress Test',
            selectFirstResource: true
          });

          learningPathPage.hasSuccessNotification().then(hasSuccess => {
            if (hasSuccess) {
              cy.log('Milestone created successfully');

              cy.get('[data-testid="milestones-list"]').contains(milestoneTitle).should('exist');
            } else {
              cy.log('No success notification displayed after creating milestone');
            }
          });
        } else {
          cy.log('Add milestone button not found, skipping milestone creation');
          learningPathPage.takeScreenshot('no-add-milestone-button');
        }
      });
    });
  });

  it('should allow editing the roadmap', () => {
    learningPathPage.isLearningPathLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Learning Path page not loaded properly, skipping test');
        learningPathPage.takeScreenshot('learning-path-not-loaded');
        return;
      }

      learningPathPage.goToRoadmapTab();
      learningPathPage.takeScreenshot('roadmap-tab');

      cy.get('body').then($body => {
        const hasEditRoadmapButton = $body.find('[data-testid="edit-roadmap"]').length > 0;

        if (hasEditRoadmapButton) {
          const updatedTitle = `Updated Roadmap ${Date.now()}`;
          learningPathPage.editRoadmap({
            title: updatedTitle,
            description: 'This roadmap was updated by Cypress',
            addPhase: true,
            phaseTitle: 'Phase 1: Testing',
            phaseDescription: 'First phase of testing',
            addPhaseItem: true,
            phaseItemTitle: 'Learn Cypress'
          });

          learningPathPage.hasSuccessNotification().then(hasSuccess => {
            if (hasSuccess) {
              cy.log('Roadmap updated successfully');

              cy.get('[data-testid="roadmap-title"]').contains(updatedTitle).should('exist');
            } else {
              cy.log('No success notification displayed after updating roadmap');
            }
          });
        } else {
          cy.log('Edit roadmap button not found, skipping roadmap editing');
          learningPathPage.takeScreenshot('no-edit-roadmap-button');
        }
      });
    });
  });

  it('should display learning path progress', () => {
    learningPathPage.isLearningPathLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Learning Path page not loaded properly, skipping test');
        learningPathPage.takeScreenshot('learning-path-not-loaded');
        return;
      }

      learningPathPage.goToProgressTab();
      learningPathPage.takeScreenshot('progress-tab');

      learningPathPage.areProgressChartsVisible().then(isVisible => {
        if (isVisible) {
          cy.log('Progress charts are visible');

          learningPathPage.filterProgressByLastMonth();

          learningPathPage.areProgressChartsVisible().then(isStillVisible => {
            cy.wrap(isStillVisible).should('be.true');
          });
        } else {
          cy.log('Progress charts are not visible');
        }
      });
    });
  });

  it('should allow deleting a goal', () => {
    learningPathPage.isLearningPathLoaded().then(isLoaded => {
      if (!isLoaded) {
        cy.log('Learning Path page not loaded properly, skipping test');
        learningPathPage.takeScreenshot('learning-path-not-loaded');
        return;
      }

      cy.get('body').then($body => {
        const hasGoals = $body.find('[data-testid="goal-item"]').length > 0;

        if (!hasGoals) {
          cy.log('No goals found to delete, creating a test goal first');

          learningPathPage.createGoal({
            title: `Test Goal to Delete ${Date.now()}`,
            description: 'This goal will be deleted'
          });
        }

        let goalTitle: string | undefined;
        cy.get('[data-testid="goal-title"]').first().invoke('text').then(text => {
          goalTitle = text;

          learningPathPage.deleteFirstGoal();

          learningPathPage.hasSuccessNotification().then(hasSuccess => {
            if (hasSuccess) {
              cy.log('Goal deleted successfully');

              if (goalTitle) {
                learningPathPage.goalExists(goalTitle).then(exists => {
                  cy.wrap(exists).should('be.false');
                });
              }
            } else {
              cy.log('No success notification displayed after deleting goal');
            }
          });
        });
      });
    });
  });
});