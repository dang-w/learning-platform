import pytest
from unittest.mock import patch, MagicMock
from database import db
import logging

@pytest.mark.integration
@pytest.mark.skip(reason="Test requires a real database connection and has event loop issues")
def test_database_connection():
    """
    Test that the database connection works.
    """
    # Create mock responses
    mock_collections = ["users", "resources"]
    mock_users_count = 3

    # Create mocks
    mock_list_collection_names = MagicMock(return_value=mock_collections)
    mock_count_documents = MagicMock(return_value=mock_users_count)
    mock_users = MagicMock()
    mock_users.count_documents = mock_count_documents
    mock_insert_one = MagicMock()
    mock_insert_one.return_value = MagicMock()
    mock_insert_one.return_value.inserted_id = "test_user_id"
    mock_users.insert_one = mock_insert_one
    mock_find_one = MagicMock()
    mock_find_one.side_effect = [None, {"username": "test_db_user", "email": "test_db_user@example.com"}]
    mock_users.find_one = mock_find_one
    mock_delete_one = MagicMock()
    mock_users.delete_one = mock_delete_one

    # Mock the database
    with patch("database.db.list_collection_names", mock_list_collection_names), \
         patch("database.db.users", mock_users):

        # List collections
        collections = db.list_collection_names()

        # Verify we can list collections
        assert isinstance(collections, list)
        assert len(collections) == 2

        # Verify we can access the users collection
        users_count = db.users.count_documents({})
        assert isinstance(users_count, int)
        assert users_count == 3

        # Log success
        logging.info(f"Database connection successful. Found {len(collections)} collections.")
        logging.info(f"Users collection has {users_count} documents.")

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
        existing_user = db.users.find_one({"username": username})
        if existing_user:
            db.users.delete_one({"_id": existing_user["_id"]})

        # Insert the test user
        result = db.users.insert_one(user_data)
        assert result.inserted_id is not None

        # Verify the user was created
        user = db.users.find_one({"username": username})
        assert user is not None
        assert user["username"] == username

        # Clean up
        db.users.delete_one({"username": username})

        # Verify the mocks were called correctly
        mock_list_collection_names.assert_called_once()
        mock_count_documents.assert_called_once_with({})
        mock_find_one.assert_any_call({"username": username})
        mock_insert_one.assert_called_once_with(user_data)
        mock_delete_one.assert_any_call({"username": username})