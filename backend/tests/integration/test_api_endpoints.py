import pytest
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token, get_current_user, get_current_active_user
from datetime import timedelta
from unittest.mock import patch, AsyncMock

class MockUser:
    """Mock user for testing."""

    def __init__(self, username="testuser"):
        self.username = username
        self.email = f"{username}@example.com"
        self.full_name = f"Test User {username.capitalize()}"
        self.disabled = False
        self.id = username
        self.user_id = username
        self.roles = ["user"]
        self.permissions = ["read:own", "write:own"]
        self.created_at = "2023-01-01T00:00:00"
        self.updated_at = "2023-01-01T00:00:00"
        self.last_login = "2023-01-01T00:00:00"
        self.preferences = {"theme": "light", "notifications": True}

    def dict(self):
        """Convert user to dict for Pydantic v1 compatibility."""
        return {
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "disabled": self.disabled,
            "id": self.id,
            "user_id": self.user_id,
            "roles": self.roles,
            "permissions": self.permissions,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_login": self.last_login,
            "preferences": self.preferences
        }

    def model_dump(self):
        """Convert user to dict for Pydantic v2 compatibility."""
        return self.dict()

@pytest.mark.integration
def test_api_endpoints():
    """
    Test various API endpoints using the TestClient.
    This test only verifies that the endpoints are accessible and return the expected status codes.
    """
    # Create a test client
    client = TestClient(app)

    # Override the authentication dependencies
    mock_user = MockUser(username="testuser")
    # Make sure the mock user has all required fields
    mock_user.created_at = "2023-01-01T00:00:00"

    # Override the dependencies
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    try:
        # Mock the database health check
        with patch('database.verify_db_connection', new_callable=AsyncMock) as mock_verify:
            mock_verify.return_value = True

            # Test the user profile endpoint which was previously skipped due to validation errors
            response = client.get("/api/users/me/")
            assert response.status_code == 200, f"User profile error: {response.content}"

            # Test health check endpoint
            response = client.get("/api/health")
            assert response.status_code == 200, f"Failed health check: {response.content}"

            # Test API documentation endpoint
            response = client.get("/docs")
            assert response.status_code == 200, f"Failed to access API docs: {response.content}"

            # Test OpenAPI schema endpoint
            response = client.get("/openapi.json")
            assert response.status_code == 200, f"Failed to get OpenAPI schema: {response.content}"
    finally:
        # Clear dependency overrides
        app.dependency_overrides.clear()