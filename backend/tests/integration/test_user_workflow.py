import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime, timedelta
from urllib.parse import urlencode
import uuid

from main import app
from database import db
from auth import get_current_user

# Test a complete user workflow: register, login, create resources, track progress, create concepts, and review

@pytest.fixture(scope="session")
def test_client(client):
    return client

@pytest_asyncio.fixture(scope="session")
async def setup_workflow_user():
    """Create a test user directly in the database."""
    # Define test user data
    username = f"workflow_test_user_{uuid.uuid4().hex[:8]}"
    user_data = {
        "username": username,
        "email": f"{username}@example.com",
        "full_name": "Workflow Test User",
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

    try:
        # Check if user already exists and delete if needed
        existing_user = await db.users.find_one({"username": username})
        if existing_user:
            await db.users.delete_one({"_id": existing_user["_id"]})

        # Insert the test user
        result = await db.users.insert_one(user_data)
        user_id = result.inserted_id

        # Verify the user was created
        user = await db.users.find_one({"username": username})
        if not user:
            pytest.fail(f"Failed to create test user {username} in database")

        print(f"Created test user {username} with ID {user_id}")

        yield user_data

        # Clean up after tests
        await db.users.delete_one({"_id": user_id})
    except Exception as e:
        pytest.fail(f"Error in setup_workflow_user: {str(e)}")

@pytest.mark.integration
@pytest.mark.asyncio
async def test_complete_user_workflow(test_client, auth_headers):
    """
    Test a complete user workflow:
    1. Get user profile
    2. Create a learning goal
    3. Create a resource
    4. Mark resource as complete
    5. Check progress analytics
    """

    # 1. Get user profile
    response = test_client.get("/users/me/", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get user profile: {response.content}"
    user_profile = response.json()
    assert user_profile["username"] == "testuser"

    # 2. Create a learning goal
    goal_data = {
        "title": "Learn Python",
        "description": "Master Python programming language",
        "target_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "category": "Programming",
        "priority": "High"
    }
    response = test_client.post("/goals/", json=goal_data, headers=auth_headers)
    assert response.status_code == 200, f"Failed to create goal: {response.content}"
    goal = response.json()
    assert goal["title"] == goal_data["title"]

    # 3. Create a resource
    resource_data = {
        "title": "Python Tutorial",
        "url": "https://docs.python.org/3/tutorial/",
        "resource_type": "Documentation",
        "description": "Official Python tutorial",
        "tags": ["python", "programming", "tutorial"]
    }
    response = test_client.post("/resources/", json=resource_data, headers=auth_headers)
    assert response.status_code == 200, f"Failed to create resource: {response.content}"
    resource = response.json()
    assert resource["title"] == resource_data["title"]

    # 4. Mark resource as complete
    response = test_client.post(f"/resources/{resource['id']}/complete", headers=auth_headers)
    assert response.status_code == 200, f"Failed to mark resource as complete: {response.content}"

    # 5. Check progress analytics
    response = test_client.get("/analytics/progress", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get progress analytics: {response.content}"
    analytics = response.json()
    assert "resources_completed" in analytics
    assert analytics["resources_completed"] >= 1

    # Clean up
    test_client.delete(f"/resources/{resource['id']}", headers=auth_headers)
    test_client.delete(f"/goals/{goal['id']}", headers=auth_headers)
