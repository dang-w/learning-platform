import pytest
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token, get_current_user, get_current_active_user
from datetime import timedelta
from unittest.mock import patch, AsyncMock

class MockUser:
    def __init__(self, username="testuser"):
        self.username = username
        self.email = f"{username}@example.com"
        self.full_name = f"Test User {username.capitalize()}"
        self.disabled = False
        self.id = username
        self.user_id = username
        self.roles = ["user"]
        self.permissions = ["read:own", "write:own"]
        self.resources = {
            "articles": [],
            "videos": [],
            "courses": [],
            "books": []
        }
        self.preferences = {"theme": "light", "notifications": True}

    def dict(self):
        return {
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "id": self.id,
            "user_id": self.user_id,
            "roles": self.roles,
            "permissions": self.permissions,
            "resources": self.resources,
            "preferences": self.preferences
        }

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

    # Override the dependencies
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    try:
        # Mock the database health check
        with patch('database.verify_db_connection', new_callable=AsyncMock) as mock_verify:
            mock_verify.return_value = True

            # Test the user profile endpoint which was previously skipped due to validation errors
            response = client.get("/users/me/")
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