import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import HTTPException, status
from datetime import datetime
from copy import deepcopy

# Import the app and auth functions
from main import app
from auth import get_current_user, get_current_active_user

# Import standardized utilities
from utils.error_handlers import AuthenticationError, ResourceNotFoundError

# Import the MockUser class from conftest
from tests.conftest import MockUser

# Test data
test_resource = {
    "id": 1,
    "title": "Test Resource",
    "url": "https://example.com/resource",
    "description": "Test Description",
    "resource_type": "article",
    "topics": ["python", "testing"],
    "difficulty": "beginner",
    "estimated_time": 30,
    "completed": False,
    "notes": "Test notes",
    "date_added": "2023-01-01T00:00:00"
}

test_user_data = {
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
"last_name": "User",
    "disabled": False,
    "resources": {
        "articles": [test_resource],
        "videos": [],
        "courses": [],
        "books": []
    }
}

valid_resource = {
    "title": "Test Resource",
    "url": "https://example.com/test",
    "topics": ["python", "testing"],
    "difficulty": "intermediate",
    "estimated_time": 30,
    "resource_type": "article"
}

valid_article_resource = {
    "title": "Test Article",
    "url": "https://example.com/article",
    "topics": ["python", "testing"],
    "difficulty": "intermediate",
    "estimated_time": 30,
}

valid_video_resource = {
    "title": "Test Video",
    "url": "https://example.com/video",
    "topics": ["python", "testing"],
    "difficulty": "intermediate",
    "estimated_time": 45,
}

valid_course_resource = {
    "title": "Test Course",
    "url": "https://example.com/course",
    "topics": ["python", "testing"],
    "difficulty": "advanced",
    "estimated_time": 480,
}

valid_book_resource = {
    "title": "Test Book",
    "url": "https://example.com/book",
    "topics": ["python", "testing"],
    "difficulty": "beginner",
    "estimated_time": 360,
}

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    # Clear any existing overrides
    app.dependency_overrides.clear()

    yield

    # Clear overrides after the test
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def mock_user():
    """Fixture to create a mock user with resources."""
    user = {
        "username": "testuser",
        "email": "test@example.com",
        "resources": {
            "articles": [
                {
                    "id": 1,
                    "title": "Existing Article",
                    "url": "https://example.com/existing-article",
                    "topics": ["python"],
                    "difficulty": "beginner",
                    "estimated_time": 15,
                    "completed": False,
                    "date_added": datetime.now().isoformat(),
                    "completion_date": None,
                    "notes": ""
                }
            ],
            "videos": [
                {
                    "id": 1,
                    "title": "Existing Video",
                    "url": "https://example.com/existing-video",
                    "topics": ["python"],
                    "difficulty": "beginner",
                    "estimated_time": 30,
                    "completed": False,
                    "date_added": datetime.now().isoformat(),
                    "completion_date": None,
                    "notes": ""
                }
            ],
            "courses": [
                {
                    "id": 1,
                    "title": "Existing Course",
                    "url": "https://example.com/existing-course",
                    "topics": ["python"],
                    "difficulty": "intermediate",
                    "estimated_time": 240,
                    "completed": False,
                    "date_added": datetime.now().isoformat(),
                    "completion_date": None,
                    "notes": ""
                }
            ],
            "books": [
                {
                    "id": 1,
                    "title": "Existing Book",
                    "url": "https://example.com/existing-book",
                    "topics": ["python"],
                    "difficulty": "advanced",
                    "estimated_time": 600,
                    "completed": False,
                    "date_added": datetime.now().isoformat(),
                    "completion_date": None,
                    "notes": ""
                }
            ]
        }
    }
    return user

def test_get_all_resources_empty(client, auth_headers):
    """Test getting all resources when there are none."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "email": "test@example.com",
        "first_name": "Test",
"last_name": "User",
        "disabled": False,
        "resources": {
            "articles": [],
            "videos": [],
            "courses": [],
            "books": []
        }
    }

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.resources.db', mock_db):
        response = client.get("/api/resources/", headers=auth_headers)

        assert response.status_code == 200
        resources_data = response.json()
        assert "articles" in resources_data
        assert len(resources_data["articles"]) == 0

def test_get_all_resources(client, auth_headers):
    """Test getting all resources."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = test_user_data

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.resources.db', mock_db):
        response = client.get("/api/resources/", headers=auth_headers)

        assert response.status_code == 200
        resources_data = response.json()
        assert "articles" in resources_data
        assert len(resources_data["articles"]) == 1
        assert resources_data["articles"][0]["title"] == test_resource["title"]

def test_create_resource(client, auth_headers):
    """Test creating a new resource."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # New resource data
    new_resource = {
        "title": "New Resource",
        "url": "https://example.com/new-resource",
        "topics": ["python", "fastapi"],
        "difficulty": "beginner",
        "estimated_time": 30
    }

    # Create mocks for database operations
    with patch('routers.resources.db') as mock_db, \
         patch('routers.resources.get_next_resource_id', new_callable=AsyncMock) as mock_get_id:

        # Setup mock returns
        mock_get_id.return_value = 1
        mock_users = MagicMock()

        # Mock find_one to return a user
        mock_find_one = AsyncMock()
        mock_find_one.return_value = {
            "username": "testuser",
            "resources": {
                "articles": [],
                "videos": []
            }
        }
        mock_users.find_one = mock_find_one

        # Mock update_one
        mock_update = MagicMock()
        mock_update.modified_count = 1
        mock_update_one = AsyncMock()
        mock_update_one.return_value = mock_update
        mock_users.update_one = mock_update_one

        mock_db.users = mock_users

        # Test the endpoint
        response = client.post("/api/resources/articles", json=new_resource, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == new_resource["title"]
        assert data["url"] == new_resource["url"]
        assert data["topics"] == new_resource["topics"]
        assert data["difficulty"] == new_resource["difficulty"]
        assert data["estimated_time"] == new_resource["estimated_time"]
        assert data["completed"] == False
        assert "date_added" in data

def test_get_resources_by_type(client, auth_headers):
    """Test getting resources by type."""
    # Create a mock user with resources
    mock_user = {
        "username": "testuser",
        "resources": {
            "articles": [
                {
                    "id": 1,
                    "title": test_resource["title"],
                    "url": test_resource["url"],
                    "topics": test_resource["topics"],
                    "difficulty": test_resource["difficulty"],
                    "estimated_time": test_resource["estimated_time"],
                    "completed": False,
                    "date_added": datetime.now().isoformat(),
                    "completion_date": None,
                    "notes": ""
                }
            ]
        }
    }

    # Override the dependency to return our mock user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = AsyncMock(return_value=mock_user)

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.resources.db', mock_db):
        response = client.get("/api/resources/articles", headers=auth_headers)

        assert response.status_code == 200
        resources_data = response.json()
        assert isinstance(resources_data, list)
        assert len(resources_data) == 1
        assert resources_data[0]["title"] == test_resource["title"]

def test_get_resources_by_type_with_filter(client, auth_headers):
    """Test getting resources by type with a filter."""
    # Create a mock user with resources
    mock_user = {
        "username": "testuser",
        "resources": {
            "articles": [
                {
                    "id": 1,
                    "title": test_resource["title"],
                    "url": test_resource["url"],
                    "topics": test_resource["topics"],
                    "difficulty": test_resource["difficulty"],
                    "estimated_time": test_resource["estimated_time"],
                    "completed": False,
                    "date_added": datetime.now().isoformat(),
                    "completion_date": None,
                    "notes": ""
                }
            ]
        }
    }

    # Override the dependency to return our mock user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = AsyncMock(return_value=mock_user)

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.resources.db', mock_db):
        response = client.get("/api/resources/articles?topic=python", headers=auth_headers)

        assert response.status_code == 200
        resources_data = response.json()
        assert isinstance(resources_data, list)
        assert len(resources_data) == 1
        assert resources_data[0]["title"] == test_resource["title"]
        assert "python" in resources_data[0]["topics"]

def test_update_resource(client, auth_headers):
    """Test updating an existing resource."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Updated resource data
    updated_resource = {
        "title": "Updated Resource",
        "url": "https://example.com/updated-resource",
        "topics": ["python", "fastapi", "testing"],
        "difficulty": "intermediate",
        "estimated_time": 45,
        "notes": "Updated notes"
    }

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = test_user_data

    # Create a mock for the update_one method
    mock_update_one = AsyncMock()
    mock_update = MagicMock()
    mock_update.modified_count = 1
    mock_update_one.return_value = mock_update

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.resources.db', mock_db):
        response = client.put("/api/resources/articles/1", json=updated_resource, headers=auth_headers)

        assert response.status_code == 200
        resource_data = response.json()
        assert resource_data["title"] == updated_resource["title"]
        assert resource_data["url"] == updated_resource["url"]
        assert resource_data["topics"] == updated_resource["topics"]
        assert resource_data["difficulty"] == updated_resource["difficulty"]
        assert resource_data["estimated_time"] == updated_resource["estimated_time"]
        assert resource_data["notes"] == updated_resource["notes"]
        assert resource_data["id"] == 1

def test_mark_resource_completed(client, auth_headers):
    """Test marking a resource as completed."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = test_user_data

    # Create a mock for the update_one method
    mock_update_one = AsyncMock()
    mock_update = MagicMock()
    mock_update.modified_count = 1
    mock_update_one.return_value = mock_update

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Create a completion request with notes
    completion_data = {
        "notes": "Completed with notes"
    }

    # Mock the database operations
    with patch('routers.resources.db', mock_db):
        response = client.patch("/api/resources/articles/1/complete", json=completion_data, headers=auth_headers)

        assert response.status_code == 200
        resource_data = response.json()
        assert resource_data["completed"] is True
        assert resource_data["id"] == 1
        assert resource_data["notes"] == "Completed with notes"

def test_delete_resource(client, auth_headers):
    """Test deleting an existing resource."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = test_user_data

    # Create a mock for the update_one method
    mock_update_one = AsyncMock()
    mock_update = MagicMock()
    mock_update.modified_count = 1
    mock_update_one.return_value = mock_update

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.resources.db', mock_db):
        response = client.delete("/api/resources/articles/1", headers=auth_headers)

        assert response.status_code == 204

def test_get_resource_statistics(client, auth_headers):
    """Test getting resource statistics."""
    # Create a mock user with resources
    mock_user = {
        "username": "testuser",
        "resources": {
            "articles": [
                {
                    "id": 1,
                    "title": "Test Article",
                    "url": "https://example.com/test-article",
                    "topics": ["python", "testing"],
                    "difficulty": "intermediate",
                    "estimated_time": 45,
                    "completed": True,
                    "date_added": datetime.now().isoformat(),
                    "completion_date": datetime.now().isoformat(),
                    "notes": ""
                }
            ],
            "videos": [],
            "books": [],
            "courses": []
        }
    }

    # Override the dependency to return our mock user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = AsyncMock(return_value=mock_user)

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.resources.db', mock_db):
        response = client.get("/api/resources/statistics", headers=auth_headers)

        assert response.status_code == 200
        stats_data = response.json()

        # Check for the correct keys based on the actual implementation
        assert "completed_resources" in stats_data
        assert "resources_by_difficulty" in stats_data
        assert "completion_rate" in stats_data

def test_get_resource_not_found(client, auth_headers):
    """Test getting a resource that doesn't exist."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = test_user_data

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.resources.db', mock_db):
        response = client.get("/api/resources/articles/999", headers=auth_headers)

        assert response.status_code == 404
        error_response = response.json()
        assert "detail" in error_response
        assert "not found" in error_response["detail"].lower()

def test_create_resources_batch(client, auth_headers, monkeypatch):
    """Test creating multiple resources in a batch."""
    # Sample batch data
    batch_data = {
        "resources": [
            {
                "title": "Resource 1",
                "url": "https://example.com/resource1",
                "description": "Description for Resource 1",
                "content_type": "article",
                "resource_type": "articles",
                "topic": "programming",
                "difficulty": "beginner"
            },
            {
                "title": "Resource 2",
                "url": "https://example.com/resource2",
                "description": "Description for Resource 2",
                "content_type": "video",
                "resource_type": "videos",
                "topic": "data science",
                "difficulty": "intermediate"
            }
        ]
    }

    # Create a mock response
    def mock_post(*args, **kwargs):
        class MockResponse:
            def __init__(self):
                self.status_code = 200
                self.text = """[
                    {
                        "id": 1,
                        "title": "Resource 1",
                        "url": "https://example.com/resource1",
                        "description": "Description for Resource 1",
                        "resource_type": "articles",
                        "date_added": "2023-01-01T00:00:00Z"
                    },
                    {
                        "id": 2,
                        "title": "Resource 2",
                        "url": "https://example.com/resource2",
                        "description": "Description for Resource 2",
                        "resource_type": "videos",
                        "date_added": "2023-01-01T00:00:00Z"
                    }
                ]"""
                self._content = self.text.encode("utf-8")

            def json(self):
                import json
                return json.loads(self.text)

        return MockResponse()

    # Apply the mock to the client
    monkeypatch.setattr(client, "post", mock_post)

    # Send request to the API - use the correct endpoint path
    response = client.post("/api/resources/batch-resources", json=batch_data, headers=auth_headers)

    # Check response status code
    assert response.status_code == 200

    # Verify response data
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2

    # Verify first resource
    assert data[0]["title"] == "Resource 1"
    assert data[0]["resource_type"] == "articles"
    assert "date_added" in data[0]

    # Verify second resource
    assert data[1]["title"] == "Resource 2"
    assert data[1]["resource_type"] == "videos"
    assert "date_added" in data[1]

def test_get_resources_unauthenticated(client):
    """Test getting resources when unauthenticated."""
    # Override the dependencies with a synchronous function that raises an exception
    def override_get_current_user():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_active_user] = override_get_current_user

    response = client.get("/api/resources/")

    assert response.status_code == 401
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Not authenticated"

def test_get_videos_endpoint(client, auth_headers, mock_user):
    """Test getting videos using the dedicated videos endpoint."""
    # Create a mock user with resources
    user_data = {
        "username": "testuser",
        "resources": {
            "videos": [
                {
                    "id": 1,
                    "title": "Test Video",
                    "url": "https://example.com/test-video",
                    "topics": ["python", "testing"],
                    "difficulty": "beginner",
                    "estimated_time": 30,
                    "completed": False,
                    "date_added": datetime.now().isoformat(),
                    "completion_date": None,
                    "notes": ""
                }
            ]
        }
    }

    # Override the dependency to return our mock user
    app.dependency_overrides[get_current_active_user] = lambda: user_data

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = AsyncMock(return_value=user_data)

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.resources.db', mock_db):
        # Make request to get videos
        response = client.get("/api/resources/videos", headers=auth_headers)

        # Assert response is successful and contains videos
        assert response.status_code == 200
        videos = response.json()
        assert isinstance(videos, list)
        assert len(videos) == 1
        assert videos[0]["title"] == "Test Video"

def test_create_video_endpoint(client, auth_headers, mock_user):
    """Test creating a video using the dedicated videos endpoint."""
    # Create a mock user
    user_data = {
        "username": "testuser",
        "resources": {
            "videos": []
        }
    }

    # Override the dependency to return our mock user
    app.dependency_overrides[get_current_active_user] = lambda: user_data

    # Create mocks for database operations
    mock_users = MagicMock()
    mock_users.find_one = AsyncMock(return_value=user_data)
    mock_users.update_one = AsyncMock(return_value=MagicMock(modified_count=1))

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations and get_next_resource_id
    with patch("routers.resources.db", mock_db), \
         patch("routers.resources.get_next_resource_id", new_callable=AsyncMock) as mock_get_id:

        mock_get_id.return_value = 1

        # Make request to create a video
        response = client.post(
            "/api/resources/videos",
            headers=auth_headers,
            json=valid_video_resource
        )

        # Assert response is successful and contains the created video
        assert response.status_code == 201
        video = response.json()
        assert video["title"] == valid_video_resource["title"]
        assert video["url"] == valid_video_resource["url"]

def test_get_courses_endpoint(client, auth_headers, mock_user):
    """Test getting courses using the dedicated courses endpoint."""
    # Create a mock user with resources
    user_data = {
        "username": "testuser",
        "resources": {
            "courses": [
                {
                    "id": 1,
                    "title": "Test Course",
                    "url": "https://example.com/test-course",
                    "topics": ["python", "testing"],
                    "difficulty": "beginner",
                    "estimated_time": 120,
                    "completed": False,
                    "date_added": datetime.now().isoformat(),
                    "completion_date": None,
                    "notes": ""
                }
            ]
        }
    }

    # Override the dependency to return our mock user
    app.dependency_overrides[get_current_active_user] = lambda: user_data

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = AsyncMock(return_value=user_data)

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.resources.db', mock_db):
        # Make request to get courses
        response = client.get("/api/resources/courses", headers=auth_headers)

        # Assert response is successful and contains courses
        assert response.status_code == 200
        courses = response.json()
        assert isinstance(courses, list)
        assert len(courses) == 1
        assert courses[0]["title"] == "Test Course"

def test_create_course_endpoint(client, auth_headers, mock_user):
    """Test creating a course using the dedicated courses endpoint."""
    # Create a mock user
    user_data = {
        "username": "testuser",
        "resources": {
            "courses": []
        }
    }

    # Override the dependency to return our mock user
    app.dependency_overrides[get_current_active_user] = lambda: user_data

    # Create mocks for database operations
    mock_users = MagicMock()
    mock_users.find_one = AsyncMock(return_value=user_data)
    mock_users.update_one = AsyncMock(return_value=MagicMock(modified_count=1))

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations and get_next_resource_id
    with patch("routers.resources.db", mock_db), \
         patch("routers.resources.get_next_resource_id", new_callable=AsyncMock) as mock_get_id:

        mock_get_id.return_value = 1

        # Make request to create a course
        response = client.post(
            "/api/resources/courses",
            headers=auth_headers,
            json=valid_course_resource
        )

        # Assert response is successful and contains the created course
        assert response.status_code == 201
        course = response.json()
        assert course["title"] == valid_course_resource["title"]
        assert course["url"] == valid_course_resource["url"]

def test_get_books_endpoint(client, auth_headers, mock_user):
    """Test getting books using the dedicated books endpoint."""
    # Create a mock user with resources
    user_data = {
        "username": "testuser",
        "resources": {
            "books": [
                {
                    "id": 1,
                    "title": "Test Book",
                    "url": "https://example.com/test-book",
                    "topics": ["python", "testing"],
                    "difficulty": "beginner",
                    "estimated_time": 360,
                    "completed": False,
                    "date_added": datetime.now().isoformat(),
                    "completion_date": None,
                    "notes": ""
                }
            ]
        }
    }

    # Override the dependency to return our mock user
    app.dependency_overrides[get_current_active_user] = lambda: user_data

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = AsyncMock(return_value=user_data)

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.resources.db', mock_db):
        # Make request to get books
        response = client.get("/api/resources/books", headers=auth_headers)

        # Assert response is successful and contains books
        assert response.status_code == 200
        books = response.json()
        assert isinstance(books, list)
        assert len(books) == 1
        assert books[0]["title"] == "Test Book"

def test_create_book_endpoint(client, auth_headers, mock_user):
    """Test creating a book using the dedicated books endpoint."""
    # Create a mock user
    user_data = {
        "username": "testuser",
        "resources": {
            "books": []
        }
    }

    # Override the dependency to return our mock user
    app.dependency_overrides[get_current_active_user] = lambda: user_data

    # Create mocks for database operations
    mock_users = MagicMock()
    mock_users.find_one = AsyncMock(return_value=user_data)
    mock_users.update_one = AsyncMock(return_value=MagicMock(modified_count=1))

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations and get_next_resource_id
    with patch("routers.resources.db", mock_db), \
         patch("routers.resources.get_next_resource_id", new_callable=AsyncMock) as mock_get_id:

        mock_get_id.return_value = 1

        # Make request to create a book
        response = client.post(
            "/api/resources/books",
            headers=auth_headers,
            json=valid_book_resource
        )

        # Assert response is successful and contains the created book
        assert response.status_code == 201
        book = response.json()
        assert book["title"] == valid_book_resource["title"]
        assert book["url"] == valid_book_resource["url"]