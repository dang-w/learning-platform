import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch
from main import app
from auth import create_access_token, get_current_user, get_current_active_user
from datetime import timedelta
from fastapi import FastAPI
from tests.conftest import setup_test_user
from tests.utils import serialize_object_id

# Import standardized utilities
from utils.error_handlers import AuthenticationError
from utils.response_models import StandardResponse
from utils.validators import validate_required_fields
from database import get_database

# Import test utilities
from tests.integration.test_utils import verify_response

# Mark all tests in this file as integration tests
pytestmark = pytest.mark.integration

@pytest.mark.asyncio
async def test_user_profile(async_client: AsyncClient, setup_test_user):
    """
    Test that the user profile can be retrieved using the AsyncClient.
    Relies on setup_test_user fixture from conftest.
    Uses app.dependency_overrides to mock get_current_active_user, providing raw data.
    """
    # Get user data from the fixture (contains _id)
    user_from_fixture = setup_test_user["user"]

    # Data to be returned by the mocked dependency (raw format with _id)
    raw_user_data_for_dependency = user_from_fixture.copy() # Use a copy

    # Expected data AFTER normalization by the endpoint (contains id)
    expected_normalized_user_data = {
        "id": serialize_object_id(user_from_fixture.get("_id")), # Serialized ID
        "username": user_from_fixture["username"],
        "email": user_from_fixture["email"],
        "first_name": user_from_fixture["first_name"],
        "last_name": user_from_fixture["last_name"],
        "disabled": user_from_fixture["disabled"],
        "created_at": user_from_fixture["created_at"].isoformat().replace('+00:00', 'Z'),
        "updated_at": user_from_fixture["updated_at"].isoformat().replace('+00:00', 'Z') if user_from_fixture.get("updated_at") else None,
        # Include other fields expected by the User model after normalization
        "is_active": True, # Default or derive as needed
        "resources": {  # Ensure default/expected structure
            "articles": [],
            "videos": [],
            "courses": [],
            "books": []
        },
        "study_sessions": [],
        "review_sessions": [],
        "learning_paths": [],
        "reviews": [],
        "concepts": [],
        "goals": [],
        "metrics": [],
        "review_log": {},
        "milestones": []
    }

    # Override the dependency to return the raw data
    app.dependency_overrides[get_current_active_user] = lambda: raw_user_data_for_dependency

    try:
        # Get user profile - auth_headers are applied automatically by async_client fixture
        response = await async_client.get("/api/users/me/")

        # Assertions
        assert response.status_code == 200
        response_data = response.json()

        # Compare the response (which should be normalized) with the expected *normalized* data
        assert response_data["id"] == expected_normalized_user_data["id"]
        assert response_data["username"] == expected_normalized_user_data["username"]
        assert response_data["email"] == expected_normalized_user_data["email"]
        # ... compare other fields ...
        # Ensure all fields required by the User model are present and match
        for key in expected_normalized_user_data:
            assert key in response_data, f"Key '{key}' missing in response"
            # Add specific comparisons if needed, e.g., for nested structures
            if key == "created_at" or key == "updated_at":
                # Handle potential None for updated_at
                if expected_normalized_user_data[key] is not None:
                    # Normalize response data as well before comparing
                    response_dt_str = response_data[key].replace('+00:00', 'Z')
                    assert response_dt_str == expected_normalized_user_data[key]
            elif isinstance(expected_normalized_user_data[key], (dict, list)):
                assert response_data[key] == expected_normalized_user_data[key]
            else:
                assert response_data[key] == expected_normalized_user_data[key], f"Value mismatch for key '{key}'"

    finally:
        # Clean up the dependency override
        app.dependency_overrides.pop(get_current_active_user, None)

@pytest.mark.asyncio
async def test_user_profile_unauthorized(async_client: AsyncClient):
    """Test unauthorized access to the user profile endpoint."""
    # Ensure dependency overrides are cleared for unauthenticated state
    # Make request without authentication headers
    response = await async_client.get("/api/users/me/")
    assert response.status_code == 401

@pytest.mark.integration
@pytest.mark.asyncio
async def test_user_profile_unauthorized():
    """
    Test that the user profile cannot be accessed without authentication.
    """
    # Create a new async client without authentication
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Try to get user profile without auth headers
        response = await client.get("/api/users/me/")

        # Verify the response is unauthorized
        assert response.status_code == 401
        response_json = response.json()
        assert "detail" in response_json
        assert response_json["detail"] == "Not authenticated"