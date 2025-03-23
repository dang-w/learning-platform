import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
from main import app
from auth import create_access_token, get_current_user, get_current_active_user
from datetime import timedelta

# Import standardized utilities
from utils.error_handlers import AuthenticationError
from utils.response_models import StandardResponse
from utils.validators import validate_required_fields
from database import get_database

# Import test utilities
from tests.integration.test_utils import verify_response

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()

@pytest.mark.integration
def test_authentication(client, auth_headers):
    """
    Test that authentication works with a valid token.
    """
    # Make a request with the auth headers
    response = client.get("/api/users/me/", headers=auth_headers)

    # Verify the response using the standardized response model
    user_data = verify_response(response)
    assert user_data["username"] == "testuser"
    assert "email" in user_data
    assert "full_name" in user_data

@pytest.mark.integration
def test_authentication_failure():
    """
    Test that authentication fails with an invalid token.
    """
    # Create a test client
    client = TestClient(app)

    # Create invalid auth headers
    invalid_headers = {"Authorization": "Bearer invalid_token"}

    # Make a request with invalid auth headers
    response = client.get("/api/users/me/", headers=invalid_headers)

    # Verify the response is unauthorized
    assert response.status_code == 401
    response_json = response.json()
    # FastAPI returns a standard error format with a "detail" field
    assert "detail" in response_json
    assert response_json["detail"] == "Could not validate credentials"