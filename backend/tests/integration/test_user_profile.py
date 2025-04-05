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
    # Get expected username from the fixture
    expected_username = setup_test_user["user"]["username"]

    # Expected data structure (fetch from mock DB within override)
    # We still need to define the expected normalized structure for assertion
    user_from_fixture = setup_test_user["user"] # Keep for defining expectation
    expected_base_user_data = {
        "id": serialize_object_id(user_from_fixture.get("_id")),
        "username": user_from_fixture["username"],
        "email": user_from_fixture["email"],
        "first_name": user_from_fixture["first_name"],
        "last_name": user_from_fixture["last_name"],
        "disabled": user_from_fixture["disabled"],
        "is_active": True,
        "resources": user_from_fixture.get("resources", {"articles": [], "videos": [], "courses": [], "books": []}),
        "study_sessions": user_from_fixture.get("study_sessions", []),
        "review_sessions": user_from_fixture.get("review_sessions", []),
        "learning_paths": user_from_fixture.get("learning_paths", []),
        "reviews": user_from_fixture.get("reviews", []),
        "concepts": user_from_fixture.get("concepts", []),
        "goals": user_from_fixture.get("goals", []),
        "metrics": user_from_fixture.get("metrics", []),
        "review_log": user_from_fixture.get("review_log", {}),
        "milestones": user_from_fixture.get("milestones", [])
    }

    # Override the dependency to fetch and return the raw data from mock DB
    async def override_get_current_active_user():
        # Simulate fetching the user data as the real dependency would
        # Import the mock db directly here for the override
        from tests.mock_db import db
        user_doc = await db.users.find_one({"username": expected_username})
        if not user_doc:
            raise AuthenticationError("User not found in mock DB during override") # Or appropriate exception
        # Simulate the check for disabled user (if get_current_active_user normally does)
        if user_doc.get("disabled"):
            raise HTTPException(status_code=400, detail="Inactive user")
        return user_doc # Return the raw document fetched from mock DB

    app.dependency_overrides[get_current_active_user] = override_get_current_active_user

    try:
        # Get user profile
        response = await async_client.get("/api/users/me/")

        # Assertions
        assert response.status_code == 200
        response_data = response.json()

        # Compare the response (which should be normalized) with the expected *normalized* data
        # Convert datetimes in expected data to ISO strings for comparison
        # if expected_base_user_data["created_at"]:
        #     expected_base_user_data["created_at"] = user_from_fixture["created_at"].isoformat()
        if "updated_at" in user_from_fixture and user_from_fixture["updated_at"]:
             expected_base_user_data["updated_at"] = user_from_fixture["updated_at"].isoformat()
        else:
            # Handle case where updated_at might not be in fixture or is None
            expected_base_user_data.pop("updated_at", None)

        # Ensure all expected keys are present in the response
        for key in expected_base_user_data:
            assert key in response_data, f"Expected key '{key}' not found in response"

        # Check core fields
        assert response_data["id"] == expected_base_user_data["id"]
        assert response_data["username"] == expected_base_user_data["username"]
        assert response_data["email"] == expected_base_user_data["email"]

        # Explicitly check for created_at and updated_at in the response
        # assert "created_at" in response_data
        # assert isinstance(response_data["created_at"], str) # Should be ISO string
        assert "updated_at" in response_data
        assert isinstance(response_data["updated_at"], str) # Should be ISO string

        # Check a few other expected fields
        assert "resources" in response_data
        assert "study_sessions" in response_data

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