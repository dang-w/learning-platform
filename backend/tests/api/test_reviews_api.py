import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
import logging
import sys
from jose import jwt
from fastapi.security import OAuth2PasswordBearer
from main import app
from database import db
from auth import SECRET_KEY, ALGORITHM, get_current_user, get_current_active_user

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("test_reviews_api")

# Set up a handler for detailed logging
handler = logging.StreamHandler(sys.stdout)
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

# Create OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Create a test client
client = TestClient(app)

# Create a test token
def create_test_token(data={"sub": "testuser"}, expires_delta=None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Mock user
class MockUser:
    def __init__(self):
        self.username = "testuser"
        self.email = "test@example.com"
        self.full_name = "Test User"
        self.disabled = False

    def model_dump(self):
        return {
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "disabled": self.disabled
        }

    # Keep dict method for backward compatibility but make it call model_dump
    def dict(self):
        return self.model_dump()

mock_user = MockUser()

@pytest.fixture
def auth_headers():
    """Get authentication headers for the test user."""
    token = create_test_token()
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(autouse=True)
def setup_and_teardown():
    """Setup and teardown for each test."""
    # Setup dependency overrides
    async def mock_get_current_user():
        return mock_user

    async def mock_get_current_active_user():
        return mock_user

    # Override dependencies
    app.dependency_overrides[oauth2_scheme] = lambda: "test_token"
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user

    yield

    # Clear dependency overrides
    app.dependency_overrides.clear()

@pytest.fixture(autouse=True)
async def clear_reviews_before_test():
    """Clear reviews before each test."""
    # Use a more direct approach to clear the reviews
    # Drop the users collection and recreate it
    try:
        await db.users.drop()

        # Create a test user with no reviews
        await db.users.insert_one({
            "username": "testuser",
            "email": "testuser@example.com",
            "hashed_password": "fakehashed",
            "reviews": []
        })

        # Verify that the reviews are cleared
        user = await db.users.find_one({"username": "testuser"})
        if user and "reviews" in user:
            assert len(user["reviews"]) == 0, f"Reviews not cleared: {user['reviews']}"
    except Exception as e:
        logger.error(f"Error clearing reviews: {e}")

    yield

def test_get_reviews_empty(client, auth_headers):
    """Test getting reviews when there are none."""
    try:
        response = client.get(
            "/api/reviews/",
            headers=auth_headers,
        )
        logger.debug(f"Response status code: {response.status_code}")
        logger.debug(f"Response content: {response.content}")

        assert response.status_code == 200
        reviews = response.json()
        assert len(reviews) == 0
    except Exception as e:
        logger.error(f"Error in test_get_reviews_empty: {e}")
        raise

def test_create_resource_review(client, auth_headers):
    """Test creating a review for a resource."""
    try:
        # Mock the database responses
        with patch("routers.resources.get_next_resource_id", return_value=1), \
             patch("datetime.datetime") as mock_datetime:

            # Mock datetime.now() for predictable IDs
            mock_now = datetime(2025, 1, 1, 12, 0, 0)
            mock_datetime.now.return_value = mock_now

            # First create a resource
            resource_data = {
                "title": "Test Resource",
                "url": "https://example.com/test",
                "topics": ["python"],
                "difficulty": "beginner",
                "estimated_time": 30
            }

            resource_response = client.post(
                "/api/resources/articles",
                json=resource_data,
                headers=auth_headers,
            )
            logger.debug(f"Resource response status code: {resource_response.status_code}")
            logger.debug(f"Resource response content: {resource_response.content}")

            assert resource_response.status_code == 201

            # Create a review for the resource
            review_data = {
                "resource_type": "article",
                "resource_id": 1,  # Use the ID we mocked
                "rating": 4,
                "content": "This was a great resource!",
                "difficulty_rating": 3,
                "topics": ["python"]
            }

            review_response = client.post(
                "/api/reviews/",
                json=review_data,
                headers=auth_headers,
            )
            logger.debug(f"Review response status code: {review_response.status_code}")
            logger.debug(f"Review response content: {review_response.content}")

            assert review_response.status_code == 201
            review = review_response.json()
            assert review["rating"] == 4
            assert review["content"] == "This was a great resource!"
            assert review["difficulty_rating"] == 3
            assert review["topics"] == ["python"]
    except Exception as e:
        logger.error(f"Error in test_create_resource_review: {e}")
        raise

def test_get_reviews(client, auth_headers):
    """Test getting all reviews."""
    try:
        # Get initial reviews count
        initial_response = client.get(
            "/api/reviews/",
            headers=auth_headers,
        )
        assert initial_response.status_code == 200
        initial_reviews_count = len(initial_response.json())

        # Create a resource and a review
        with patch("routers.resources.get_next_resource_id", return_value=1), \
             patch("datetime.datetime") as mock_datetime:

            # Mock datetime.now() for predictable IDs
            mock_now = datetime(2025, 1, 1, 12, 0, 0)
            mock_datetime.now.return_value = mock_now

            # Create a resource
            resource_data = {
                "title": "Test Resource",
                "url": "https://example.com/test",
                "topics": ["python"],
                "difficulty": "beginner",
                "estimated_time": 30
            }

            resource_response = client.post(
                "/api/resources/articles",
                json=resource_data,
                headers=auth_headers,
            )
            logger.debug(f"Resource response status code: {resource_response.status_code}")
            logger.debug(f"Resource response content: {resource_response.content}")

            assert resource_response.status_code == 201

            # Create a review for the resource
            review_data = {
                "resource_type": "article",
                "resource_id": 1,
                "rating": 5,
                "content": "Excellent resource",
                "difficulty_rating": 2,
                "topics": ["python"]
            }

            review_response = client.post(
                "/api/reviews/",
                json=review_data,
                headers=auth_headers,
            )
            logger.debug(f"Review response status code: {review_response.status_code}")
            logger.debug(f"Review response content: {review_response.content}")

            assert review_response.status_code == 201

            # Now get all reviews
            response = client.get(
                "/api/reviews/",
                headers=auth_headers,
            )
            logger.debug(f"Get reviews response status code: {response.status_code}")
            logger.debug(f"Get reviews response content: {response.content}")

            assert response.status_code == 200
            reviews = response.json()
            assert len(reviews) > initial_reviews_count

            # Find our newly created review
            new_review = None
            for review in reviews:
                if review.get("content") == "Excellent resource":
                    new_review = review
                    break

            assert new_review is not None
            assert new_review["rating"] == 5
            assert new_review["content"] == "Excellent resource"
    except Exception as e:
        logger.error(f"Error in test_get_reviews: {e}")
        raise

def test_get_reviews_by_resource(client, auth_headers):
    """Test getting reviews for a specific resource."""
    try:
        # Create two resources
        with patch("routers.resources.get_next_resource_id") as mock_get_id, \
             patch("datetime.datetime") as mock_datetime:

            # Mock resource IDs
            mock_get_id.side_effect = [1, 2]  # First call returns 1, second call returns 2

            # Mock datetime.now() for predictable IDs
            mock_now = datetime(2025, 1, 1, 12, 0, 0)
            mock_datetime.now.return_value = mock_now

            resource1 = {
                "title": "Resource 1",
                "url": "https://example.com/1",
                "topics": ["python"],
                "difficulty": "beginner",
                "estimated_time": 30
            }

            resource2 = {
                "title": "Resource 2",
                "url": "https://example.com/2",
                "topics": ["javascript"],
                "difficulty": "intermediate",
                "estimated_time": 45
            }

            resource1_response = client.post(
                "/api/resources/articles",
                json=resource1,
                headers=auth_headers,
            )
            logger.debug(f"Resource1 response status code: {resource1_response.status_code}")
            logger.debug(f"Resource1 response content: {resource1_response.content}")

            resource2_response = client.post(
                "/api/resources/videos",
                json=resource2,
                headers=auth_headers,
            )
            logger.debug(f"Resource2 response status code: {resource2_response.status_code}")
            logger.debug(f"Resource2 response content: {resource2_response.content}")

            resource1_id = resource1_response.json()["id"]
            resource2_id = resource2_response.json()["id"]

            # Get initial reviews for resource 1
            initial_response = client.get(
                f"/api/reviews/resource/article/{resource1_id}",
                headers=auth_headers,
            )
            assert initial_response.status_code == 200
            initial_reviews_count = len(initial_response.json())

            # Create reviews for both resources
            review1 = {
                "resource_type": "article",
                "resource_id": resource1_id,
                "rating": 4,
                "content": "Good article for testing",
                "difficulty_rating": 2,
                "topics": ["python"]
            }

            review2 = {
                "resource_type": "video",
                "resource_id": resource2_id,
                "rating": 5,
                "content": "Great video for testing",
                "difficulty_rating": 3,
                "topics": ["javascript"]
            }

            review1_response = client.post("/api/reviews/", json=review1, headers=auth_headers)
            assert review1_response.status_code == 201

            review2_response = client.post("/api/reviews/", json=review2, headers=auth_headers)
            assert review2_response.status_code == 201

            # Get reviews for resource 1
            response = client.get(
                f"/api/reviews/resource/article/{resource1_id}",
                headers=auth_headers,
            )
            logger.debug(f"Get reviews by resource response status code: {response.status_code}")
            logger.debug(f"Get reviews by resource response content: {response.content}")

            assert response.status_code == 200
            reviews = response.json()
            assert len(reviews) > initial_reviews_count

            # Find our newly created review
            new_review = None
            for review in reviews:
                if review.get("content") == "Good article for testing":
                    new_review = review
                    break

            assert new_review is not None
            assert new_review["rating"] == 4
            assert new_review["content"] == "Good article for testing"
    except Exception as e:
        logger.error(f"Error in test_get_reviews_by_resource: {e}")
        raise

def test_update_review(client, auth_headers):
    """Test updating a review."""
    try:
        # First create a resource and a review
        with patch("routers.resources.get_next_resource_id", return_value=1), \
             patch("datetime.datetime") as mock_datetime:

            # Mock datetime.now() for predictable IDs
            mock_now = datetime(2025, 1, 1, 12, 0, 0)
            mock_datetime.now.return_value = mock_now

            resource_data = {
                "title": "Test Resource",
                "url": "https://example.com/test",
                "topics": ["python"],
                "difficulty": "beginner",
                "estimated_time": 30
            }

            resource_response = client.post(
                "/api/resources/articles",
                json=resource_data,
                headers=auth_headers,
            )
            logger.debug(f"Resource response status code: {resource_response.status_code}")
            logger.debug(f"Resource response content: {resource_response.content}")

            resource_id = resource_response.json()["id"]

            review_data = {
                "resource_type": "article",
                "resource_id": resource_id,
                "rating": 3,
                "content": "Initial review",
                "difficulty_rating": 2,
                "topics": ["python"]
            }

            review_response = client.post(
                "/api/reviews/",
                json=review_data,
                headers=auth_headers,
            )
            logger.debug(f"Review response status code: {review_response.status_code}")
            logger.debug(f"Review response content: {review_response.content}")

            review_id = review_response.json()["id"]

            # Update the review
            update_data = {
                "resource_type": "article",
                "resource_id": resource_id,
                "rating": 4,
                "content": "Updated review",
                "difficulty_rating": 3,
                "topics": ["python"]
            }

            update_response = client.put(
                f"/api/reviews/{review_id}",
                json=update_data,
                headers=auth_headers,
            )
            logger.debug(f"Update review response status code: {update_response.status_code}")
            logger.debug(f"Update review response content: {update_response.content}")

            assert update_response.status_code == 200
            updated_review = update_response.json()
            assert updated_review["rating"] == 4
            assert updated_review["content"] == "Updated review"
            assert updated_review["difficulty_rating"] == 3
            assert updated_review["topics"] == ["python"]  # Unchanged
    except Exception as e:
        logger.error(f"Error in test_update_review: {e}")
        raise

def test_delete_review(client, auth_headers):
    """Test deleting a review."""
    try:
        # Create a resource and a review
        with patch("routers.resources.get_next_resource_id", return_value=1), \
             patch("datetime.datetime") as mock_datetime:

            # Mock datetime.now() for predictable IDs
            mock_now = datetime(2025, 1, 1, 12, 0, 0)
            mock_datetime.now.return_value = mock_now

            # Create a resource
            resource_data = {
                "title": "Test Resource for Delete",
                "url": "https://example.com/test-delete",
                "topics": ["python"],
                "difficulty": "beginner",
                "estimated_time": 30
            }

            resource_response = client.post(
                "/api/resources/articles",
                json=resource_data,
                headers=auth_headers,
            )
            assert resource_response.status_code == 201
            resource_id = resource_response.json()["id"]

            # Create a review with a unique content for identification
            unique_content = f"Review to be deleted {datetime.now().timestamp()}"
            review_data = {
                "resource_type": "article",
                "resource_id": resource_id,
                "rating": 4,
                "content": unique_content,
                "difficulty_rating": 2,
                "topics": ["python"]
            }

            review_response = client.post(
                "/api/reviews/",
                json=review_data,
                headers=auth_headers,
            )
            assert review_response.status_code == 201
            review_id = review_response.json()["id"]

            # Get reviews to verify the review was created
            get_response = client.get(
                "/api/reviews/",
                headers=auth_headers,
            )
            assert get_response.status_code == 200
            reviews = get_response.json()

            # Find our newly created review
            created_review = None
            for review in reviews:
                if review.get("content") == unique_content:
                    created_review = review
                    break

            assert created_review is not None
            assert created_review["id"] == review_id

            # Delete the review
            delete_response = client.delete(
                f"/api/reviews/{review_id}",
                headers=auth_headers,
            )
            assert delete_response.status_code == 204

            # Verify the review was deleted
            verify_response = client.get(
                "/api/reviews/",
                headers=auth_headers,
            )
            assert verify_response.status_code == 200
            verify_reviews = verify_response.json()

            # Check that our review is no longer in the list
            deleted = True
            for review in verify_reviews:
                if review.get("content") == unique_content:
                    deleted = False
                    break

            assert deleted, "Review was not deleted successfully"
    except Exception as e:
        logger.error(f"Error in test_delete_review: {e}")
        raise

def test_get_review_statistics(client, auth_headers):
    """Test getting review statistics."""
    try:
        # Create some reviews
        with patch("routers.resources.get_next_resource_id") as mock_get_id, \
             patch("datetime.datetime") as mock_datetime, \
             patch("routers.reviews.db.users.find_one") as mock_find_one:

            # Mock resource IDs
            mock_get_id.side_effect = [1, 2, 3]

            # Mock datetime.now() for predictable IDs
            mock_now = datetime(2025, 1, 1, 12, 0, 0)
            mock_datetime.now.return_value = mock_now

            # Create resources
            resource_types = ["articles", "videos", "articles"]
            resources = []

            for i, resource_type in enumerate(resource_types):
                resource_data = {
                    "title": f"Resource {i+1} for stats",
                    "url": f"https://example.com/stats/{i+1}",
                    "topics": ["python"] if i % 2 == 0 else ["javascript"],
                    "difficulty": "beginner" if i % 2 == 0 else "intermediate",
                    "estimated_time": 30 + i * 15
                }

                resource_response = client.post(
                    f"/api/resources/{resource_type}",
                    json=resource_data,
                    headers=auth_headers,
                )
                assert resource_response.status_code == 201
                resources.append(resource_response.json())

            # Create reviews for the resources
            reviews = []
            for i, resource in enumerate(resources):
                review_data = {
                    "resource_type": "article" if resource_types[i] == "articles" else "video",
                    "resource_id": resource["id"],
                    "rating": 3 + i,
                    "content": f"Review for stats resource {i+1}",
                    "difficulty_rating": 2 if i % 2 == 0 else 3,
                    "topics": ["python"] if i % 2 == 0 else ["javascript"]
                }

                review_response = client.post(
                    "/api/reviews/",
                    json=review_data,
                    headers=auth_headers,
                )
                assert review_response.status_code == 201
                reviews.append(review_response.json())

            # Mock the database to include our reviews
            mock_find_one.return_value = {
                "username": "testuser",
                "email": "test@example.com",
                "full_name": "Test User",
                "disabled": False,
                "reviews": reviews,
                "concepts": []  # No concepts for this test
            }

            # Get review statistics
            response = client.get(
                "/api/reviews/statistics",
                headers=auth_headers,
            )
            assert response.status_code == 200
            stats = response.json()

            # Just verify that we get a JSON response with some data
            assert isinstance(stats, dict)
            assert len(stats) > 0
    except Exception as e:
        logger.error(f"Error in test_get_review_statistics: {e}")
        raise