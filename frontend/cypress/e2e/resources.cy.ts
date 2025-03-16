describe('Resource Browsing and Usage', () => {
  beforeEach(() => {
    // Mock authentication
    cy.intercept('GET', '/api/user/me', {
      statusCode: 200,
      body: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User'
      }
    }).as('getUser');

    // Mock resource categories
    cy.intercept('GET', '/api/resources/categories', {
      statusCode: 200,
      body: [
        { id: 1, name: 'Books', count: 5 },
        { id: 2, name: 'Videos', count: 8 },
        { id: 3, name: 'Articles', count: 12 },
        { id: 4, name: 'Courses', count: 3 }
      ]
    }).as('getCategories');

    // Mock resources list
    cy.intercept('GET', '/api/resources*', {
      statusCode: 200,
      body: {
        items: [
          {
            id: 1,
            title: 'JavaScript: The Good Parts',
            type: 'book',
            author: 'Douglas Crockford',
            rating: 4.8,
            completionPercentage: 75,
            tags: ['javascript', 'programming']
          },
          {
            id: 2,
            title: 'React Fundamentals',
            type: 'course',
            author: 'Frontend Masters',
            rating: 4.5,
            completionPercentage: 30,
            tags: ['react', 'javascript', 'frontend']
          },
          {
            id: 3,
            title: 'TypeScript in 50 Lessons',
            type: 'book',
            author: 'Stefan Baumgartner',
            rating: 4.7,
            completionPercentage: 0,
            tags: ['typescript', 'javascript']
          }
        ],
        total: 3,
        page: 1,
        pageSize: 10,
        totalPages: 1
      }
    }).as('getResources');

    // Mock resource details
    cy.intercept('GET', '/api/resources/1', {
      statusCode: 200,
      body: {
        id: 1,
        title: 'JavaScript: The Good Parts',
        type: 'book',
        author: 'Douglas Crockford',
        description: 'This book provides a developer-level introduction along with more advanced and useful features of JavaScript.',
        rating: 4.8,
        completionPercentage: 75,
        tags: ['javascript', 'programming'],
        chapters: [
          { id: 1, title: 'Good Parts', completed: true },
          { id: 2, title: 'Grammar', completed: true },
          { id: 3, title: 'Objects', completed: false },
          { id: 4, title: 'Functions', completed: false }
        ],
        notes: [
          { id: 1, content: 'JavaScript has good parts and bad parts', page: 5 },
          { id: 2, content: 'Always use === instead of ==', page: 15 }
        ]
      }
    }).as('getResourceDetails');

    // Visit the resources page
    cy.visit('/resources');
    cy.wait('@getUser');
    cy.wait('@getCategories');
    cy.wait('@getResources');
  });

  it('should display resource categories', () => {
    cy.contains('h1', 'Resources').should('be.visible');
    cy.contains('Books (5)').should('be.visible');
    cy.contains('Videos (8)').should('be.visible');
    cy.contains('Articles (12)').should('be.visible');
    cy.contains('Courses (3)').should('be.visible');
  });

  it('should display resource list', () => {
    cy.contains('JavaScript: The Good Parts').should('be.visible');
    cy.contains('React Fundamentals').should('be.visible');
    cy.contains('TypeScript in 50 Lessons').should('be.visible');
  });

  it('should filter resources by category', () => {
    // Mock filtered resources
    cy.intercept('GET', '/api/resources*category=1*', {
      statusCode: 200,
      body: {
        items: [
          {
            id: 1,
            title: 'JavaScript: The Good Parts',
            type: 'book',
            author: 'Douglas Crockford',
            rating: 4.8,
            completionPercentage: 75,
            tags: ['javascript', 'programming']
          },
          {
            id: 3,
            title: 'TypeScript in 50 Lessons',
            type: 'book',
            author: 'Stefan Baumgartner',
            rating: 4.7,
            completionPercentage: 0,
            tags: ['typescript', 'javascript']
          }
        ],
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1
      }
    }).as('getFilteredResources');

    cy.contains('Books').click();
    cy.wait('@getFilteredResources');
    cy.contains('JavaScript: The Good Parts').should('be.visible');
    cy.contains('TypeScript in 50 Lessons').should('be.visible');
    cy.contains('React Fundamentals').should('not.exist');
  });

  it('should search resources', () => {
    // Mock search results
    cy.intercept('GET', '/api/resources*search=typescript*', {
      statusCode: 200,
      body: {
        items: [
          {
            id: 3,
            title: 'TypeScript in 50 Lessons',
            type: 'book',
            author: 'Stefan Baumgartner',
            rating: 4.7,
            completionPercentage: 0,
            tags: ['typescript', 'javascript']
          }
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1
      }
    }).as('getSearchResults');

    cy.get('input[placeholder*="Search"]').type('typescript');
    cy.wait('@getSearchResults');
    cy.contains('TypeScript in 50 Lessons').should('be.visible');
    cy.contains('JavaScript: The Good Parts').should('not.exist');
    cy.contains('React Fundamentals').should('not.exist');
  });

  it('should navigate to resource details', () => {
    cy.contains('JavaScript: The Good Parts').click();
    cy.wait('@getResourceDetails');
    cy.url().should('include', '/resources/1');
    cy.contains('h1', 'JavaScript: The Good Parts').should('be.visible');
    cy.contains('Douglas Crockford').should('be.visible');
  });

  it('should display resource chapters and progress', () => {
    cy.contains('JavaScript: The Good Parts').click();
    cy.wait('@getResourceDetails');

    cy.contains('Chapters').should('be.visible');
    cy.contains('Good Parts').should('be.visible');
    cy.contains('Grammar').should('be.visible');
    cy.contains('Objects').should('be.visible');
    cy.contains('Functions').should('be.visible');

    cy.contains('75%').should('be.visible');
    cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '75');
  });

  it('should mark chapter as completed', () => {
    // Mock the API call to mark a chapter as completed
    cy.intercept('POST', '/api/resources/1/chapters/3/complete', {
      statusCode: 200,
      body: { success: true }
    }).as('markChapterComplete');

    cy.contains('JavaScript: The Good Parts').click();
    cy.wait('@getResourceDetails');

    // Find the "Mark as completed" button for the Objects chapter and click it
    cy.contains('Objects')
      .parent()
      .find('button[aria-label="Mark as completed"]')
      .click();

    cy.wait('@markChapterComplete');

    // Mock updated resource details with the chapter marked as completed
    cy.intercept('GET', '/api/resources/1', {
      statusCode: 200,
      body: {
        id: 1,
        title: 'JavaScript: The Good Parts',
        type: 'book',
        author: 'Douglas Crockford',
        description: 'This book provides a developer-level introduction along with more advanced and useful features of JavaScript.',
        rating: 4.8,
        completionPercentage: 85,
        tags: ['javascript', 'programming'],
        chapters: [
          { id: 1, title: 'Good Parts', completed: true },
          { id: 2, title: 'Grammar', completed: true },
          { id: 3, title: 'Objects', completed: true },
          { id: 4, title: 'Functions', completed: false }
        ],
        notes: [
          { id: 1, content: 'JavaScript has good parts and bad parts', page: 5 },
          { id: 2, content: 'Always use === instead of ==', page: 15 }
        ]
      }
    }).as('getUpdatedResourceDetails');

    // Reload the page to see the updated state
    cy.reload();
    cy.wait('@getUpdatedResourceDetails');

    // Verify the chapter is now marked as completed and progress is updated
    cy.contains('Objects')
      .parent()
      .find('[data-testid="completed-icon"]')
      .should('be.visible');

    cy.contains('85%').should('be.visible');
    cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '85');
  });

  it('should add a note to a resource', () => {
    // Mock the API call to add a note
    cy.intercept('POST', '/api/resources/1/notes', {
      statusCode: 200,
      body: {
        id: 3,
        content: 'Prototypal inheritance is powerful',
        page: 42
      }
    }).as('addNote');

    cy.contains('JavaScript: The Good Parts').click();
    cy.wait('@getResourceDetails');

    cy.contains('Notes').should('be.visible');
    cy.get('button').contains('Add Note').click();

    cy.get('textarea[name="content"]').type('Prototypal inheritance is powerful');
    cy.get('input[name="page"]').type('42');
    cy.get('button[type="submit"]').click();

    cy.wait('@addNote');

    // Mock updated resource details with the new note
    cy.intercept('GET', '/api/resources/1', {
      statusCode: 200,
      body: {
        id: 1,
        title: 'JavaScript: The Good Parts',
        type: 'book',
        author: 'Douglas Crockford',
        description: 'This book provides a developer-level introduction along with more advanced and useful features of JavaScript.',
        rating: 4.8,
        completionPercentage: 75,
        tags: ['javascript', 'programming'],
        chapters: [
          { id: 1, title: 'Good Parts', completed: true },
          { id: 2, title: 'Grammar', completed: true },
          { id: 3, title: 'Objects', completed: false },
          { id: 4, title: 'Functions', completed: false }
        ],
        notes: [
          { id: 1, content: 'JavaScript has good parts and bad parts', page: 5 },
          { id: 2, content: 'Always use === instead of ==', page: 15 },
          { id: 3, content: 'Prototypal inheritance is powerful', page: 42 }
        ]
      }
    }).as('getUpdatedResourceDetails');

    // Reload the page to see the updated state
    cy.reload();
    cy.wait('@getUpdatedResourceDetails');

    // Verify the new note is displayed
    cy.contains('Prototypal inheritance is powerful').should('be.visible');
    cy.contains('Page 42').should('be.visible');
  });
});