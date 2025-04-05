"""
Fixed version of the reviews API tests.

This file follows the standardized testing approach with proper mocking
of async database operations and synchronous dependency overrides.
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
from bson import ObjectId

# Import the app and auth functions
from main import app
from auth import get_current_user, get_current_active_user, User
from database import get_db

# Import standardized utilities
from utils.error_handlers import AuthenticationError, ResourceNotFoundError

# Import the MockUser class from conftest
from tests.conftest import MockUser

# Import the httpx AsyncClient and ASGITransport
from httpx import AsyncClient, Headers, ASGITransport

# Add the parent directory to the path so we can import main
from pathlib import Path
import sys
import os
from copy import deepcopy

# Add the parent directory to the path so we can import main
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Import the database
# from database import db

# Import the serialization function
from tests.utils import serialize_object_id

# Import the fixtures
from tests.conftest import setup_test_user, auth_headers

# Import the models
from routers.reviews import Review, ReviewSettings

# Test data
test_concept = {
    "title": "Test Concept",
    "content": "This is a test concept",
    "topics": ["python", "testing"]
}

test_review = {
    "confidence": 4
}

test_resource_review = {
    "resource_type": "article",
    "resource_id": 1,
    "rating": 5,
    "content": "Great article",
    "difficulty_rating": 3,
    "topics": ["python", "testing"]
}

# Sample Review Data
sample_review_data = {
    "_id": ObjectId("67f2bc0c9cbc3233d1d53f9b"),
    "user_id": "testuser_other",  # Belongs to a different user initially
    "resource_type": "articles", # Use valid plural form
    "resource_id": 1,          # Changed to integer
    "rating": 4,
    "comment": "Good article.",
    "content": "Detailed review content here.", # Added
    "difficulty_rating": 3,                 # Added
    "topics": ["python", "fastapi"],         # Added
    "created_at": datetime.now(timezone.utc) - timedelta(days=1),
    "updated_at": datetime.now(timezone.utc),
    "date": (datetime.now(timezone.utc)).isoformat() # Corrected: Format date as ISO string
}

# Helper function for auth override
def create_mock_user_dict(username="testuser"):
    return {
        "username": username,
        "email": f"{username}@example.com",
        "disabled": False,
        "_id": ObjectId() # Simulate a DB user object structure
        # Add other User model fields if needed by endpoints
    }

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    # Clear any existing overrides
    app.dependency_overrides.clear()

    yield

    # Clear overrides after the test
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_get_reviews_empty(async_client, auth_headers):
    """Test getting reviews when none exist."""
    # Mock user for auth
    mock_user = MockUser(username="testuser")

    # Mock database
    mock_db = MagicMock()
    mock_db.reviews = MagicMock()
    mock_cursor = AsyncMock()
    mock_cursor.to_list.return_value = []
    mock_db.reviews.find = MagicMock(return_value=mock_cursor)
    mock_db.reviews.count_documents = AsyncMock(return_value=0)

    # Mock find_one on users collection for auth
    mock_db.users = MagicMock()
    mock_db.users.find_one = AsyncMock(return_value=mock_user)

    # Define override
    async def override_get_db():
        return mock_db

    # Apply overrides
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    response = await async_client.get("/api/reviews/", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data == [] # Expect an empty list

@pytest.mark.asyncio
async def test_create_resource_review(async_client, auth_headers):
    """Test creating a new review for a resource."""
    # Mock user for auth
    mock_user = MockUser(username="testuser")
    mock_user_db_data = create_mock_user_dict(mock_user.username) # Data for db.users.find_one

    new_review_payload = {
        "resource_type": "books",
        "resource_id": 123,
        "rating": 5,
        "comment": "Excellent book!",
        "content": "Review content",
        "difficulty_rating": 3,
        "topics": ["test"]
    }

    # Mock database
    mock_db = MagicMock()
    mock_db.reviews = MagicMock()
    mock_db.users = MagicMock()

    # Mock the update_one call on the users collection
    mock_update_result = MagicMock()
    mock_update_result.matched_count = 1
    mock_update_result.modified_count = 1
    mock_db.users.update_one = AsyncMock(return_value=mock_update_result)

    # Mock find_one on users for the initial check within the endpoint
    mock_db.users.find_one = AsyncMock(return_value=mock_user_db_data)

    # Define override
    async def override_get_db():
        return mock_db

    # Apply overrides
    app.dependency_overrides[get_db] = override_get_db
    # Override with User model instance created from dict
    mock_user_instance = User(**mock_user_db_data)
    app.dependency_overrides[get_current_active_user] = lambda: mock_user_instance

    response = await async_client.post("/api/reviews/", json=new_review_payload, headers=auth_headers)

    assert response.status_code == 201
    data = response.json()
    assert data["rating"] == new_review_payload["rating"]
    assert data["comment"] == new_review_payload["comment"]
    assert data["resource_id"] == new_review_payload["resource_id"]
    assert data["user_id"] == mock_user.username
    assert "id" in data

@pytest.mark.asyncio
async def test_get_reviews(async_client, auth_headers):
    """Test getting a list of existing reviews."""
    # Mock user for auth
    mock_user = MockUser(username="testuser")
    mock_user_db_data = create_mock_user_dict(mock_user.username)

    # Prepare mock data matching the user
    user_sample_review = deepcopy(sample_review_data)
    user_sample_review["user_id"] = mock_user.username

    # Mock database
    mock_db = MagicMock()
    mock_db.reviews = MagicMock()
    mock_db.users = MagicMock()

    # Mock the cursor returned by find to support async iteration
    mock_reviews_list = [serialize_object_id(user_sample_review)]
    async def mock_aiter(*args, **kwargs): # Accept arguments
        for item in mock_reviews_list:
            yield item
    mock_cursor = MagicMock()
    mock_cursor.__aiter__ = mock_aiter

    # Configure find mock to return the mock cursor
    # Assume endpoint filters correctly by user_id
    mock_db.reviews.find = MagicMock(return_value=mock_cursor)
    mock_db.reviews.count_documents = AsyncMock(return_value=len(mock_reviews_list))

    # Mock find_one on users collection for auth
    mock_db.users.find_one = AsyncMock(return_value=mock_user_db_data)

    # Define override
    async def override_get_db():
        return mock_db

    # Apply overrides
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = lambda: mock_user_db_data

    response = await async_client.get("/api/reviews/", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1 # Should pass now with correct async iteration mock
    assert data[0]["content"] == user_sample_review["content"]
    assert data[0]["rating"] == user_sample_review["rating"]
    assert data[0]["id"] == str(user_sample_review["_id"])

@pytest.mark.asyncio
async def test_get_reviews_by_resource(async_client, auth_headers):
    """Test getting reviews for a specific resource."""
    # Mock user for auth
    mock_user = MockUser(username="testuser")
    mock_user_db_data = create_mock_user_dict(mock_user.username)

    # Use the updated sample_review_data with integer resource_id and plural type
    resource_type = sample_review_data["resource_type"]
    resource_id = sample_review_data["resource_id"]

    # Prepare mock data matching the user and resource
    user_resource_sample_review = deepcopy(sample_review_data)
    user_resource_sample_review["user_id"] = mock_user.username

    # Mock database
    mock_db = MagicMock()
    mock_db.reviews = MagicMock()
    mock_db.users = MagicMock()

    # Mock the cursor returned by find to support async iteration
    mock_reviews_list = [serialize_object_id(user_resource_sample_review)]
    async def mock_aiter(*args, **kwargs): # Accept arguments
        for item in mock_reviews_list:
            yield item
    mock_cursor = MagicMock()
    mock_cursor.__aiter__ = mock_aiter

    # Configure find mock for the specific resource filter
    def find_side_effect(*args, **kwargs):
        filter_query = args[0] if args else kwargs.get("filter", {})
        expected_filter = {
            "resource_type": resource_type,
            "resource_id": resource_id,
            "user_id": mock_user.username
        }
        if filter_query == expected_filter:
            return mock_cursor
        # Return empty cursor otherwise
        empty_cursor = MagicMock()
        async def empty_aiter(*args, **kwargs): # Accept arguments
            if False: yield # Create an empty async generator
        empty_cursor.__aiter__ = empty_aiter
        return empty_cursor

    mock_db.reviews.find = MagicMock(side_effect=find_side_effect)
    mock_db.reviews.count_documents = AsyncMock(return_value=1)

    # Mock find_one on users collection for auth
    mock_db.users.find_one = AsyncMock(return_value=mock_user_db_data)

    # Define override
    async def override_get_db():
        return mock_db

    # Apply overrides
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = lambda: mock_user_db_data

    # Correct the URL to use the integer resource_id
    response = await async_client.get(f"/api/reviews/resource/{resource_type}/{resource_id}", headers=auth_headers)

    assert response.status_code == 200 # Should not be 500
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["resource_id"] == resource_id
    assert data[0]["resource_type"] == resource_type
    assert data[0]["user_id"] == mock_user.username

@pytest.mark.asyncio
async def test_update_review(async_client, auth_headers):
    """Test updating an existing review."""
    # Mock user for auth
    mock_user = MockUser(username="testuser")
    mock_user_db_data = create_mock_user_dict(mock_user.username)

    # Use updated sample data with integer ID and correct type
    review_to_update = deepcopy(sample_review_data)
    review_to_update["user_id"] = mock_user.username
    review_id = str(review_to_update["_id"])

    update_payload = {
        "rating": 3,
        "comment": "Updated comment.",
        "resource_type": review_to_update["resource_type"],
        "resource_id": review_to_update["resource_id"],
        "content": "Original content or updated",
        "difficulty_rating": 4,
        "topics": ["updated"]
    }

    # Mock database
    mock_db = MagicMock()
    mock_db.reviews = MagicMock()
    mock_db.users = MagicMock()

    # Mock update_one
    mock_update_result = MagicMock()
    mock_update_result.matched_count = 1
    mock_update_result.modified_count = 1
    mock_db.reviews.update_one = AsyncMock(return_value=mock_update_result)

    # Mock find_one for ownership check and returning updated doc
    updated_review_mock_data = {
        **review_to_update,
        **update_payload,
        "updated_at": datetime.now(timezone.utc)
    }
    mock_db.reviews.find_one = AsyncMock(side_effect=[
        review_to_update,          # First call for ownership check
        updated_review_mock_data   # Second call returns updated doc
    ])

    # Mock find_one on users for auth
    mock_db.users.find_one = AsyncMock(return_value=mock_user_db_data)

    # Define override
    async def override_get_db():
        return mock_db

    # Apply overrides
    app.dependency_overrides[get_db] = override_get_db
    # Override with User model instance created from dict
    mock_user_instance = User(**mock_user_db_data)
    app.dependency_overrides[get_current_active_user] = lambda: mock_user_instance

    response = await async_client.put(f"/api/reviews/{review_id}", json=update_payload, headers=auth_headers)

    assert response.status_code == 200 # Should not be 403
    data = response.json()
    assert data["id"] == review_id
    assert data["rating"] == update_payload["rating"]
    assert data["comment"] == update_payload["comment"]
    assert data["user_id"] == mock_user.username
    assert data["updated_at"] != review_to_update["updated_at"].isoformat().replace('+00:00', 'Z')

@pytest.mark.asyncio
async def test_delete_review(async_client, auth_headers):
    """Test deleting an existing review."""
    # Mock user for auth
    mock_user = MockUser(username="testuser")
    mock_user_db_data = create_mock_user_dict(mock_user.username)

    # Use updated sample data
    review_to_delete = deepcopy(sample_review_data)
    review_to_delete["user_id"] = mock_user.username
    review_id = str(review_to_delete["_id"])

    # Mock database
    mock_db = MagicMock()
    mock_db.reviews = MagicMock()
    mock_db.users = MagicMock()

    # Mock find_one to confirm ownership before delete
    mock_db.reviews.find_one = AsyncMock(return_value=review_to_delete)
    # Mock delete_one
    mock_delete_result = MagicMock()
    mock_delete_result.deleted_count = 1
    mock_db.reviews.delete_one = AsyncMock(return_value=mock_delete_result)

    # Mock find_one on users for auth
    mock_db.users.find_one = AsyncMock(return_value=mock_user_db_data)

    # Define override
    async def override_get_db():
        return mock_db

    # Apply overrides
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = lambda: mock_user_db_data

    response = await async_client.delete(f"/api/reviews/{review_id}", headers=auth_headers)

    assert response.status_code == 204 # Should not be 403

@pytest.mark.asyncio
async def test_get_review_statistics(async_client, auth_headers):
    """Test getting review statistics for the user."""
    # Mock user for auth
    mock_user = MockUser(username="testuser")
    mock_user_db_data = create_mock_user_dict(mock_user.username)

    # Mock database
    mock_db = MagicMock()
    mock_db.users = MagicMock()

    # Mock the find_one call needed by the endpoint
    mock_user_data = {
        "username": mock_user.username,
        "_id": ObjectId(),
        "disabled": False,
        "concepts": [
            {"id": "c1", "title": "Concept 1", "reviews": [{"confidence": 4, "timestamp": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()}]},
            {"id": "c2", "title": "Concept 2", "reviews": [], "next_review": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()}
        ],
        # Assuming the endpoint also fetches reviews separately for resource stats
        "review_settings": {"daily_review_target": 5} # Needed for due calculation
    }
    # Configure the find_one method on the mock 'users' collection
    mock_db.users.find_one = AsyncMock(return_value=mock_user_data)

    # Mock the find method on reviews collection for resource review stats
    mock_db.reviews = MagicMock()
    mock_review_cursor = MagicMock() # Use MagicMock for find cursor in this case
    async def review_aiter(*args, **kwargs): # Accept arguments
        # Simulate returning some mock reviews if needed for stats, or keep empty
        mock_stats_reviews = [] # Or add mock review dicts here if stats depend on them
        for item in mock_stats_reviews:
            yield item
        # The original code had an empty generator, which is fine if the stats
        # primarily rely on the user document's concept data. If stats *need*
        # resource reviews, populate mock_stats_reviews accordingly.
        # if False: yield # Original empty generator
    mock_review_cursor.__aiter__ = review_aiter
    mock_db.reviews.find = MagicMock(return_value=mock_review_cursor)

    # Define override
    async def override_get_db():
        return mock_db

    # Apply overrides
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = lambda: mock_user_db_data

    response = await async_client.get("/api/reviews/statistics", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert "total_concepts" in data
    assert "due_concepts" in data
    assert "average_confidence" in data
    assert "resource_reviews" in data
    assert "concept_reviews" in data
    assert data["total_concepts"] == 2
    # Corrected assertion based on likely response structure
    assert "today" in data["due_concepts"]
    assert data["due_concepts"]["today"] >= 0
    assert "overdue" in data["due_concepts"]
    assert data["due_concepts"]["overdue"] >= 0
    assert data["average_confidence"] == 4.0
    assert data["resource_reviews"]["total"] == 0
    assert data["concept_reviews"]["total"] == 1

@pytest.mark.asyncio
async def test_get_review_settings(async_client, auth_headers):
    """Test getting review settings."""
    # Mock user for auth
    mock_user = MockUser(username="testuser")
    mock_user_db_data = create_mock_user_dict(mock_user.username)

    # Mock database
    mock_db = MagicMock()
    mock_db.users = MagicMock()

    # Mock find_one to return user with review settings
    user_with_settings = {
        "username": mock_user.username,
        "disabled": False,
        "_id": mock_user_db_data['_id'],
        "review_settings": {
            "notification_frequency": "daily",
            "notification_enabled": True,
            "daily_review_target": 10 # Make sure all fields are present
        }
    }
    mock_db.users.find_one = AsyncMock(return_value=user_with_settings)

    # Define override
    async def override_get_db():
        return mock_db

    # Apply overrides
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = lambda: mock_user_db_data

    response = await async_client.get("/api/reviews/settings", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["notification_frequency"] == "daily"
    assert data["notification_enabled"] is True
    assert data["daily_review_target"] == 10 # Verify all fields

@pytest.mark.asyncio
async def test_update_review_settings(async_client, auth_headers):
    """Test updating review settings."""
    # Mock user for auth
    mock_user = MockUser(username="testuser")
    mock_user_db_data = create_mock_user_dict(mock_user.username)

    settings_payload = {
        "notification_frequency": "monthly",
        "notification_enabled": False,
        "daily_review_target": 7
    }

    # Mock database
    mock_db = MagicMock()
    mock_db.users = MagicMock()

    # Mock update_one for settings update
    mock_update_result = MagicMock()
    mock_update_result.matched_count = 1
    mock_update_result.modified_count = 1
    mock_db.users.update_one = AsyncMock(return_value=mock_update_result)

    # Mock find_one used for auth check
    updated_user_data_mock = {
        "username": mock_user.username,
        "disabled": False,
        "_id": mock_user_db_data['_id'],
        "email": mock_user_db_data['email'],
        "review_settings": settings_payload
    }
    mock_db.users.find_one = AsyncMock(return_value=updated_user_data_mock)

    # Define override
    async def override_get_db():
        return mock_db

    # Apply overrides
    app.dependency_overrides[get_db] = override_get_db
    # Override with User model instance created from dict
    mock_user_instance = User(**updated_user_data_mock)
    app.dependency_overrides[get_current_active_user] = lambda: mock_user_instance

    response = await async_client.put("/api/reviews/settings", json=settings_payload, headers=auth_headers)

    assert response.status_code == 200 # Should not be 403
    data = response.json()
    assert data["notification_frequency"] == settings_payload["notification_frequency"]
    assert data["notification_enabled"] == settings_payload["notification_enabled"]
    assert data["daily_review_target"] == settings_payload["daily_review_target"]