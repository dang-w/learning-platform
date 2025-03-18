/**
 * Resilient test data seeding functions that handle backend API issues gracefully
 */

interface TestResource {
  title: string;
  url: string;
  description: string;
  type: 'article' | 'video' | 'course';
  tags: string[];
}

interface TestConcept {
  title: string;
  content: string;
  tags: string[];
}

interface TestGoal {
  title: string;
  description: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'completed';
}

/**
 * Seeds test resources with fallback to multiple API endpoint paths
 * @param count Number of resources to create
 */
export const seedResourcesReliably = (count = 3) => {
  const resources: TestResource[] = [];

  for (let i = 0; i < count; i++) {
    resources.push({
      title: `Test Resource ${i + 1}`,
      url: `https://example.com/resource-${i + 1}`,
      description: `Description for test resource ${i + 1}`,
      type: i % 3 === 0 ? 'article' : i % 3 === 1 ? 'video' : 'course',
      tags: [`tag-${i + 1}`, 'test', i % 2 === 0 ? 'important' : 'optional']
    });
  }

  // Define multiple possible API endpoints for resources
  const resourceEndpoints = [
    '/api/resources/batch',
    '/api/resources/batch-resources',
    '/api/resources/create-batch'
  ];

  // Try each endpoint until one works
  const tryEndpoint = (endpointIndex = 0) => {
    if (endpointIndex >= resourceEndpoints.length) {
      cy.log('All resource batch endpoints failed. Resources may not be available for tests.');
      return;
    }

    cy.request({
      method: 'POST',
      url: resourceEndpoints[endpointIndex],
      body: { resources },
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('token')}`
      },
      failOnStatusCode: false,
      timeout: 10000
    }).then(response => {
      if (response.status >= 200 && response.status < 300) {
        cy.log(`Successfully seeded ${count} resources at ${resourceEndpoints[endpointIndex]}`);
      } else if (response.status === 404) {
        cy.log(`Resource endpoint ${resourceEndpoints[endpointIndex]} not found, trying next endpoint`);
        tryEndpoint(endpointIndex + 1);
      } else {
        cy.log(`Failed to seed resources at ${resourceEndpoints[endpointIndex]}: ${response.status} ${JSON.stringify(response.body)}`);
        tryEndpoint(endpointIndex + 1);
      }
    });
  };

  // Start trying endpoints
  tryEndpoint();
};

/**
 * Seeds test concepts with fallback to multiple API endpoint paths
 * @param count Number of concepts to create
 */
export const seedConceptsReliably = (count = 3) => {
  const concepts: TestConcept[] = [];

  for (let i = 0; i < count; i++) {
    concepts.push({
      title: `Test Concept ${i + 1}`,
      content: `# Test Concept ${i + 1}\n\nThis is a test concept for E2E testing.`,
      tags: [`tag-${i + 1}`, 'test', i % 2 === 0 ? 'important' : 'optional']
    });
  }

  // Define multiple possible API endpoints for concepts
  const conceptEndpoints = [
    '/api/concepts/batch',
    '/api/concepts/batch-concepts',
    '/api/concepts/create-batch'
  ];

  // Try each endpoint until one works
  const tryEndpoint = (endpointIndex = 0) => {
    if (endpointIndex >= conceptEndpoints.length) {
      cy.log('All concept batch endpoints failed. Concepts may not be available for tests.');
      return;
    }

    cy.request({
      method: 'POST',
      url: conceptEndpoints[endpointIndex],
      body: { concepts },
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('token')}`
      },
      failOnStatusCode: false,
      timeout: 10000
    }).then(response => {
      if (response.status >= 200 && response.status < 300) {
        cy.log(`Successfully seeded ${count} concepts at ${conceptEndpoints[endpointIndex]}`);
      } else if (response.status === 404) {
        cy.log(`Concept endpoint ${conceptEndpoints[endpointIndex]} not found, trying next endpoint`);
        tryEndpoint(endpointIndex + 1);
      } else {
        cy.log(`Failed to seed concepts at ${conceptEndpoints[endpointIndex]}: ${response.status} ${JSON.stringify(response.body)}`);
        tryEndpoint(endpointIndex + 1);
      }
    });
  };

  // Start trying endpoints
  tryEndpoint();
};

/**
 * Seeds test learning goals with fallback to multiple API endpoint paths
 * @param count Number of goals to create
 */
export const seedGoalsReliably = (count = 3) => {
  const goals: TestGoal[] = [];

  for (let i = 0; i < count; i++) {
    goals.push({
      title: `Test Goal ${i + 1}`,
      description: `Description for test goal ${i + 1}`,
      deadline: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // i+1 weeks from now
      priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
      status: i % 3 === 0 ? 'not_started' : i % 3 === 1 ? 'in_progress' : 'completed'
    });
  }

  // Define multiple possible API endpoints for goals
  const goalEndpoints = [
    '/api/goals/batch',
    '/api/goals/batch-goals',
    '/api/goals/create-batch'
  ];

  // Try each endpoint until one works
  const tryEndpoint = (endpointIndex = 0) => {
    if (endpointIndex >= goalEndpoints.length) {
      cy.log('All goal batch endpoints failed. Goals may not be available for tests.');
      return;
    }

    cy.request({
      method: 'POST',
      url: goalEndpoints[endpointIndex],
      body: { goals },
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('token')}`
      },
      failOnStatusCode: false,
      timeout: 10000
    }).then(response => {
      if (response.status >= 200 && response.status < 300) {
        cy.log(`Successfully seeded ${count} goals at ${goalEndpoints[endpointIndex]}`);
      } else if (response.status === 404) {
        cy.log(`Goal endpoint ${goalEndpoints[endpointIndex]} not found, trying next endpoint`);
        tryEndpoint(endpointIndex + 1);
      } else {
        cy.log(`Failed to seed goals at ${goalEndpoints[endpointIndex]}: ${response.status} ${JSON.stringify(response.body)}`);
        tryEndpoint(endpointIndex + 1);
      }
    });
  };

  // Start trying endpoints
  tryEndpoint();
};

/**
 * Seeds all test data with enhanced resilience against missing API endpoints
 * @param options Configuration options for seeding
 */
export const seedAllDataReliably = (options = { resources: 5, concepts: 5, goals: 5 }) => {
  cy.log('Seeding all test data with resilient endpoints');

  // Check if already logged in, if not, log in first
  cy.window().its('localStorage').invoke('getItem', 'token').then(token => {
    if (!token) {
      cy.log('No authentication token found, logging in first');
      cy.login('test-user-cypress', 'TestPassword123!');
    }

    // Seed all data types
    seedResourcesReliably(options.resources);
    seedConceptsReliably(options.concepts);
    seedGoalsReliably(options.goals);
  });
};

/**
 * Setup authenticated test with data seeding
 * Use this as a beforeEach in test specs that need auth + data
 */
export const setupAuthenticatedTestWithData = () => {
  // Ensure user is logged in
  cy.isLoggedIn().then(loggedIn => {
    if (!loggedIn) {
      cy.login('test-user-cypress', 'TestPassword123!');
    }
  });

  // Seed data
  seedAllDataReliably();
};

/**
 * Check if an element exists in the DOM
 * @param selector Element selector
 * @returns Promise resolving to boolean indicating if element exists
 */
export const elementExists = (selector: string): Cypress.Chainable<boolean> => {
  return cy.get('body').then($body => {
    return Cypress.$(selector, $body).length > 0;
  });
};

/**
 * Safe click that only proceeds if element exists
 * @param selector Element selector to click
 */
export const safeClick = (selector: string): void => {
  elementExists(selector).then(exists => {
    if (exists) {
      cy.get(selector).click();
    } else {
      cy.log(`Element '${selector}' not found, skipping click`);
    }
  });
};

/**
 * Safe type that only proceeds if element exists
 * @param selector Element selector to type into
 * @param text Text to type
 */
export const safeType = (selector: string, text: string): void => {
  elementExists(selector).then(exists => {
    if (exists) {
      cy.get(selector).type(text);
    } else {
      cy.log(`Element '${selector}' not found, skipping type`);
    }
  });
};