"""
Fixed version of the reviews API tests.

This file follows the standardized testing approach with proper mocking
of async database operations and synchronous dependency overrides.
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from bson import ObjectId

# Import the app and auth functions
from main import app
from auth import get_current_user, get_current_active_user

# Import standardized utilities
from utils.error_handlers import AuthenticationError, ResourceNotFoundError

# Import the MockUser class from conftest
from tests.conftest import MockUser

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    # Clear any existing overrides
    app.dependency_overrides.clear()

    yield

    # Clear overrides after the test
    app.dependency_overrides.clear()

def test_get_reviews_empty(client, auth_headers):
    """Test getting reviews when there are none."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "reviews": []
    }

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.reviews.db', mock_db):
        # Test getting all reviews
        response = client.get("/api/reviews", headers=auth_headers)

        # Verify the response
        assert response.status_code == 200
        reviews_data = response.json()
        assert len(reviews_data) == 0

def test_create_resource_review(client, auth_headers):
    """Test creating a new resource review."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # New review data
    new_review = {
        "resource_id": 1,  # Changed to int
        "resource_type": "article",
        "rating": 5,
        "content": "Great resource!",
        "tags": ["python", "fastapi"],
        "difficulty_rating": 3,  # Added required field
        "topics": ["python", "fastapi"]  # Added required field
    }

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "reviews": []
    }

    # Create a mock for the update_one method
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.reviews.db', mock_db):
        # Test creating a new review
        response = client.post("/api/reviews", json=new_review, headers=auth_headers)

        # Verify the response
        assert response.status_code == 201
        review_data = response.json()
        assert review_data["resource_id"] == new_review["resource_id"]
        assert review_data["resource_type"] == new_review["resource_type"]
        assert review_data["rating"] == new_review["rating"]
        assert review_data["content"] == new_review["content"]
        assert review_data["difficulty_rating"] == new_review["difficulty_rating"]
        assert review_data["topics"] == new_review["topics"]
        assert "id" in review_data
        assert "user_id" in review_data
        assert "date" in review_data

def test_get_reviews(client, auth_headers):
    """Test getting all reviews."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create test reviews
    reviews = [
        {
            "id": "review1",
            "resource_id": 1,  # Changed to int
            "resource_type": "article",
            "rating": 5,
            "content": "Great resource!",
            "tags": ["python", "fastapi"],
            "difficulty_rating": 3,  # Added required field
            "topics": ["python", "fastapi"],  # Added required field
            "user_id": "testuser",  # Added required field
            "date": str(datetime.now()),  # Added required field
            "created_at": str(datetime.now()),
            "updated_at": str(datetime.now())
        },
        {
            "id": "review2",
            "resource_id": 2,  # Changed to int
            "resource_type": "video",
            "rating": 4,
            "content": "Good video!",
            "tags": ["python", "django"],
            "difficulty_rating": 2,  # Added required field
            "topics": ["python", "django"],  # Added required field
            "user_id": "testuser",  # Added required field
            "date": str(datetime.now()),  # Added required field
            "created_at": str(datetime.now()),
            "updated_at": str(datetime.now())
        }
    ]

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "reviews": reviews
    }

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.reviews.db', mock_db):
        # Test getting all reviews
        response = client.get("/api/reviews", headers=auth_headers)

        # Verify the response
        assert response.status_code == 200
        reviews_data = response.json()
        assert len(reviews_data) == 2
        assert reviews_data[0]["resource_id"] == 1
        assert reviews_data[0]["resource_type"] == "article"
        assert reviews_data[1]["resource_id"] == 2
        assert reviews_data[1]["resource_type"] == "video"

def test_get_reviews_by_resource(client, auth_headers):
    """Test getting reviews for a specific resource."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create test reviews
    reviews = [
        {
            "id": "review1",
            "resource_id": 1,  # Changed to int
            "resource_type": "article",
            "rating": 5,
            "content": "Great resource!",
            "tags": ["python", "fastapi"],
            "difficulty_rating": 3,  # Added required field
            "topics": ["python", "fastapi"],  # Added required field
            "user_id": "testuser",  # Added required field
            "date": str(datetime.now()),  # Added required field
            "created_at": str(datetime.now()),
            "updated_at": str(datetime.now())
        },
        {
            "id": "review2",
            "resource_id": 1,  # Changed to int
            "resource_type": "article",
            "rating": 4,
            "content": "Good article!",
            "tags": ["python", "django"],
            "difficulty_rating": 2,  # Added required field
            "topics": ["python", "django"],  # Added required field
            "user_id": "testuser",  # Added required field
            "date": str(datetime.now()),  # Added required field
            "created_at": str(datetime.now()),
            "updated_at": str(datetime.now())
        },
        {
            "id": "review3",
            "resource_id": 2,  # Changed to int
            "resource_type": "video",
            "rating": 3,
            "content": "Average video!",
            "tags": ["python", "flask"],
            "difficulty_rating": 4,  # Added required field
            "topics": ["python", "flask"],  # Added required field
            "user_id": "testuser",  # Added required field
            "date": str(datetime.now()),  # Added required field
            "created_at": str(datetime.now()),
            "updated_at": str(datetime.now())
        }
    ]

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "reviews": reviews
    }

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.reviews.db', mock_db):
        # Test getting reviews for a specific resource
        response = client.get("/api/reviews/resource/article/1", headers=auth_headers)

        # Verify the response
        assert response.status_code == 200
        reviews_data = response.json()
        assert len(reviews_data) == 2
        assert reviews_data[0]["resource_id"] == 1
        assert reviews_data[0]["resource_type"] == "article"
        assert reviews_data[1]["resource_id"] == 1
        assert reviews_data[1]["resource_type"] == "article"

def test_update_review(client, auth_headers):
    """Test updating a review."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create test reviews
    reviews = [
        {
            "id": "review1",
            "resource_id": 1,  # Changed to int
            "resource_type": "article",
            "rating": 5,
            "content": "Great resource!",
            "tags": ["python", "fastapi"],
            "difficulty_rating": 3,  # Added required field
            "topics": ["python", "fastapi"],  # Added required field
            "user_id": "testuser",  # Added required field
            "date": str(datetime.now()),  # Added required field
            "created_at": str(datetime.now()),
            "updated_at": str(datetime.now())
        }
    ]

    # Updated review data
    updated_review = {
        "resource_id": 1,  # Changed to int
        "resource_type": "article",
        "rating": 4,
        "content": "Updated review content",
        "tags": ["python", "fastapi", "testing"],
        "difficulty_rating": 2,  # Added required field
        "topics": ["python", "fastapi", "testing"]  # Added required field
    }

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "reviews": reviews
    }

    # Create a mock for the update_one method
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.reviews.db', mock_db):
        # Test updating a review
        response = client.put("/api/reviews/review1", json=updated_review, headers=auth_headers)

        # Verify the response
        assert response.status_code == 200
        review_data = response.json()
        assert review_data["id"] == "review1"
        assert review_data["rating"] == updated_review["rating"]
        assert review_data["content"] == updated_review["content"]
        assert review_data["difficulty_rating"] == updated_review["difficulty_rating"]
        assert review_data["topics"] == updated_review["topics"]
        assert "date" in review_data

def test_delete_review(client, auth_headers):
    """Test deleting a review."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create test reviews
    reviews = [
        {
            "id": "review1",
            "resource_id": 1,  # Changed to int
            "resource_type": "article",
            "rating": 5,
            "content": "Great resource!",
            "tags": ["python", "fastapi"],
            "difficulty_rating": 3,  # Added required field
            "topics": ["python", "fastapi"],  # Added required field
            "user_id": "testuser",  # Added required field
            "date": str(datetime.now()),  # Added required field
            "created_at": str(datetime.now()),
            "updated_at": str(datetime.now())
        }
    ]

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "reviews": reviews
    }

    # Create a mock for the update_one method
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.reviews.db', mock_db):
        # Test deleting a review
        response = client.delete("/api/reviews/review1", headers=auth_headers)

        # Verify the response
        assert response.status_code == 204

def test_get_review_statistics(client, auth_headers):
    """Test getting review statistics."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create test reviews for resources
    resource_reviews = [
        {
            "id": "review1",
            "resource_id": 1,
            "resource_type": "article",
            "rating": 5,
            "content": "Great resource!",
            "tags": ["python", "fastapi"],
            "difficulty_rating": 3,
            "topics": ["python", "fastapi"],
            "user_id": "testuser",
            "date": str(datetime.now()),
            "created_at": str(datetime.now()),
            "updated_at": str(datetime.now())
        },
        {
            "id": "review2",
            "resource_id": 2,
            "resource_type": "video",
            "rating": 4,
            "content": "Good video!",
            "tags": ["python", "django"],
            "difficulty_rating": 2,
            "topics": ["python", "django"],
            "user_id": "testuser",
            "date": str(datetime.now()),
            "created_at": str(datetime.now()),
            "updated_at": str(datetime.now())
        },
        {
            "id": "review3",
            "resource_id": 3,
            "resource_type": "article",
            "rating": 3,
            "content": "Average article!",
            "tags": ["python", "flask"],
            "difficulty_rating": 4,
            "topics": ["python", "flask"],
            "user_id": "testuser",
            "date": str(datetime.now()),
            "created_at": str(datetime.now()),
            "updated_at": str(datetime.now())
        }
    ]

    # Create test concepts with reviews
    concepts = [
        {
            "id": "20240101000001_neural_networks",
            "title": "Neural Networks",
            "content": "Neural networks are a set of algorithms...",
            "topics": ["Deep Learning", "AI"],
            "reviews": [
                {
                    "date": str(datetime.now()),
                    "confidence": 4
                },
                {
                    "date": str(datetime.now()),
                    "confidence": 5
                }
            ],
            "next_review": None,
            "created_at": str(datetime.now()),
            "updated_at": str(datetime.now())
        },
        {
            "id": "20240101000002_reinforcement_learning",
            "title": "Reinforcement Learning",
            "content": "Reinforcement learning is a type of machine learning...",
            "topics": ["RL", "AI"],
            "reviews": [
                {
                    "date": str(datetime.now()),
                    "confidence": 3
                }
            ],
            "next_review": None,
            "created_at": str(datetime.now()),
            "updated_at": str(datetime.now())
        }
    ]

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "reviews": resource_reviews,
        "concepts": concepts
    }

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.reviews.db', mock_db):
        # Test getting review statistics
        response = client.get("/api/reviews/statistics", headers=auth_headers)

        # Verify the response
        assert response.status_code == 200
        stats = response.json()

        # The total_reviews should be the count of concept reviews (3)
        assert stats["total_reviews"] == 3

        # Check other statistics
        assert "average_rating" in stats
        assert "resource_types" in stats
        assert "topics" in stats
        assert "total_concepts" in stats
        assert stats["total_concepts"] == 2