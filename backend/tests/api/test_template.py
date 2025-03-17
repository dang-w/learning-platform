"""
Template for API test files.

This template follows the standards and patterns from the working tests.
Use this as a reference when updating the remaining test files.

NOTE: This file is a template and not meant to be run directly.
The endpoints used in this file (/resources/) are placeholders and don't exist in the application.
When using this template, replace the endpoints with the actual endpoints you want to test.
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import HTTPException, status

# Import the app and auth functions
from main import app
from auth import get_current_user, get_current_active_user

# Import standardized utilities
from utils.error_handlers import AuthenticationError, ResourceNotFoundError

# Import the MockUser class from conftest
from tests.conftest import MockUser

# Test data
test_data = {
    "id": "test_id",
    "name": "Test Name",
    "description": "Test Description"
}

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    # Clear any existing overrides
    app.dependency_overrides.clear()

    yield

    # Clear overrides after the test
    app.dependency_overrides.clear()

@pytest.mark.skip(reason="This is a template test and not meant to be run directly")
def test_get_resource_authenticated(client, auth_headers):
    """Test getting a resource when authenticated."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create an AsyncMock for the database operations
    mock_db = MagicMock()
    mock_db.resources = MagicMock()
    mock_db.resources.find_one = AsyncMock(return_value=test_data)

    # Patch the main module's db object
    with patch("main.db", mock_db):
        response = client.get("/resources/test_id", headers=auth_headers)

        assert response.status_code == 200
        resource_data = response.json()
        assert resource_data["id"] == test_data["id"]
        assert resource_data["name"] == test_data["name"]
        assert resource_data["description"] == test_data["description"]

@pytest.mark.skip(reason="This is a template test and not meant to be run directly")
def test_get_resource_unauthenticated(client):
    """Test getting a resource when unauthenticated."""
    # Override the dependencies with a synchronous function that raises an exception
    def override_get_current_user():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_active_user] = override_get_current_user

    response = client.get("/resources/test_id")

    assert response.status_code == 401
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Not authenticated"

@pytest.mark.skip(reason="This is a template test and not meant to be run directly")
def test_get_resource_not_found(client, auth_headers):
    """Test getting a resource that doesn't exist."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create an AsyncMock for the database operations
    mock_db = MagicMock()
    mock_db.resources = MagicMock()
    mock_db.resources.find_one = AsyncMock(return_value=None)

    # Patch the main module's db object
    with patch("main.db", mock_db):
        response = client.get("/resources/nonexistent_id", headers=auth_headers)

        assert response.status_code == 404
        error_response = response.json()
        assert "detail" in error_response
        assert "not found" in error_response["detail"]

@pytest.mark.skip(reason="This is a template test and not meant to be run directly")
def test_create_resource(client, auth_headers):
    """Test creating a new resource."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # New resource data
    new_resource = {
        "name": "New Resource",
        "description": "New Description"
    }

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
        resource_data = response.json()
        assert resource_data["name"] == new_resource["name"]
        assert resource_data["description"] == new_resource["description"]
        assert "id" in resource_data

@pytest.mark.skip(reason="This is a template test and not meant to be run directly")
def test_update_resource(client, auth_headers):
    """Test updating an existing resource."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Updated resource data
    updated_resource = {
        "name": "Updated Resource",
        "description": "Updated Description"
    }

    # Create an AsyncMock for the database operations
    mock_db = MagicMock()
    mock_db.resources = MagicMock()
    mock_db.resources.find_one = AsyncMock(return_value=test_data)
    mock_db.resources.update_one = AsyncMock()
    mock_db.resources.update_one.return_value = MagicMock()
    mock_db.resources.update_one.return_value.modified_count = 1

    # Patch the main module's db object
    with patch("main.db", mock_db):
        response = client.put("/resources/test_id", json=updated_resource, headers=auth_headers)

        assert response.status_code == 200
        resource_data = response.json()
        assert resource_data["name"] == updated_resource["name"]
        assert resource_data["description"] == updated_resource["description"]
        assert resource_data["id"] == test_data["id"]

@pytest.mark.skip(reason="This is a template test and not meant to be run directly")
def test_delete_resource(client, auth_headers):
    """Test deleting an existing resource."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

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