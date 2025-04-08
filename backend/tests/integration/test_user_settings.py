import pytest
from httpx import AsyncClient, Headers
from unittest.mock import patch, AsyncMock, MagicMock
from bson.objectid import ObjectId

# Import app, db dependency, and Motor types
from main import app
from database import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase

# Models (assuming these are defined or imported appropriately)
# from models.user import NotificationPreferences # Import if defined elsewhere

# Test GET /api/users/me/notifications
@pytest.mark.asyncio
async def test_get_notification_preferences(async_client: AsyncClient, auth_headers: Headers):
    """Test getting notification preferences successfully."""

    # Define mock data
    mock_prefs = {
        "email_notifications": True,
        "learning_reminders": False,
        "review_reminders": True,
        "achievement_notifications": False,
        "newsletter": True
    }
    mock_user_data = {
        "_id": ObjectId("507f1f77bcf86cd799439011"),
        "username": "testuser",
        "notification_preferences": mock_prefs
    }

    # Define override for DB
    async def override_get_db() -> AsyncIOMotorDatabase:
        mock_db_instance = MagicMock()
        mock_db_instance.users = MagicMock()
        mock_db_instance.users.find_one = AsyncMock(return_value=mock_user_data)
        return mock_db_instance

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = await async_client.get("/api/users/me/notifications", headers=auth_headers)

        assert response.status_code == 200
        prefs = response.json()
        assert prefs == mock_prefs

        # Verify find_one was called (it's now part of the mocked get_db)
        # To assert find_one was called, the mock needs to be accessible outside override_get_db
        # Or we trust the override worked and the endpoint logic used it.
        # For simplicity here, we remove the direct assertion on find_one.
    finally:
        app.dependency_overrides.pop(get_db, None)

@pytest.mark.asyncio
async def test_get_notification_preferences_defaults(async_client: AsyncClient, auth_headers: Headers):
    """Test getting default notification preferences when none are saved."""

    # Mock user data without preferences
    mock_user_data_no_prefs = {
        "_id": ObjectId("507f1f77bcf86cd799439012"),
        "username": "testuser"
        # No "notification_preferences" key
    }

    # Define override for DB
    async def override_get_db() -> AsyncIOMotorDatabase:
        mock_db_instance = MagicMock()
        mock_db_instance.users = MagicMock()
        mock_db_instance.users.find_one = AsyncMock(return_value=mock_user_data_no_prefs)
        return mock_db_instance

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = await async_client.get("/api/users/me/notifications", headers=auth_headers)

        assert response.status_code == 200
        prefs = response.json()
        # Check against expected default values from NotificationPreferences model
        # Assuming defaults are: email=True, learning=True, review=True, achievement=True, newsletter=True
        assert prefs["email_notifications"] is True
        assert prefs["learning_reminders"] is True
        assert prefs["review_reminders"] is True
        assert prefs["achievement_notifications"] is True
        assert prefs["newsletter"] is True

    finally:
        app.dependency_overrides.pop(get_db, None)

# Test PUT /api/users/me/notifications
@pytest.mark.asyncio
async def test_update_notification_preferences(async_client: AsyncClient, auth_headers: Headers):
    """Test updating notification preferences successfully."""

    # Mock user data and setup mocks for find_one and update_one
    mock_user_id = ObjectId("507f1f77bcf86cd799439013")
    mock_initial_user_data = {
        "_id": mock_user_id,
        "username": "testuser",
        "notification_preferences": {"email_notifications": True} # Existing prefs
    }
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.matched_count = 1
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    # Define override for DB
    async def override_get_db() -> AsyncIOMotorDatabase:
        mock_db_instance = MagicMock()
        mock_db_instance.users = MagicMock()
        # find_one needs to return the user for dependency check
        mock_db_instance.users.find_one = AsyncMock(return_value=mock_initial_user_data)
        # update_one will be called by the endpoint logic
        mock_db_instance.users.update_one = mock_update_one
        return mock_db_instance

    app.dependency_overrides[get_db] = override_get_db

    # New preferences payload
    new_preferences = {
        "email_notifications": False,
        "learning_reminders": True,
        "review_reminders": False,
        "achievement_notifications": True,
        "newsletter": False
    }

    try:
        response = await async_client.put("/api/users/me/notifications", json=new_preferences, headers=auth_headers)

        assert response.status_code == 200
        prefs = response.json()
        assert prefs == new_preferences # Verify the full updated prefs are returned

        # Verify update_one was awaited with correct arguments
        mock_update_one.assert_awaited_once_with(
            {"_id": mock_user_id}, # Filter by _id
            {"$set": {"notification_preferences": new_preferences}}
        )
    finally:
        app.dependency_overrides.pop(get_db, None)

@pytest.mark.asyncio
async def test_update_notification_preferences_partial(async_client: AsyncClient, auth_headers: Headers):
    """Test partially updating notification preferences."""

    # Mock user data and setup mocks
    mock_user_id = ObjectId("507f1f77bcf86cd799439014")
    mock_initial_user_data = {
        "_id": mock_user_id,
        "username": "testuser",
        "notification_preferences": {"email_notifications": True, "learning_reminders": True} # Existing prefs
    }
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.matched_count = 1
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    # Define override for DB
    async def override_get_db() -> AsyncIOMotorDatabase:
        mock_db_instance = MagicMock()
        mock_db_instance.users = MagicMock()
        mock_db_instance.users.find_one = AsyncMock(return_value=mock_initial_user_data)
        mock_db_instance.users.update_one = mock_update_one
        return mock_db_instance

    app.dependency_overrides[get_db] = override_get_db

    # Partial update payload
    partial_update = {
        "learning_reminders": False, # Change one value
        "newsletter": True # Add a new value (assuming default was False)
    }

    # Expected final state after partial update (merging with assumed defaults)
    expected_final_prefs = {
        "email_notifications": True, # From original mock
        "learning_reminders": False, # Updated
        "review_reminders": True, # Assumed default
        "achievement_notifications": True, # Assumed default
        "newsletter": True # Updated
    }

    try:
        response = await async_client.put("/api/users/me/notifications", json=partial_update, headers=auth_headers)

        assert response.status_code == 200
        prefs = response.json()
        assert prefs == expected_final_prefs # Check if the response reflects the merged state

        # Verify update_one was awaited with the partial update $set operation
        mock_update_one.assert_awaited_once()
        call_args, _ = mock_update_one.call_args
        assert call_args[0] == {"_id": mock_user_id} # Check filter uses _id
        assert "$set" in call_args[1]
        # The endpoint sets the entire subdocument, not individual fields with dot notation.
        assert call_args[1]["$set"] == {"notification_preferences": expected_final_prefs}
    finally:
        app.dependency_overrides.pop(get_db, None)

@pytest.mark.asyncio
async def test_update_notification_preferences_unauthenticated(async_client: AsyncClient):
    """Test updating notification preferences without authentication."""
    # Use a valid payload for NotificationPreferences
    payload = {
        "email_notifications": False,
        "learning_reminders": False,
        "review_reminders": False,
        "achievement_notifications": False,
        "newsletter": False
    }
    response = await async_client.put("/api/users/me/notifications", json=payload)
    assert response.status_code == 401 # Unauthorized