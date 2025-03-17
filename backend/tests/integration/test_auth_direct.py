import pytest
import pytest_asyncio
from database import db
from auth import create_access_token, get_current_user, get_current_active_user
from datetime import timedelta
from fastapi import Depends

@pytest.mark.integration
@pytest.mark.asyncio
async def test_authentication_direct():
    """
    Test that authentication works directly without using the TestClient.
    """
    # Create a test user
    username = "test_auth_user"
    user_data = {
        "username": username,
        "email": f"{username}@example.com",
        "full_name": "Test Auth User",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
        "disabled": False,
        "resources": [],
        "study_sessions": [],
        "review_sessions": [],
        "learning_paths": [],
        "reviews": [],
        "concepts": [],
        "goals": [],
        "milestones": []
    }

    # Check if user already exists and delete if needed
    existing_user = await db.users.find_one({"username": username})
    if existing_user:
        await db.users.delete_one({"_id": existing_user["_id"]})

    # Insert the test user
    result = await db.users.insert_one(user_data)
    assert result.inserted_id is not None

    # Create a token for the test user
    token = create_access_token(data={"sub": username}, expires_delta=timedelta(days=1))

    # Verify the token works with get_current_user
    user = await get_current_user(token)
    assert user is not None
    assert user["username"] == username

    # Verify the token works with get_current_active_user
    active_user = await get_current_active_user(user)
    assert active_user is not None
    assert active_user["username"] == username

    # Clean up
    await db.users.delete_one({"username": username})