import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime

@pytest.mark.asyncio
async def test_get_resources(client, db, auth_headers):
    """Test getting all resources."""
    # Insert test resources
    resources = [
        {
            "title": "Test Article 1",
            "url": "https://example.com/article1",
            "topics": ["AI", "ML"],
            "difficulty": "beginner",
            "estimated_time": 60,
            "completed": False,
            "date_added": datetime.now(),
            "completion_date": None,
            "notes": "",
            "user_id": ObjectId(auth_headers["user_id"]),
            "resource_type": "articles"
        },
        {
            "title": "Test Video 1",
            "url": "https://example.com/video1",
            "topics": ["Deep Learning"],
            "difficulty": "intermediate",
            "estimated_time": 120,
            "completed": True,
            "date_added": datetime.now(),
            "completion_date": datetime.now(),
            "notes": "Great video",
            "user_id": ObjectId(auth_headers["user_id"]),
            "resource_type": "videos"
        }
    ]

    await db.resources.insert_many(resources)

    # Test getting all resources
    response = client.get("/api/resources/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "Test Article 1"
    assert data[1]["title"] == "Test Video 1"

@pytest.mark.asyncio
async def test_get_resources_by_type(client, db, auth_headers):
    """Test getting resources by type."""
    # Insert test resources
    resources = [
        {
            "title": "Test Article 1",
            "url": "https://example.com/article1",
            "topics": ["AI", "ML"],
            "difficulty": "beginner",
            "estimated_time": 60,
            "completed": False,
            "date_added": datetime.now(),
            "completion_date": None,
            "notes": "",
            "user_id": ObjectId(auth_headers["user_id"]),
            "resource_type": "articles"
        },
        {
            "title": "Test Article 2",
            "url": "https://example.com/article2",
            "topics": ["Python"],
            "difficulty": "beginner",
            "estimated_time": 30,
            "completed": False,
            "date_added": datetime.now(),
            "completion_date": None,
            "notes": "",
            "user_id": ObjectId(auth_headers["user_id"]),
            "resource_type": "articles"
        },
        {
            "title": "Test Video 1",
            "url": "https://example.com/video1",
            "topics": ["Deep Learning"],
            "difficulty": "intermediate",
            "estimated_time": 120,
            "completed": True,
            "date_added": datetime.now(),
            "completion_date": datetime.now(),
            "notes": "Great video",
            "user_id": ObjectId(auth_headers["user_id"]),
            "resource_type": "videos"
        }
    ]

    await db.resources.insert_many(resources)

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

@pytest.mark.asyncio
async def test_create_resource(client, db, auth_headers):
    """Test creating a new resource."""
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

    # Verify it was saved to the database
    db_resource = await db.resources.find_one({"_id": ObjectId(data["id"])})
    assert db_resource is not None
    assert db_resource["title"] == "New Article"
    assert db_resource["user_id"] == ObjectId(auth_headers["user_id"])
    assert db_resource["resource_type"] == "articles"

@pytest.mark.asyncio
async def test_update_resource(client, db, auth_headers):
    """Test updating a resource."""
    # Insert a test resource
    resource_id = ObjectId()
    resource = {
        "_id": resource_id,
        "title": "Test Article",
        "url": "https://example.com/article",
        "topics": ["AI", "ML"],
        "difficulty": "beginner",
        "estimated_time": 60,
        "completed": False,
        "date_added": datetime.now(),
        "completion_date": None,
        "notes": "",
        "user_id": ObjectId(auth_headers["user_id"]),
        "resource_type": "articles"
    }

    await db.resources.insert_one(resource)

    # Update the resource
    update_data = {
        "title": "Updated Article",
        "difficulty": "intermediate",
        "notes": "Added some notes"
    }

    response = client.put(f"/api/resources/articles/{str(resource_id)}", json=update_data, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Article"
    assert data["difficulty"] == "intermediate"
    assert data["notes"] == "Added some notes"
    assert data["url"] == "https://example.com/article"  # Unchanged field

    # Verify it was updated in the database
    db_resource = await db.resources.find_one({"_id": resource_id})
    assert db_resource["title"] == "Updated Article"
    assert db_resource["difficulty"] == "intermediate"
    assert db_resource["notes"] == "Added some notes"

@pytest.mark.asyncio
async def test_delete_resource(client, db, auth_headers):
    """Test deleting a resource."""
    # Insert a test resource
    resource_id = ObjectId()
    resource = {
        "_id": resource_id,
        "title": "Test Article",
        "url": "https://example.com/article",
        "topics": ["AI", "ML"],
        "difficulty": "beginner",
        "estimated_time": 60,
        "completed": False,
        "date_added": datetime.now(),
        "completion_date": None,
        "notes": "",
        "user_id": ObjectId(auth_headers["user_id"]),
        "resource_type": "articles"
    }

    await db.resources.insert_one(resource)

    # Delete the resource
    response = client.delete(f"/api/resources/articles/{str(resource_id)}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify it was deleted from the database
    db_resource = await db.resources.find_one({"_id": resource_id})
    assert db_resource is None

@pytest.mark.asyncio
async def test_toggle_resource_completion(client, db, auth_headers):
    """Test toggling resource completion status."""
    # Insert a test resource
    resource_id = ObjectId()
    resource = {
        "_id": resource_id,
        "title": "Test Article",
        "url": "https://example.com/article",
        "topics": ["AI", "ML"],
        "difficulty": "beginner",
        "estimated_time": 60,
        "completed": False,
        "date_added": datetime.now(),
        "completion_date": None,
        "notes": "",
        "user_id": ObjectId(auth_headers["user_id"]),
        "resource_type": "articles"
    }

    await db.resources.insert_one(resource)

    # Toggle completion status
    response = client.post(f"/api/resources/articles/{str(resource_id)}/complete", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["completed"] is True
    assert data["completion_date"] is not None

    # Verify it was updated in the database
    db_resource = await db.resources.find_one({"_id": resource_id})
    assert db_resource["completed"] is True
    assert db_resource["completion_date"] is not None

    # Toggle again to mark as incomplete
    response = client.post(f"/api/resources/articles/{str(resource_id)}/complete", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["completed"] is False
    assert data["completion_date"] is None

    # Verify it was updated in the database
    db_resource = await db.resources.find_one({"_id": resource_id})
    assert db_resource["completed"] is False
    assert db_resource["completion_date"] is None

@pytest.mark.asyncio
async def test_get_resource_statistics(client, db, auth_headers):
    """Test getting resource statistics."""
    # Insert test resources
    resources = [
        {
            "title": "Test Article 1",
            "url": "https://example.com/article1",
            "topics": ["AI", "ML"],
            "difficulty": "beginner",
            "estimated_time": 60,
            "completed": True,
            "date_added": datetime.now(),
            "completion_date": datetime.now(),
            "notes": "",
            "user_id": ObjectId(auth_headers["user_id"]),
            "resource_type": "articles"
        },
        {
            "title": "Test Article 2",
            "url": "https://example.com/article2",
            "topics": ["Python"],
            "difficulty": "beginner",
            "estimated_time": 30,
            "completed": False,
            "date_added": datetime.now(),
            "completion_date": None,
            "notes": "",
            "user_id": ObjectId(auth_headers["user_id"]),
            "resource_type": "articles"
        },
        {
            "title": "Test Video 1",
            "url": "https://example.com/video1",
            "topics": ["Deep Learning"],
            "difficulty": "intermediate",
            "estimated_time": 120,
            "completed": True,
            "date_added": datetime.now(),
            "completion_date": datetime.now(),
            "notes": "Great video",
            "user_id": ObjectId(auth_headers["user_id"]),
            "resource_type": "videos"
        },
        {
            "title": "Test Course 1",
            "url": "https://example.com/course1",
            "topics": ["AI", "ML"],
            "difficulty": "advanced",
            "estimated_time": 1800,
            "completed": False,
            "date_added": datetime.now(),
            "completion_date": None,
            "notes": "",
            "user_id": ObjectId(auth_headers["user_id"]),
            "resource_type": "courses"
        }
    ]

    await db.resources.insert_many(resources)

    # Test getting resource statistics
    response = client.get("/api/resources/statistics", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["total_resources"] == 4
    assert data["completed_resources"] == 2
    assert data["completion_percentage"] == 50.0

    assert data["resources_by_type"]["articles"] == 2
    assert data["resources_by_type"]["videos"] == 1
    assert data["resources_by_type"]["courses"] == 1

    assert data["completed_by_type"]["articles"] == 1
    assert data["completed_by_type"]["videos"] == 1
    assert data["completed_by_type"].get("courses", 0) == 0

    assert "AI" in data["topics"]
    assert "ML" in data["topics"]
    assert "Python" in data["topics"]
    assert "Deep Learning" in data["topics"]

    assert data["difficulty_distribution"]["beginner"] == 2
    assert data["difficulty_distribution"]["intermediate"] == 1
    assert data["difficulty_distribution"]["advanced"] == 1