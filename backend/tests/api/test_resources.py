import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime

import routers.resources
from main import User

@pytest.mark.asyncio
async def test_get_resources(client, test_db, auth_headers, mock_auth_dependencies):
    """Test getting all resources."""
    # Patch the router's database with the test database
    original_db = routers.resources.db
    routers.resources.db = test_db

    try:
        # Initialize user with empty resources structure
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"resources": {
                "articles": [],
                "videos": [],
                "courses": [],
                "books": []
            }}},
            upsert=True
        )

        # Create test resources
        articles = [
            {
                "id": 1,
                "title": "Test Article 1",
                "url": "https://example.com/article1",
                "topics": ["AI", "ML"],
                "difficulty": "beginner",
                "estimated_time": 60,
                "completed": False,
                "date_added": datetime.now().isoformat(),
                "completion_date": None,
                "notes": ""
            }
        ]

        videos = [
            {
                "id": 1,
                "title": "Test Video 1",
                "url": "https://example.com/video1",
                "topics": ["Deep Learning"],
                "difficulty": "intermediate",
                "estimated_time": 120,
                "completed": True,
                "date_added": datetime.now().isoformat(),
                "completion_date": datetime.now().isoformat(),
                "notes": "Great video"
            }
        ]

        # Update user with resources
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {
                "resources.articles": articles,
                "resources.videos": videos
            }}
        )

        # Test getting all resources
        response = client.get("/api/resources/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        # Verify the structure and content
        assert "articles" in data
        assert "videos" in data
        assert len(data["articles"]) == 1
        assert len(data["videos"]) == 1
        assert data["articles"][0]["title"] == "Test Article 1"
        assert data["videos"][0]["title"] == "Test Video 1"
    finally:
        # Restore the original database
        routers.resources.db = original_db

@pytest.mark.asyncio
async def test_get_resources_by_type(client, test_db, auth_headers, mock_auth_dependencies):
    """Test getting resources by type."""
    # Patch the router's database with the test database
    original_db = routers.resources.db
    routers.resources.db = test_db

    try:
        # Initialize user with empty resources structure
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"resources": {
                "articles": [],
                "videos": [],
                "courses": [],
                "books": []
            }}},
            upsert=True
        )

        # Create test resources
        articles = [
            {
                "id": 1,
                "title": "Test Article 1",
                "url": "https://example.com/article1",
                "topics": ["AI", "ML"],
                "difficulty": "beginner",
                "estimated_time": 60,
                "completed": False,
                "date_added": datetime.now().isoformat(),
                "completion_date": None,
                "notes": ""
            },
            {
                "id": 2,
                "title": "Test Article 2",
                "url": "https://example.com/article2",
                "topics": ["Python"],
                "difficulty": "beginner",
                "estimated_time": 30,
                "completed": False,
                "date_added": datetime.now().isoformat(),
                "completion_date": None,
                "notes": ""
            }
        ]

        videos = [
            {
                "id": 1,
                "title": "Test Video 1",
                "url": "https://example.com/video1",
                "topics": ["Deep Learning"],
                "difficulty": "intermediate",
                "estimated_time": 120,
                "completed": True,
                "date_added": datetime.now().isoformat(),
                "completion_date": datetime.now().isoformat(),
                "notes": "Great video"
            }
        ]

        # Update user with resources
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {
                "resources.articles": articles,
                "resources.videos": videos
            }}
        )

        # Test getting resources by type
        response = client.get("/api/resources/articles", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["title"] == "Test Article 1"
        assert data[1]["title"] == "Test Article 2"

        response = client.get("/api/resources/videos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Test Video 1"
    finally:
        # Restore the original database
        routers.resources.db = original_db

@pytest.mark.asyncio
async def test_create_resource(client, test_db, auth_headers, mock_auth_dependencies):
    """Test creating a new resource."""
    # Patch the router's database with the test database
    original_db = routers.resources.db
    routers.resources.db = test_db

    try:
        # Initialize user with empty resources structure
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"resources": {
                "articles": [],
                "videos": [],
                "courses": [],
                "books": []
            }}},
            upsert=True
        )

        new_resource = {
            "title": "New Article",
            "url": "https://example.com/new-article",
            "topics": ["AI", "ML"],
            "difficulty": "beginner",
            "estimated_time": 60
        }

        response = client.post("/api/resources/articles", json=new_resource, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Article"
        assert data["url"] == "https://example.com/new-article"
        assert data["topics"] == ["AI", "ML"]
        assert data["difficulty"] == "beginner"
        assert data["estimated_time"] == 60
        assert data["completed"] is False
        assert "id" in data
        assert isinstance(data["id"], int)

        # Verify it was saved to the database
        user = await test_db.users.find_one({"username": "testuser"})
        assert user is not None
        assert "resources" in user
        assert "articles" in user["resources"]
        assert len(user["resources"]["articles"]) == 1
        assert user["resources"]["articles"][0]["title"] == "New Article"
    finally:
        # Restore the original database
        routers.resources.db = original_db

@pytest.mark.asyncio
async def test_update_resource(client, test_db, auth_headers, mock_auth_dependencies):
    """Test updating a resource."""
    # Patch the router's database with the test database
    original_db = routers.resources.db
    routers.resources.db = test_db

    try:
        # Initialize user with empty resources structure
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"resources": {
                "articles": [],
                "videos": [],
                "courses": [],
                "books": []
            }}},
            upsert=True
        )

        # Create a test resource
        article = {
            "id": 1,
            "title": "Test Article",
            "url": "https://example.com/article",
            "topics": ["AI", "ML"],
            "difficulty": "beginner",
            "estimated_time": 60,
            "completed": False,
            "date_added": datetime.now().isoformat(),
            "completion_date": None,
            "notes": ""
        }

        # Add the resource to the user
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"resources.articles": [article]}}
        )

        # Update the resource
        update_data = {
            "title": "Updated Article",
            "difficulty": "intermediate",
            "notes": "Added some notes"
        }

        response = client.put(f"/api/resources/articles/1", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Article"
        assert data["difficulty"] == "intermediate"
        assert data["notes"] == "Added some notes"
        assert data["url"] == "https://example.com/article"  # Unchanged field

        # Verify it was updated in the database
        user = await test_db.users.find_one({"username": "testuser"})
        assert user is not None
        assert "resources" in user
        assert "articles" in user["resources"]
        assert len(user["resources"]["articles"]) == 1
        assert user["resources"]["articles"][0]["title"] == "Updated Article"
        assert user["resources"]["articles"][0]["difficulty"] == "intermediate"
        assert user["resources"]["articles"][0]["notes"] == "Added some notes"
    finally:
        # Restore the original database
        routers.resources.db = original_db

@pytest.mark.asyncio
async def test_delete_resource(client, test_db, auth_headers, mock_auth_dependencies):
    """Test deleting a resource."""
    # Patch the router's database with the test database
    original_db = routers.resources.db
    routers.resources.db = test_db

    try:
        # Initialize user with empty resources structure
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"resources": {
                "articles": [],
                "videos": [],
                "courses": [],
                "books": []
            }}},
            upsert=True
        )

        # Create a test resource
        article = {
            "id": 1,
            "title": "Test Article",
            "url": "https://example.com/article",
            "topics": ["AI", "ML"],
            "difficulty": "beginner",
            "estimated_time": 60,
            "completed": False,
            "date_added": datetime.now().isoformat(),
            "completion_date": None,
            "notes": ""
        }

        # Add the resource to the user
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"resources.articles": [article]}}
        )

        # Delete the resource
        response = client.delete(f"/api/resources/articles/1", headers=auth_headers)
        assert response.status_code == 204

        # Verify it was deleted from the database
        user = await test_db.users.find_one({"username": "testuser"})
        assert user is not None
        assert "resources" in user
        assert "articles" in user["resources"]
        assert len(user["resources"]["articles"]) == 0
    finally:
        # Restore the original database
        routers.resources.db = original_db

@pytest.mark.asyncio
async def test_toggle_resource_completion(client, test_db, auth_headers, mock_auth_dependencies):
    """Test toggling resource completion status."""
    # Patch the router's database with the test database
    original_db = routers.resources.db
    routers.resources.db = test_db

    try:
        # Initialize user with empty resources structure
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"resources": {
                "articles": [],
                "videos": [],
                "courses": [],
                "books": []
            }}},
            upsert=True
        )

        # Create a test resource
        article = {
            "id": 1,
            "title": "Test Article",
            "url": "https://example.com/article",
            "topics": ["AI", "ML"],
            "difficulty": "beginner",
            "estimated_time": 60,
            "completed": False,
            "date_added": datetime.now().isoformat(),
            "completion_date": None,
            "notes": ""
        }

        # Add the resource to the user
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"resources.articles": [article]}}
        )

        # Toggle completion status
        response = client.post(f"/api/resources/articles/1/complete", json={}, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["completed"] is True
        assert data["completion_date"] is not None

        # Verify it was updated in the database
        user = await test_db.users.find_one({"username": "testuser"})
        assert user is not None
        assert "resources" in user
        assert "articles" in user["resources"]
        assert len(user["resources"]["articles"]) == 1
        assert user["resources"]["articles"][0]["completed"] is True
        assert user["resources"]["articles"][0]["completion_date"] is not None

        # Toggle again to mark as incomplete
        response = client.post(f"/api/resources/articles/1/complete", json={}, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["completed"] is False
        assert data["completion_date"] is None

        # Verify it was updated in the database
        user = await test_db.users.find_one({"username": "testuser"})
        assert user is not None
        assert "resources" in user
        assert "articles" in user["resources"]
        assert len(user["resources"]["articles"]) == 1
        assert user["resources"]["articles"][0]["completed"] is False
        assert user["resources"]["articles"][0]["completion_date"] is None
    finally:
        # Restore the original database
        routers.resources.db = original_db

@pytest.mark.asyncio
async def test_get_resource_statistics(client, test_db, auth_headers, mock_auth_dependencies):
    """Test getting resource statistics."""
    # Patch the router's database with the test database
    original_db = routers.resources.db
    routers.resources.db = test_db

    try:
        # Initialize user with empty resources structure
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"resources": {
                "articles": [],
                "videos": [],
                "courses": [],
                "books": []
            }}},
            upsert=True
        )

        # Create test resources
        articles = [
            {
                "id": 1,
                "title": "Test Article 1",
                "url": "https://example.com/article1",
                "topics": ["AI", "ML"],
                "difficulty": "beginner",
                "estimated_time": 60,
                "completed": True,
                "date_added": datetime.now().isoformat(),
                "completion_date": datetime.now().isoformat(),
                "notes": ""
            },
            {
                "id": 2,
                "title": "Test Article 2",
                "url": "https://example.com/article2",
                "topics": ["Python"],
                "difficulty": "beginner",
                "estimated_time": 30,
                "completed": False,
                "date_added": datetime.now().isoformat(),
                "completion_date": None,
                "notes": ""
            }
        ]

        videos = [
            {
                "id": 1,
                "title": "Test Video 1",
                "url": "https://example.com/video1",
                "topics": ["Deep Learning"],
                "difficulty": "intermediate",
                "estimated_time": 120,
                "completed": True,
                "date_added": datetime.now().isoformat(),
                "completion_date": datetime.now().isoformat(),
                "notes": "Great video"
            }
        ]

        courses = [
            {
                "id": 1,
                "title": "Test Course 1",
                "url": "https://example.com/course1",
                "topics": ["AI", "ML"],
                "difficulty": "advanced",
                "estimated_time": 1800,
                "completed": False,
                "date_added": datetime.now().isoformat(),
                "completion_date": None,
                "notes": ""
            }
        ]

        # Update user with resources
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {
                "resources.articles": articles,
                "resources.videos": videos,
                "resources.courses": courses
            }}
        )

        # Test getting resource statistics
        response = client.get("/api/resources/statistics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        # Check the statistics
        assert data["total"] == 4
        assert data["completed"] == 2
        assert data["completion_percentage"] == 50.0

        assert data["by_type"]["articles"]["total"] == 2
        assert data["by_type"]["videos"]["total"] == 1
        assert data["by_type"]["courses"]["total"] == 1

        assert data["by_type"]["articles"]["completed"] == 1
        assert data["by_type"]["videos"]["completed"] == 1
        assert data["by_type"]["courses"]["completed"] == 0

        assert "AI" in data["by_topic"]
        assert "ML" in data["by_topic"]
        assert "Python" in data["by_topic"]
        assert "Deep Learning" in data["by_topic"]

        assert data["by_difficulty"]["beginner"] == 2
        assert data["by_difficulty"]["intermediate"] == 1
        assert data["by_difficulty"]["advanced"] == 1

        assert data["estimated_time"]["total"] == 2010
        assert data["estimated_time"]["completed"] == 180
        assert data["estimated_time"]["remaining"] == 1830
    finally:
        # Restore the original database
        routers.resources.db = original_db