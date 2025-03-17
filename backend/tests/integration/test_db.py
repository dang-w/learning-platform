import pytest
import pytest_asyncio
from database import db

@pytest.mark.integration
@pytest.mark.asyncio
async def test_database_connection():
    """
    Test that the database connection works.
    """
    # List collections
    collections = await db.list_collection_names()
    assert isinstance(collections, list)

    # Create a test user
    username = "test_db_user"
    user_data = {
        "username": username,
        "email": f"{username}@example.com",
        "full_name": "Test DB User",
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

    # Verify the user was created
    user = await db.users.find_one({"username": username})
    assert user is not None
    assert user["username"] == username

    # Clean up
    await db.users.delete_one({"username": username})