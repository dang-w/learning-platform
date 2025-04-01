// Test data seeding functions for Cypress tests

/**
 * Seeds test resources for the current user
 * @param count Number of resources to create
 */
export const seedResources = (count = 3) => {
  const resources = [];

  for (let i = 0; i < count; i++) {
    resources.push({
      title: `Test Resource ${i + 1}`,
      url: `https://example.com/resource-${i + 1}`,
      description: `Description for test resource ${i + 1}`,
      type: i % 3 === 0 ? 'article' : i % 3 === 1 ? 'video' : 'course',
      tags: [`tag-${i + 1}`, 'test', i % 2 === 0 ? 'important' : 'optional']
    });
  }

  cy.request({
    method: 'POST',
    url: '/api/resources/batch',
    body: { resources },
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('token')}`
    }
  });
};

/**
 * Seeds test knowledge concepts for the current user
 * @param count Number of concepts to create
 */
export const seedConcepts = (count = 3) => {
  const concepts = [];

  for (let i = 0; i < count; i++) {
    concepts.push({
      title: `Test Concept ${i + 1}`,
      content: `# Test Concept ${i + 1}\n\nThis is a test concept for E2E testing.`,
      tags: [`tag-${i + 1}`, 'test', i % 2 === 0 ? 'important' : 'optional']
    });
  }

  cy.request({
    method: 'POST',
    url: '/api/concepts/batch',
    body: { concepts },
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('token')}`
    }
  });
};

/**
 * Seeds test learning path goals for the current user
 * @param count Number of goals to create
 */
export const seedGoals = (count = 3) => {
  const goals = [];

  for (let i = 0; i < count; i++) {
    goals.push({
      title: `Test Goal ${i + 1}`,
      description: `Description for test goal ${i + 1}`,
      deadline: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // i+1 weeks from now
      priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
      status: i % 3 === 0 ? 'not_started' : i % 3 === 1 ? 'in_progress' : 'completed'
    });
  }

  cy.request({
    method: 'POST',
    url: '/api/goals/batch',
    body: { goals },
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('token')}`
    }
  });
};

/**
 * Seeds test study metrics for the current user
 * @param daysBack Number of days back to create metrics for
 */
export const seedStudyMetrics = (daysBack = 7) => {
  const metrics = [];

  for (let i = 0; i < daysBack; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    metrics.push({
      date: dateString,
      studyTime: Math.floor(Math.random() * 120) + 30, // 30-150 minutes
      resourcesCompleted: Math.floor(Math.random() * 3),
      conceptsReviewed: Math.floor(Math.random() * 5) + 1
    });
  }

  cy.request({
    method: 'POST',
    url: '/api/metrics/batch',
    body: { metrics },
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('token')}`
    }
  });
};

/**
 * Safer versions of seed functions that don't fail tests on backend API errors
 */

/**
 * Seeds test resources for the current user with error handling
 * @param count Number of resources to create
 */
export const seedResourcesSafely = (count = 3) => {
  const resources = [];

  for (let i = 0; i < count; i++) {
    resources.push({
      title: `Test Resource ${i + 1}`,
      url: `https://example.com/resource-${i + 1}`,
      description: `Description for test resource ${i + 1}`,
      type: i % 3 === 0 ? 'article' : i % 3 === 1 ? 'video' : 'course',
      tags: [`tag-${i + 1}`, 'test', i % 2 === 0 ? 'important' : 'optional']
    });
  }

  cy.request({
    method: 'POST',
    url: '/api/resources/batch',
    body: { resources },
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('token')}`
    },
    failOnStatusCode: false // Don't fail the test if the API returns an error
  }).then(response => {
    if (response.status >= 400) {
      cy.log(`Warning: Failed to seed resources. Status: ${response.status}, Message: ${JSON.stringify(response.body)}`);
    } else {
      cy.log(`Successfully seeded ${count} resources`);
    }
  });
};

/**
 * Seeds test knowledge concepts for the current user with error handling
 * @param count Number of concepts to create
 */
export const seedConceptsSafely = (count = 3) => {
  const concepts = [];

  for (let i = 0; i < count; i++) {
    concepts.push({
      title: `Test Concept ${i + 1}`,
      content: `# Test Concept ${i + 1}\n\nThis is a test concept for E2E testing.`,
      tags: [`tag-${i + 1}`, 'test', i % 2 === 0 ? 'important' : 'optional']
    });
  }

  cy.request({
    method: 'POST',
    url: '/api/concepts/batch',
    body: { concepts },
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('token')}`
    },
    failOnStatusCode: false // Don't fail the test if the API returns an error
  }).then(response => {
    if (response.status >= 400) {
      cy.log(`Warning: Failed to seed concepts. Status: ${response.status}, Message: ${JSON.stringify(response.body)}`);
    } else {
      cy.log(`Successfully seeded ${count} concepts`);
    }
  });
};

/**
 * Seeds test learning path goals for the current user with error handling
 * @param count Number of goals to create
 */
export const seedGoalsSafely = (count = 3) => {
  const goals = [];

  for (let i = 0; i < count; i++) {
    goals.push({
      title: `Test Goal ${i + 1}`,
      description: `Description for test goal ${i + 1}`,
      deadline: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // i+1 weeks from now
      priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
      status: i % 3 === 0 ? 'not_started' : i % 3 === 1 ? 'in_progress' : 'completed'
    });
  }

  cy.request({
    method: 'POST',
    url: '/api/goals/batch',
    body: { goals },
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('token')}`
    },
    failOnStatusCode: false // Don't fail the test if the API returns an error
  }).then(response => {
    if (response.status >= 400) {
      cy.log(`Warning: Failed to seed goals. Status: ${response.status}, Message: ${JSON.stringify(response.body)}`);
    } else {
      cy.log(`Successfully seeded ${count} goals`);
    }
  });
};

/**
 * Seeds all test data with error handling
 */
export const seedAllTestDataSafely = () => {
  seedResourcesSafely(5);
  seedConceptsSafely(5);
  seedGoalsSafely(5);
};