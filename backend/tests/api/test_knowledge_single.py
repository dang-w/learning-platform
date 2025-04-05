import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from httpx import AsyncClient, Headers
from motor.motor_asyncio import AsyncIOMotorDatabase

# Import the app and auth functions
from main import app
from auth import get_current_user, get_current_active_user
from database import get_db

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

@pytest.mark.asyncio
async def test_get_concepts(async_client: AsyncClient, auth_headers):
    """Test getting all concepts."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

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

    # Define the override function for the database dependency
    async def override_get_db() -> AsyncIOMotorDatabase:
        return mock_db

    # Apply the dependency overrides
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    try:
        # Test getting all concepts
        response = await async_client.get("/api/reviews/concepts", headers=auth_headers)

        # Verify the response
        assert response.status_code == 200
        concepts_data = response.json()
        assert len(concepts_data) == 2
        assert concepts_data[0]["title"] == "Neural Networks"
        assert concepts_data[1]["title"] == "Reinforcement Learning"
    finally:
        # Clean up overrides
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_current_active_user, None)

# Remove the old test_get_concepts function completely as it's replaced above
# Or if the intention was to modify it, ensure the old patch context is removed.
# Based on the structure, assuming replacement/modification.
# If this was meant to be a new test, adjust accordingly.

# Consider adding tests for other endpoints in this file if necessary
# (e.g., getting a single concept, creating, updating, deleting)