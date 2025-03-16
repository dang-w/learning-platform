describe('Profile Management', () => {
  beforeEach(() => {
    // Mock authentication
    cy.intercept('GET', '/api/user/me', {
      statusCode: 200,
      body: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        bio: 'Software developer interested in web technologies',
        avatar: 'https://example.com/avatar.jpg',
        preferences: {
          emailNotifications: true,
          darkMode: false,
          studyReminders: true
        },
        stats: {
          daysActive: 45,
          resourcesCompleted: 12,
          knowledgeItemsLearned: 87,
          averageStudyTime: 45 // minutes per day
        }
      }
    }).as('getUser');

    // Visit the profile page
    cy.visit('/profile');
    cy.wait('@getUser');
  });

  it('should display user profile information', () => {
    cy.contains('h1', 'Profile').should('be.visible');
    cy.contains('Test User').should('be.visible');
    cy.contains('testuser').should('be.visible');
    cy.contains('test@example.com').should('be.visible');
    cy.contains('Software developer interested in web technologies').should('be.visible');
    cy.get('img[alt="User avatar"]').should('have.attr', 'src', 'https://example.com/avatar.jpg');
  });

  it('should display user statistics', () => {
    cy.contains('Statistics').should('be.visible');
    cy.contains('45 days active').should('be.visible');
    cy.contains('12 resources completed').should('be.visible');
    cy.contains('87 knowledge items learned').should('be.visible');
    cy.contains('45 minutes average study time').should('be.visible');
  });

  it('should update profile information', () => {
    // Mock the API call to update profile
    cy.intercept('PUT', '/api/user/profile', {
      statusCode: 200,
      body: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        name: 'Updated Name',
        bio: 'Updated bio with more details about my interests',
        avatar: 'https://example.com/avatar.jpg'
      }
    }).as('updateProfile');

    cy.contains('Edit Profile').click();

    cy.get('input[name="name"]').clear().type('Updated Name');
    cy.get('textarea[name="bio"]').clear().type('Updated bio with more details about my interests');

    cy.get('button[type="submit"]').click();
    cy.wait('@updateProfile');

    // Verify the updated information is displayed
    cy.contains('Updated Name').should('be.visible');
    cy.contains('Updated bio with more details about my interests').should('be.visible');
    cy.contains('Profile updated successfully').should('be.visible');
  });

  it('should update user preferences', () => {
    // Mock the API call to update preferences
    cy.intercept('PUT', '/api/user/preferences', {
      statusCode: 200,
      body: {
        emailNotifications: false,
        darkMode: true,
        studyReminders: false
      }
    }).as('updatePreferences');

    cy.contains('Preferences').click();

    cy.get('input[name="emailNotifications"]').uncheck();
    cy.get('input[name="darkMode"]').check();
    cy.get('input[name="studyReminders"]').uncheck();

    cy.get('button').contains('Save Preferences').click();
    cy.wait('@updatePreferences');

    // Verify the preferences were updated
    cy.get('input[name="emailNotifications"]').should('not.be.checked');
    cy.get('input[name="darkMode"]').should('be.checked');
    cy.get('input[name="studyReminders"]').should('not.be.checked');
    cy.contains('Preferences updated successfully').should('be.visible');
  });

  it('should change user password', () => {
    // Mock the API call to change password
    cy.intercept('POST', '/api/user/change-password', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Password changed successfully'
      }
    }).as('changePassword');

    cy.contains('Security').click();

    cy.get('input[name="currentPassword"]').type('oldpassword');
    cy.get('input[name="newPassword"]').type('newpassword123');
    cy.get('input[name="confirmPassword"]').type('newpassword123');

    cy.get('button').contains('Change Password').click();
    cy.wait('@changePassword');

    // Verify the password was changed
    cy.contains('Password changed successfully').should('be.visible');
  });

  it('should show validation errors for password mismatch', () => {
    cy.contains('Security').click();

    cy.get('input[name="currentPassword"]').type('oldpassword');
    cy.get('input[name="newPassword"]').type('newpassword123');
    cy.get('input[name="confirmPassword"]').type('differentpassword');

    cy.get('button').contains('Change Password').click();

    // Verify validation error is shown
    cy.contains('Passwords do not match').should('be.visible');
  });

  it('should upload a new avatar', () => {
    // Mock the API call to upload avatar
    cy.intercept('POST', '/api/user/avatar', {
      statusCode: 200,
      body: {
        success: true,
        avatar: 'https://example.com/new-avatar.jpg'
      }
    }).as('uploadAvatar');

    cy.contains('Edit Profile').click();

    // Simulate file upload
    cy.get('input[type="file"]').selectFile('cypress/fixtures/avatar.jpg', { force: true });

    cy.get('button').contains('Upload Avatar').click();
    cy.wait('@uploadAvatar');

    // Mock the updated user profile with new avatar
    cy.intercept('GET', '/api/user/me', {
      statusCode: 200,
      body: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        bio: 'Software developer interested in web technologies',
        avatar: 'https://example.com/new-avatar.jpg',
        preferences: {
          emailNotifications: true,
          darkMode: false,
          studyReminders: true
        },
        stats: {
          daysActive: 45,
          resourcesCompleted: 12,
          knowledgeItemsLearned: 87,
          averageStudyTime: 45
        }
      }
    }).as('getUserUpdated');

    // Reload the page to see the updated avatar
    cy.reload();
    cy.wait('@getUserUpdated');

    // Verify the new avatar is displayed
    cy.get('img[alt="User avatar"]').should('have.attr', 'src', 'https://example.com/new-avatar.jpg');
  });

  it('should display learning activity history', () => {
    // Mock learning activity history
    cy.intercept('GET', '/api/user/activity', {
      statusCode: 200,
      body: [
        {
          id: 1,
          type: 'resource_completed',
          title: 'Completed "JavaScript: The Good Parts"',
          timestamp: '2023-03-15T14:30:00Z'
        },
        {
          id: 2,
          type: 'knowledge_item_learned',
          title: 'Learned "Variables and Data Types"',
          timestamp: '2023-03-14T10:15:00Z'
        },
        {
          id: 3,
          type: 'learning_path_progress',
          title: 'Completed 50% of "Frontend Development" path',
          timestamp: '2023-03-12T16:45:00Z'
        }
      ]
    }).as('getActivity');

    cy.contains('Activity').click();
    cy.wait('@getActivity');

    cy.contains('Learning Activity').should('be.visible');
    cy.contains('Completed "JavaScript: The Good Parts"').should('be.visible');
    cy.contains('Learned "Variables and Data Types"').should('be.visible');
    cy.contains('Completed 50% of "Frontend Development" path').should('be.visible');
  });

  it('should allow deleting account', () => {
    // Mock the API call to delete account
    cy.intercept('DELETE', '/api/user', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Account deleted successfully'
      }
    }).as('deleteAccount');

    cy.contains('Danger Zone').click();
    cy.contains('Delete Account').click();

    // Confirm deletion in modal
    cy.get('input[name="confirmText"]').type('DELETE');
    cy.get('button').contains('Confirm Deletion').click();

    cy.wait('@deleteAccount');

    // Verify redirection to login page
    cy.url().should('include', '/login');
    cy.contains('Account deleted successfully').should('be.visible');
  });
});