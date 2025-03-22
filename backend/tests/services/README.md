# Service Tests

> **Note:** This document focuses on tests for service layer components. For a comprehensive guide on backend testing, please refer to the [Backend Testing Guide](/backend/TESTING.md).

## Service Layer Testing

Service tests focus on testing the business logic and service layer of the application, independent of the API endpoints. These tests verify that service functions correctly process data, interact with the database, and return expected results.

## Test Organization

The service tests are organized by service type:

- `test_url_extractor_service.py` - Tests for the URL metadata extraction service
- Additional service tests will be added as more services are implemented

## Writing Service Tests

When writing tests for services:

1. Focus on business logic, not API endpoint behavior
2. Mock external dependencies like database connections
3. Test both success and error paths
4. Verify that services correctly transform and process data

## Running Service Tests

```bash
# Run all service tests
pytest tests/services/

# Run a specific service test file
pytest tests/services/test_url_extractor_service.py
```

For more information on running tests and test organization, see the [Backend Testing Guide](/backend/TESTING.md).