import pytest
from httpx import AsyncClient
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

@pytest.mark.integration
@pytest.mark.asyncio
async def test_user_profile(async_client, auth_headers):
    """
    Test that the user profile can be retrieved using the AsyncClient.
    """
    # Create a test user
    username = "testuser"
    user_data = {
        "username": username,
        "email": f"{username}@example.com",
        "full_name": f"Test User {username.capitalize()}",
        "disabled": False
    }

    # Create a mock for get_current_active_user function
    mock_get_current_active_user = AsyncMock(return_value=user_data)

    # Patch the get_current_active_user function
    with patch('auth.get_current_active_user', mock_get_current_active_user):
        # Get user profile
        response = await async_client.get("/users/me/", headers=auth_headers)

        # Verify the response using the standardized response model
        user_data = verify_response(response)
        assert user_data["username"] == username
        assert user_data["email"] == f"{username}@example.com"
        assert user_data["full_name"] == f"Test User {username.capitalize()}"
        assert user_data["disabled"] is False

@pytest.mark.integration
@pytest.mark.asyncio
async def test_user_profile_unauthorized():
    """
    Test that the user profile cannot be accessed without authentication.
    """
    # Create a new async client without authentication
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Try to get user profile without auth headers
        response = await client.get("/users/me/")

        # Verify the response is unauthorized
        assert response.status_code == 401
        response_json = response.json()
        assert "detail" in response_json
        assert response_json["detail"] == "Not authenticated"