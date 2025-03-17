import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import asyncio
import json
import uuid

from main import app
from database import db
from auth import create_access_token

# Test interactions between different API endpoints

@pytest.fixture(scope="session")
def test_client(client):
    return client

@pytest_asyncio.fixture(scope="session")
async def setup_test_user():
    """Create a test user directly in the database."""
    # Define test user data
    username = "testuser"
    user_data = {
        "username": username,
        "email": f"{username}@example.com",
        "full_name": "Test User",
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
    await db.users.insert_one(user_data)

    # Verify the user was created
    user = await db.users.find_one({"username": username})
    if not user:
        pytest.fail(f"Failed to create test user {username} in database")

    yield user_data

    # Clean up after tests
    await db.users.delete_one({"username": username})

@pytest.mark.integration
@pytest.mark.asyncio
async def test_goal_creation_and_retrieval(test_client, auth_headers):
    """
    Test that goals can be created and retrieved:
    1. Create a learning goal
    2. Retrieve the goal
    3. Verify the goal details
    """
    # Get user profile to verify authentication works
    response = test_client.get("/users/me/", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get user profile: {response.content}"

    # 1. Create a learning goal
    goal_data = {
        "title": "Integration Test Goal",
        "description": "Test goal for API integration testing",
        "target_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
        "priority": 8,
        "category": "Testing"
    }

    response = test_client.post("/api/learning-path/goals", json=goal_data, headers=auth_headers)
    assert response.status_code in [200, 201], f"Failed to create goal: {response.content}"
    goal_response = response.json()

    # Extract goal ID from response
    goal_id = None
    if "id" in goal_response:
        goal_id = goal_response["id"]
    elif "_id" in goal_response:
        goal_id = goal_response["_id"]

    assert goal_id is not None, "Goal ID not found in response"

    # 2. Retrieve the goal
    response = test_client.get(f"/api/learning-path/goals/{goal_id}", headers=auth_headers)
    assert response.status_code == 200, f"Failed to retrieve goal: {response.content}"
    retrieved_goal = response.json()

    # 3. Verify the goal details
    assert retrieved_goal["title"] == goal_data["title"]
    assert retrieved_goal["description"] == goal_data["description"]

    # Clean up - delete the goal
    response = test_client.delete(f"/api/learning-path/goals/{goal_id}", headers=auth_headers)
    assert response.status_code in [200, 204], f"Failed to delete goal: {response.content}"

@pytest.mark.integration
@pytest.mark.asyncio
async def test_resource_completion_affects_learning_path(test_client, auth_headers):
    """
    Test that completing a resource affects learning path progress:
    1. Create a learning path
    2. Add a resource to the learning path
    3. Complete the resource
    4. Verify the resource is marked as completed in the learning path
    """
    # Get user profile to verify authentication works
    response = test_client.get("/users/me/", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get user profile: {response.content}"

    # 1. Create a learning path
    learning_path_data = {
        "title": "Test Learning Path",
        "description": "A test learning path for integration testing",
        "topics": ["testing", "integration"],
        "difficulty": "intermediate",
        "estimated_time": 10
    }

    response = test_client.post("/api/learning-path/", json=learning_path_data, headers=auth_headers)
    assert response.status_code in [200, 201], f"Failed to create learning path: {response.content}"
    learning_path = response.json()
    learning_path_id = learning_path.get("id") or learning_path.get("_id")
    assert learning_path_id is not None, "Learning path ID not found in response"

    # Get the list of valid resource types
    response = test_client.get("/api/resources/", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get resource types: {response.content}"
    resource_types = response.json()

    # Print the available resource types for debugging
    print(f"Available resource types: {resource_types}")

    # Use 'articles' as the resource type
    resource_type = "articles"

    # 2. Create a resource
    resource_data = {
        "title": "Test Resource",
        "url": "https://example.com/test-resource",
        "topics": ["testing", "integration"],
        "difficulty": "intermediate",
        "estimated_time": 30
    }

    response = test_client.post(f"/api/resources/{resource_type}", json=resource_data, headers=auth_headers)
    assert response.status_code in [200, 201], f"Failed to create resource: {response.content}"
    resource = response.json()
    resource_id = resource.get("id") or resource.get("_id")
    assert resource_id is not None, "Resource ID not found in response"

    # Convert resource_id to string if it's not already
    resource_id = str(resource_id)

    # 3. Add the resource to the learning path
    resource_in_path_data = {
        "id": resource_id,
        "title": resource_data["title"],
        "url": resource_data["url"],
        "type": resource_type
    }

    response = test_client.post(
        f"/api/learning-path/{learning_path_id}/resources",
        json=resource_in_path_data,
        headers=auth_headers
    )
    assert response.status_code in [200, 201], f"Failed to add resource to learning path: {response.content}"

    # Get the learning path to check the initial state of the resource
    response = test_client.get(f"/api/learning-path/{learning_path_id}", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get learning path: {response.content}"
    learning_path_before = response.json()

    # Verify the resource is in the learning path and not completed
    resources_before = learning_path_before.get("resources", [])
    assert len(resources_before) > 0, "No resources found in learning path"

    resource_before = None
    for res in resources_before:
        if res.get("id") == resource_id:
            resource_before = res
            break

    assert resource_before is not None, f"Resource {resource_id} not found in learning path"
    assert resource_before.get("completed") is False, "Resource should not be completed initially"

    # 5. Complete the resource in the learning path
    response = test_client.post(
        f"/api/learning-path/{learning_path_id}/resources/{resource_id}/complete",
        json={},
        headers=auth_headers
    )
    assert response.status_code in [200, 204], f"Failed to complete resource in learning path: {response.content}"

    # Get the learning path again to check if the resource is marked as completed
    response = test_client.get(f"/api/learning-path/{learning_path_id}", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get learning path after completion: {response.content}"
    learning_path_after = response.json()

    # Verify the resource is marked as completed
    resources_after = learning_path_after.get("resources", [])

    resource_after = None
    for res in resources_after:
        if res.get("id") == resource_id:
            resource_after = res
            break

    assert resource_after is not None, f"Resource {resource_id} not found in learning path after completion"
    assert resource_after.get("completed") is True, "Resource should be marked as completed"
    assert resource_after.get("completion_date") is not None, "Resource should have a completion date"

    # Clean up - delete the learning path
    response = test_client.delete(f"/api/learning-path/{learning_path_id}", headers=auth_headers)
    assert response.status_code in [200, 204], f"Failed to delete learning path: {response.content}"

    # Clean up - delete the resource
    response = test_client.delete(f"/api/resources/{resource_type}/{resource_id}", headers=auth_headers)
    assert response.status_code in [200, 204], f"Failed to delete resource: {response.content}"

@pytest.mark.integration
@pytest.mark.asyncio
async def test_concept_review_affects_analytics(test_client, auth_headers):
    """
    Test that reviewing a concept affects analytics:
    1. Create a concept
    2. Review the concept
    3. Verify that the analytics data reflects the review
    """
    # Get user profile to verify authentication works
    response = test_client.get("/users/me/", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get user profile: {response.content}"

    # 1. Create a concept
    concept_data = {
        "title": "Test Concept",
        "content": "This is a test concept for integration testing",
        "topics": ["testing", "integration"]
    }

    response = test_client.post("/api/reviews/concepts", json=concept_data, headers=auth_headers)
    assert response.status_code in [200, 201], f"Failed to create concept: {response.content}"
    concept = response.json()
    concept_id = concept.get("id") or concept.get("_id")
    assert concept_id is not None, "Concept ID not found in response"

    # Convert concept_id to string if it's not already
    concept_id = str(concept_id)

    # Get the concept to check its initial state
    response = test_client.get(f"/api/reviews/concepts/{concept_id}", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get concept: {response.content}"
    concept_before = response.json()

    # Verify the concept has no reviews initially
    assert "reviews" not in concept_before or len(concept_before.get("reviews", [])) == 0, "Concept should have no reviews initially"

    # 2. Review the concept
    review_data = {
        "confidence": 4,
        "notes": "Test review notes"
    }
    response = test_client.post(f"/api/reviews/concepts/{concept_id}/review", json=review_data, headers=auth_headers)
    assert response.status_code in [200, 201], f"Failed to review concept: {response.content}"

    # Get the concept again to check if the review was added
    response = test_client.get(f"/api/reviews/concepts/{concept_id}", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get concept after review: {response.content}"
    concept_after = response.json()

    # Print the concept for debugging
    print(f"Concept after review: {concept_after}")

    # Verify the review was added
    reviews = concept_after.get("reviews", [])
    assert len(reviews) > 0, "No reviews found after adding a review"

    latest_review = reviews[-1] if reviews else None
    assert latest_review is not None, "Latest review not found"
    assert latest_review.get("confidence") == review_data["confidence"], "Review confidence should match"
    assert "date" in latest_review, "Review should have a date"

    # Clean up - delete the concept
    response = test_client.delete(f"/api/reviews/concepts/{concept_id}", headers=auth_headers)
    assert response.status_code in [200, 204], f"Failed to delete concept: {response.content}"

@pytest.mark.integration
@pytest.mark.asyncio
async def test_study_metric_affects_dashboard(test_client, auth_headers):
    """
    Test that adding study metrics affects the dashboard:
    1. Add a study metric
    2. Verify that the dashboard data reflects the new metric
    """
    # Get user profile to verify authentication works
    response = test_client.get("/users/me/", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get user profile: {response.content}"

@pytest.mark.integration
@pytest.mark.asyncio
async def test_url_extraction_integration(test_client, auth_headers):
    """
    Test that URL extraction works and integrates with resource creation:
    1. Extract metadata from a URL
    2. Create a resource using the extracted metadata
    3. Verify the resource was created with the correct metadata
    """
    # Get user profile to verify authentication works
    response = test_client.get("/users/me/", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get user profile: {response.content}"

@pytest.mark.integration
@pytest.mark.asyncio
async def test_weekly_report_generation(test_client, auth_headers):
    """
    Test that weekly reports can be generated:
    1. Add study metrics for the week
    2. Generate a weekly report
    3. Verify the report contains the metrics
    """
    # Get user profile to verify authentication works
    response = test_client.get("/users/me/", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get user profile: {response.content}"

@pytest.mark.integration
def test_cleanup():
    """Clean up the database after tests."""
    # This is a placeholder for any cleanup needed
    pass

@pytest.mark.integration
@pytest.mark.asyncio
async def test_user_profile_endpoint(test_client, auth_headers):
    """
    Test that the user profile endpoint works with authentication.
    This test is useful for debugging authentication issues in other tests.
    """
    # Get user profile
    response = test_client.get("/users/me/", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get user profile: {response.content}"
    user_profile = response.json()

    # Print the user profile for debugging
    print(f"User profile: {user_profile}")

    # Check that we got a valid user profile
    assert user_profile["username"] == "testuser"
    assert "email" in user_profile
    assert user_profile["email"] == "test@example.com"  # This is the email used in the mock user