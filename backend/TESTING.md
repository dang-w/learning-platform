# Backend Testing Guide

This document provides comprehensive information about testing approaches, organization, and best practices for the AI/ML Learning Platform backend.

## Table of Contents

- [Overview](#overview)
- [Test Organization](#test-organization)
- [Testing Approaches](#testing-approaches)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Fixtures](#test-fixtures)
- [Integration with Frontend Tests](#integration-with-frontend-tests)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

The backend testing suite ensures the stability, correctness, and reliability of the API. We use pytest as our testing framework with a variety of approaches to cover different testing scenarios.

### Testing Goals

1. **Correctness**: Ensure API functions as specified
2. **Reliability**: Maintain stability across versions
3. **Performance**: Validate acceptable performance under load
4. **Security**: Verify authentication and authorization
5. **Integration**: Confirm system components work together

## Test Organization

Tests are organized by test type and feature area:

```
tests/
├── api/                 # API endpoint tests
│   ├── test_auth_api.py
│   ├── test_resources_api.py
│   ├── test_progress_api.py
│   ├── test_reviews_api.py
│   ├── test_learning_path_api.py
│   └── test_url_extractor_api.py
├── services/            # Service layer tests
│   ├── test_url_extractor.py
│   └── test_knowledge_service.py
├── utils/               # Shared test utilities
│   ├── auth_helpers.py
│   ├── db_helpers.py
│   └── test_data.py
├── config/              # Test configurations
│   ├── test_settings.py
│   └── test_mongo_config.py
├── integration/         # Integration tests
│   ├── test_authentication_consolidated.py  # Consolidated authentication tests
│   ├── test_api_interactions.py
│   ├── test_database_interactions.py
│   └── test_user_workflow.py
├── performance/         # Performance tests
│   ├── test_api_performance.py
│   ├── test_database_performance.py
│   └── test_load_performance.py
├── reports/             # Test reports
│   ├── html/            # HTML test reports
│   ├── junit/           # JUnit XML reports
│   └── coverage/        # Coverage reports
├── conftest.py          # Test fixtures and utilities
├── mock_db.py           # Mock database for testing
└── README.md            # Test suite documentation
```

### Test Types

- **Unit Tests**: Tests individual components in isolation
- **Integration Tests**: Tests interactions between components
- **API Tests**: Tests API endpoints through FastAPI's test client
- **Performance Tests**: Tests API performance under various conditions

### Test Markers

The following pytest markers are available for categorizing tests:

- `unit`: Unit tests that test individual components
- `integration`: Integration tests that test component interactions
- `performance`: Performance tests for measuring API and system performance
- `slow`: Tests that take a long time to run and might be skipped in quick test runs

## Testing Approaches

The backend testing suite supports three main approaches:

### 1. Mock-based Testing

Uses `mongomock` and `mongomock-motor` to mock MongoDB operations. This approach is fast and doesn't require a running MongoDB instance.

```python
@pytest.fixture
def mock_mongodb():
    """Return a mongomock MongoDB client."""
    return AsyncMockClient()

@pytest.fixture
def app(mock_mongodb):
    """Create test app with mocked dependencies."""
    app = get_application()
    app.dependency_overrides[get_database] = lambda: mock_mongodb
    return app
```

### 2. Dependency Injection Testing

Uses FastAPI's dependency override system to inject mock services or databases.

```python
@pytest.fixture
def app_with_mocks():
    """Create test app with dependency overrides."""
    app = get_application()
    app.dependency_overrides[get_database] = get_test_database
    app.dependency_overrides[get_current_user] = get_test_user
    return app
```

### 3. Real MongoDB Testing

Tests against a real MongoDB instance, useful for full integration tests. Requires a running MongoDB instance or Docker container.

```python
@pytest.fixture(scope="session")
def mongodb_container():
    """Start MongoDB container for testing."""
    with MongoDBContainer("mongo:5.0") as mongo:
        yield mongo.get_connection_url()

@pytest.fixture
def real_mongodb(mongodb_container):
    """Return a real MongoDB client connected to the container."""
    client = AsyncIOMotorClient(mongodb_container)
    yield client
    client.close()
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=app

# Run specific test file
pytest tests/api/test_auth_api.py

# Run tests matching a pattern
pytest -k "auth"

# Run tests in verbose mode
pytest -v

# Generate HTML coverage report
pytest --cov=app --cov-report=html:tests/reports/coverage/
```

### Environment Setup

Tests can be configured via environment variables or a `.env.test` file:

```
MONGODB_TEST_URL=mongodb://localhost:27017/test_db
TEST_SECRET_KEY=test_secret_key
TEST_DEBUG=True
```

### Test Categories

```bash
# Run only unit tests
pytest -m "unit"

# Run only integration tests
pytest -m "integration"

# Run only API tests
pytest -m "api"

# Run only performance tests
pytest -m "performance"

# Exclude slow tests
pytest -m "not slow"
```

### Test Reporting

The backend testing system generates standardized reports in the `tests/reports/` directory:

```bash
# Generate HTML report
pytest --html=tests/reports/html/report.html

# Generate JUnit XML report
pytest --junitxml=tests/reports/junit/report.xml

# Generate coverage report
pytest --cov=app --cov-report=html:tests/reports/coverage/
```

## Writing Tests

### Test Structure

Follow this pattern for writing tests:

```python
# Arrange - Set up test data and preconditions
# Act - Perform the action being tested
# Assert - Verify the expected outcome
```

Example:

```python
@pytest.mark.api
async def test_create_resource(client, test_user_token):
    # Arrange
    resource_data = {
        "title": "Test Resource",
        "url": "https://example.com/test",
        "resource_type": "article"
    }
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Act
    response = await client.post("/api/resources/", json=resource_data, headers=headers)

    # Assert
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == resource_data["title"]
    assert data["url"] == resource_data["url"]
    assert "id" in data
```