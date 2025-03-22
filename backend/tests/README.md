# Backend Test Implementation Details

> **Note:** This document focuses on test-specific implementation details. For a comprehensive guide on backend testing, please refer to the [Backend Testing Guide](/backend/TESTING.md).

## Test Directory Structure

Tests are organized into the following directories:

- `tests/api/`: Tests for API endpoints
- `tests/services/`: Tests for service functions
- `tests/integration/`: Integration tests that test multiple components together
- `tests/utils/`: Tests for utility functions
- `tests/config/`: Tests for configuration functions

## Shared Test Utilities

Common test utilities are defined in:

- `tests/conftest.py`: Pytest fixtures and shared utilities
- `tests/mock_db.py`: Mock database implementation for testing
- `tests/setup_test_env.py`: Setup script for the test environment

## Technical Implementation Details

### Authentication Mocking

Use synchronous functions for mocking authentication dependencies:

```python
# Create a mock user
mock_user = MockUser(username="testuser")

# Override the dependencies with synchronous functions
app.dependency_overrides[get_current_user] = lambda: mock_user
app.dependency_overrides[get_current_active_user] = lambda: mock_user
```

For simulating authentication failures:

```python
# Override the dependencies with a synchronous function that raises an exception
def override_get_current_user():
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )

app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_current_active_user] = override_get_current_user
```

### Dependency Override Management

Always clear dependency overrides before and after each test:

```python
@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    # Clear any existing overrides
    app.dependency_overrides.clear()

    yield

    # Clear overrides after the test
    app.dependency_overrides.clear()
```

### Database Mocking Techniques

Use `AsyncMock` for mocking async database operations:

```python
# Create an AsyncMock for the database operations
mock_db = MagicMock()
mock_db.resources = MagicMock()
mock_db.resources.find_one = AsyncMock(return_value=test_data)

# Patch the main module's db object
with patch("main.db", mock_db):
    response = client.get("/resources/test_id", headers=auth_headers)

    assert response.status_code == 200
```

For operations that return a result object:

```python
# Create an AsyncMock for the database operations
mock_db = MagicMock()
mock_db.resources = MagicMock()
mock_db.resources.insert_one = AsyncMock()
mock_db.resources.insert_one.return_value = MagicMock()
mock_db.resources.insert_one.return_value.inserted_id = "new_resource_id"

# Patch the main module's db object
with patch("main.db", mock_db):
    response = client.post("/resources/", json=new_resource, headers=auth_headers)

    assert response.status_code == 201
```

### Avoiding Event Loop Issues

To avoid event loop issues, follow these guidelines:

1. Use `AsyncMock` for mocking async database operations
2. Patch the database object directly rather than individual methods
3. Use the `client` fixture from `conftest.py` for making requests
4. Ensure mocked async functions return awaitable objects

### Test Data Formatting

Ensure test data matches the expected schema:

```python
# Test data with all required fields
new_review = {
    "resource_id": 1,  # Use integer IDs
    "resource_type": "article",
    "rating": 5,
    "content": "Great resource!",
    "tags": ["python", "fastapi"],
    "difficulty_rating": 3,  # Include all required fields
    "topics": ["python", "fastapi"]
}
```

## Test Template Examples

Reference template files for writing new tests:

- `tests/api/test_template.py`: General template for API tests (skipped when running tests)
- `tests/api/test_auth_api.py`: Template for authentication tests
- `tests/api/test_user_api.py`: Template for user API tests
- `tests/api/test_reviews_api.py`: Template for reviews API tests

## Troubleshooting Common Issues

### Event Loop Errors

If you encounter "Event loop is closed" errors:
1. Ensure you're using `AsyncMock` for async functions
2. Use monkeypatching for auth endpoints instead of making real requests
3. Add proper cleanup in fixture teardowns

### Database Connection Issues

For problems with database connections in tests:
1. Check if you're using the test database URL in `.env.test`
2. Ensure MongoDB is running if using a real database
3. For CI environments, use mongomock instead of real connections

### Authentication Test Failures

If authentication tests fail:
1. Ensure the mock tokens match the expected format
2. Check that all required fields are included in the mock user
3. Verify that dependency overrides are properly set up

## Reference

For full testing documentation, see:
- [Backend Testing Guide](/backend/TESTING.md)
- [Unified Testing Guide](/docs/testing/UNIFIED_TESTING_GUIDE.md)