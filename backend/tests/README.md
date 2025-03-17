# Testing Guidelines

This document outlines the standards and best practices for writing tests in the Learning Platform backend.

## Test Structure

Tests are organized into the following directories:

- `tests/api/`: Tests for API endpoints
- `tests/services/`: Tests for service functions
- `tests/integration/`: Integration tests that test multiple components together
- `tests/utils/`: Tests for utility functions
- `tests/config/`: Tests for configuration functions

## Shared Utilities

Common test utilities are defined in:

- `tests/conftest.py`: Pytest fixtures and shared utilities
- `tests/mock_db.py`: Mock database implementation for testing
- `tests/setup_test_env.py`: Setup script for the test environment

## Standards for Writing Tests

### Imports

Always import from the correct modules:

```python
# Import the app and auth functions
from main import app
from auth import get_current_user, get_current_active_user, oauth2_scheme

# Import standardized utilities
from utils.error_handlers import AuthenticationError, ResourceNotFoundError
from utils.response_models import StandardResponse, ErrorResponse

# Import mocking utilities
from unittest.mock import patch, AsyncMock, MagicMock
```

### Dependency Overrides

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

### Database Mocking

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

### Event Loop Issues

To avoid event loop issues, follow these guidelines:

1. Use `AsyncMock` for mocking async database operations
2. Patch the database object directly rather than individual methods
3. Use the `client` fixture from `conftest.py` for making requests
4. Ensure mocked async functions return awaitable objects

Example of proper async mocking:

```python
# Create an AsyncMock for the database operations
mock_db = MagicMock()
mock_db.users = MagicMock()
mock_db.users.find_one = AsyncMock(return_value=None)
mock_db.users.insert_one = AsyncMock()
mock_db.users.insert_one.return_value = MagicMock()
mock_db.users.insert_one.return_value.inserted_id = "newuser"

# Patch the main module's db object
with patch("main.db", mock_db):
    response = client.post("/users/", json=new_user)
```

### Test Data

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

### Assertions

Use flexible assertions when the response format might vary:

```python
# Check for the presence of key fields rather than exact matches
assert "study_time" in response_data
assert "topics" in response_data
assert "consistency" in response_data
assert "average_confidence" in response_data
```

### Test Templates

Use the template files as a reference for writing new tests:

- `tests/api/test_template.py`: General template for API tests (skipped when running tests)
- `tests/api/test_auth_api.py`: Template for authentication tests
- `tests/api/test_user_api.py`: Template for user API tests
- `tests/api/test_reviews_api.py`: Template for reviews API tests
- `tests/api/test_progress_api.py`: Template for progress API tests
- `tests/api/test_resources_api.py`: Template for resources API tests

## Running Tests

Run all tests:

```bash
python -m pytest
```

Run a specific test file:

```bash
python -m pytest tests/api/test_auth_api.py
```

Run a specific test:

```bash
python -m pytest tests/api/test_auth_api.py::test_login_with_valid_credentials
```

## Troubleshooting

### Event Loop Issues

If you encounter event loop issues (e.g., "Event loop is closed" or "object NoneType can't be used in 'await' expression"), try the following:

1. Use `AsyncMock` for mocking async database operations
2. Patch the database object directly rather than individual methods
3. Ensure mocked async functions return awaitable objects
4. Check if the test is trying to use an async function directly
5. Use the `client` fixture from `conftest.py` for making requests

### Authentication Issues

If you encounter authentication issues, check the following:

1. Make sure you're using the correct dependency overrides
2. Check if the test is using the correct auth headers
3. Make sure the mock user has the correct permissions

### Database Issues

If you encounter database issues, check the following:

1. Make sure you're mocking all database operations with `AsyncMock`
2. Check if the mock data has the correct structure and includes all required fields
3. Make sure the mock operations return the expected results
4. Ensure you're patching the database object directly rather than individual methods

## Common Patterns

### Creating a New Resource

```python
# Create an AsyncMock for the database operations
mock_db = MagicMock()
mock_db.resources = MagicMock()
mock_db.resources.find_one = AsyncMock(return_value=None)
mock_db.resources.insert_one = AsyncMock()
mock_db.resources.insert_one.return_value = MagicMock()
mock_db.resources.insert_one.return_value.inserted_id = "new_resource_id"

# Patch the main module's db object
with patch("main.db", mock_db):
    response = client.post("/resources/", json=new_resource, headers=auth_headers)

    assert response.status_code == 201
```

### Getting a Resource

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

### Updating a Resource

```python
# Create an AsyncMock for the database operations
mock_db = MagicMock()
mock_db.resources = MagicMock()
mock_db.resources.find_one = AsyncMock(return_value=test_data)
mock_db.resources.update_one = AsyncMock()
mock_db.resources.update_one.return_value = MagicMock()
mock_db.resources.update_one.return_value.modified_count = 1

# Patch the main module's db object
with patch("main.db", mock_db):
    response = client.put("/resources/test_id", json=updated_data, headers=auth_headers)

    assert response.status_code == 200
```

### Deleting a Resource

```python
# Create an AsyncMock for the database operations
mock_db = MagicMock()
mock_db.resources = MagicMock()
mock_db.resources.find_one = AsyncMock(return_value=test_data)
mock_db.resources.delete_one = AsyncMock()
mock_db.resources.delete_one.return_value = MagicMock()
mock_db.resources.delete_one.return_value.deleted_count = 1

# Patch the main module's db object
with patch("main.db", mock_db):
    response = client.delete("/resources/test_id", headers=auth_headers)

    assert response.status_code == 204
```