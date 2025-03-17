import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import HTTPException, status
from datetime import datetime, timedelta

# Import the app and auth functions
from main import app
from auth import get_current_user, get_current_active_user

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

def test_get_concepts(client, auth_headers):
    """Test getting all concepts."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create test concepts
    concepts = [
        {
            "id": "20240101000001_neural_networks",
            "title": "Neural Networks",
            "content": "Neural networks are a set of algorithms...",
            "topics": ["Deep Learning", "AI"],
            "reviews": [],
            "next_review": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "id": "20240101000002_reinforcement_learning",
            "title": "Reinforcement Learning",
            "content": "Reinforcement learning is a type of machine learning...",
            "topics": ["RL", "AI"],
            "reviews": [],
            "next_review": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
    ]

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
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
        # Test getting all concepts
        response = client.get("/api/reviews/concepts", headers=auth_headers)

        # Verify the response
        assert response.status_code == 200
        concepts_data = response.json()
        assert len(concepts_data) == 2
        assert concepts_data[0]["title"] == "Neural Networks"
        assert concepts_data[1]["title"] == "Reinforcement Learning"