# AI/ML Learning Platform Testing Guide

This document provides a comprehensive guide for testing the AI/ML Learning Platform application, with a focus on integration testing between the frontend and backend components. It includes information about the implemented fixes, testing procedures, and next steps for ensuring the application works correctly.

## Background and Implementation Summary

The E2E tests were failing primarily due to:
1. Missing API routes in the Next.js frontend
2. Authentication flow mismatches
3. Inconsistent API endpoint usage between tests and application code

These issues have been addressed with the following implementations:

### 1. API Routes Implementation

The following API routes have been implemented as Next.js route handlers:

- **Authentication Routes**
  - `src/app/api/token/route.ts` - Token generation
  - `src/app/api/token/refresh/route.ts` - Token refresh

- **Resource Routes**
  - `src/app/api/resources/batch/route.ts` - Batch resource creation

- **Middleware**
  - Updated `src/middleware.ts` to handle authentication and API routing

### 2. Frontend Configuration Updates

The API client configuration has been updated to use relative URLs:

```typescript
// src/lib/api/client.ts
const apiClient = axios.create({
  // Use relative URLs for API requests
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});
```

### 3. Cypress Test Updates

The Cypress test commands have been updated to handle multiple endpoint fallbacks:

```typescript
// e2e-testing/cypress/support/commands.ts
const tokenEndpoints = [
  'http://localhost:3000/api/token',
  'http://localhost:8000/token',
  'http://localhost:8000/auth/token',
  'http://localhost:8000/api/token'
];
```

## Testing Approach

A systematic approach is needed to test the application from multiple angles before relying on the E2E test suite. This is especially important for the AI/ML Learning Platform where domain-specific features like spaced repetition and analytics require thorough testing.

### Step 1: Start and Test Backend

```bash
cd backend
python -m app.main
```

Then test the backend API endpoints:

```bash
# Test authentication
curl -X POST http://localhost:8000/token \
  -F "username=test-user" \
  -F "password=TestPassword123!" \
  -v

# Test resource endpoint
curl -X GET http://localhost:8000/resources \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v

# Test knowledge concepts endpoint
curl -X GET http://localhost:8000/api/reviews/concepts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v

# Test learning path progress
curl -X GET http://localhost:8000/api/learning-path/progress \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v
```

### Step 2: Start and Test Frontend

```bash
cd frontend
npm run dev
```

Then test the Next.js API routes:

```bash
# Test token endpoint
curl -X POST http://localhost:3000/api/token \
  -F "username=test-user" \
  -F "password=TestPassword123!" \
  -v

# Test token refresh endpoint
curl -X POST http://localhost:3000/api/token/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}' \
  -v

# Test resources batch endpoint
curl -X POST http://localhost:3000/api/resources/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resources": [{"title": "Test Resource", "type": "article", "url": "https://example.com"}]}' \
  -v
```

### Step 3: Run API Tests Script

For convenience, you can use the included API testing script:

```bash
cd learning-platform
./api-tests.sh
```

Follow the prompts to test both backend and Next.js API endpoints.

### Step 4: Manual Testing

Perform manual testing of the core functionality:

#### Authentication Flow Testing

1. Open the application at `http://localhost:3000`
2. Navigate to the login page
3. Enter valid credentials
4. Verify successful login and redirection
5. Check localStorage and cookies for token storage
6. Test protected routes access
7. Test logout functionality

#### Resource Management Testing

1. Log in to the application
2. Navigate to the resources page
3. Create a new resource
4. Verify it appears in the list
5. Edit the resource
6. Delete the resource
7. Verify the operations worked correctly

#### AI/ML Knowledge Management Testing

1. Navigate to the knowledge management section
2. Create a new concept for an ML algorithm (e.g., "Random Forest")
3. Add notes and difficulty level
4. Test the markdown editor for code snippets
5. Test the review scheduling functionality
6. Verify the spaced repetition algorithm correctly schedules reviews
7. Complete a review session and verify confidence level tracking

#### Learning Progress Analytics Testing

1. Navigate to the analytics dashboard
2. Test date range filters for study metrics
3. Verify chart data accuracy
4. Test topic distribution visualization
5. Verify learning path progress tracking
6. Test weekly report generation

Document your results using the test results template (`TEST_RESULTS_TEMPLATE.md`).

### Step 5: Component Testing

Run component tests to verify individual components:

```bash
cd frontend
npm test
```

Focus on testing domain-specific components:

```bash
# Test knowledge management components
npm test -- -t "ConceptCard"
npm test -- -t "SpacedRepetition"
npm test -- -t "ReviewSession"

# Test analytics components
npm test -- -t "StudyMetricsChart"
npm test -- -t "TopicDistribution"
npm test -- -t "LearningProgress"
```

### Step 6: Limited E2E Testing

Run a subset of the E2E tests focusing on authentication and basic functionality:

```bash
cd frontend
npm run e2e:fast-logged -- --spec "e2e-testing/cypress/e2e/authentication/*.cy.ts"
```

Then test domain-specific features:

```bash
# Test knowledge management with spaced repetition
npm run e2e:fast-logged -- --spec "e2e-testing/cypress/e2e/knowledge-spaced-repetition.cy.ts"

# Test analytics visualizations
npm run e2e:fast-logged -- --spec "e2e-testing/cypress/e2e/analytics-visualization.cy.ts"
```

### Step 7: Analyze and Fix Issues

- Review test results and logs
- Fix any issues found during testing
- Update documentation as needed

### Step 8: Run Full E2E Test Suite

Once the limited tests pass, run the full E2E test suite:

```bash
cd frontend
npm run e2e:fast-logged
```

## Testing Domain-Specific Features

### Testing Knowledge Management with Spaced Repetition

The knowledge management system with spaced repetition is a critical component of the AI/ML Learning Platform. Here are specific tests to perform:

1. **Concept Creation and Editing**
   - Create concepts for various AI/ML topics
   - Test markdown support for code snippets
   - Verify topic and difficulty assignments
   - Test editing functionality

2. **Spaced Repetition Algorithm**
   - Verify initial scheduling of new concepts
   - Test confidence level adjustment after reviews
   - Verify that review intervals increase appropriately
   - Test overdue review handling

3. **Review Session Flow**
   - Test review session generation
   - Verify due concepts are included
   - Test confidence level recording
   - Verify session completion handling

4. **Knowledge Retention Metrics**
   - Test retention metrics calculation
   - Verify confidence trend visualizations
   - Test topic mastery reporting

### Testing Learning Progress Analytics

The analytics dashboard is essential for tracking learning progress in AI/ML. Here are specific tests to perform:

1. **Study Metrics Visualization**
   - Test chart rendering with various time periods
   - Verify data accuracy
   - Test interactive filters

2. **Topic Distribution Analysis**
   - Verify visualization of topic coverage
   - Test filtering by confidence level
   - Test time-based comparison

3. **Learning Path Progress**
   - Verify milestone tracking
   - Test completion percentage calculation
   - Verify roadmap visualization

4. **Weekly/Monthly Reports**
   - Test report generation
   - Verify data aggregation
   - Test comparison with previous periods

## Debugging Guidelines

### API Issues

If API routes aren't working:

1. Check the server logs for errors
2. Verify the API route implementation in Next.js
3. Check the network requests in the browser developer tools
4. Verify the backend API is responding correctly
5. Check environment variables configuration

### Authentication Issues

If authentication isn't working:

1. Check token generation and storage
2. Verify middleware behavior
3. Check the backend authentication flow
4. Inspect the authorization headers

### Integration Issues

For general integration issues:

1. Use browser developer tools to inspect network requests
2. Check console for JavaScript errors
3. Verify environment variables are correctly set
4. Ensure both frontend and backend are running
5. Check for CORS issues

### Domain-Specific Issues

For AI/ML platform-specific features:

1. **Spaced Repetition Issues**
   - Check algorithm implementation in `/app/services/spaced-repetition.ts`
   - Verify review date calculations
   - Check confidence level adjustments

2. **Analytics Issues**
   - Verify data aggregation in `/app/services/analytics.ts`
   - Check chart configuration in visualization components
   - Test data filtering and transformation

## Test Documentation

Document all test results using the provided template (`TEST_RESULTS_TEMPLATE.md`). The template includes sections for:

- Environment information
- Backend API tests
- Next.js API routes tests
- Authentication flow tests
- Resource management tests
- Component tests
- Limited E2E tests
- Issues found
- Fixed issues
- Next actions

## Testing Tools Reference

- **API Testing Script**: `learning-platform/api-tests.sh`
- **Test Results Template**: `learning-platform/TEST_RESULTS_TEMPLATE.md`
- **Cypress Commands**: `e2e-testing/cypress/support/commands.ts`
- **Page Objects**: `frontend/cypress/support/page-objects/`

## Monitoring and Support

If issues are encountered during testing:

1. Check browser developer tools for network and console errors
2. Examine backend server logs for API errors
3. Look for middleware or authentication issues in the Next.js logs
4. Verify environment variables are correctly set

## Next Steps After Integration Testing

1. Fix any issues discovered during testing
2. Run the full E2E test suite
3. Update documentation with learnings
4. Proceed with Cypress Dashboard integration (see DEVELOPMENT_STATUS.md)
5. Implement additional test coverage for AI/ML domain-specific features
6. Create specialized tests for the spaced repetition algorithm
7. Develop comprehensive tests for analytics visualizations

## Conclusion

By following this structured testing approach, we can ensure the AI/ML Learning Platform is functioning correctly before relying on the E2E test suite. This will save time and prevent chasing false negatives in the E2E tests caused by integration issues rather than test failures. Special attention should be given to testing the domain-specific features like knowledge management with spaced repetition and learning analytics that make this platform uniquely suited for AI/ML learning.