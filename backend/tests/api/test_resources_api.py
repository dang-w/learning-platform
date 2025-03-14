import pytest
from datetime import datetime

def test_get_all_resources_empty(client, auth_headers, test_db):
    """Test getting all resources when there are none."""
    response = client.get(
        "/api/resources/",
        headers=auth_headers,
    )
    assert response.status_code == 200
    resources = response.json()
    assert "articles" in resources
    assert "videos" in resources
    assert "courses" in resources
    assert "books" in resources
    assert len(resources["articles"]) == 0
    assert len(resources["videos"]) == 0
    assert len(resources["courses"]) == 0
    assert len(resources["books"]) == 0

def test_create_resource(client, auth_headers, test_db):
    """Test creating a resource."""
    # Create a resource
    resource_data = {
        "title": "Test Resource",
        "url": "https://example.com/test",
        "topics": ["python", "testing"],
        "difficulty": "beginner",
        "estimated_time": 30
    }

    response = client.post(
        "/api/resources/articles",
        json=resource_data,
        headers=auth_headers,
    )

    assert response.status_code == 201
    created_resource = response.json()
    assert created_resource["title"] == "Test Resource"
    assert created_resource["url"] == "https://example.com/test"
    assert created_resource["topics"] == ["python", "testing"]
    assert created_resource["difficulty"] == "beginner"
    assert created_resource["estimated_time"] == 30
    assert created_resource["completed"] is False
    assert "date_added" in created_resource
    assert created_resource["id"] == 1  # First resource should have ID 1

def test_get_resources_by_type(client, auth_headers, test_db):
    """Test getting resources by type."""
    # Create a resource first
    resource_data = {
        "title": "Test Resource",
        "url": "https://example.com/test",
        "topics": ["python", "testing"],
        "difficulty": "beginner",
        "estimated_time": 30
    }

    client.post(
        "/api/resources/articles",
        json=resource_data,
        headers=auth_headers,
    )

    # Get resources by type
    response = client.get(
        "/api/resources/articles",
        headers=auth_headers,
    )

    assert response.status_code == 200
    resources = response.json()
    assert len(resources) == 1
    assert resources[0]["title"] == "Test Resource"

def test_get_resources_by_type_with_filter(client, auth_headers, test_db):
    """Test getting resources by type with filters."""
    # Create resources with different topics
    resource1 = {
        "title": "Python Resource",
        "url": "https://example.com/python",
        "topics": ["python"],
        "difficulty": "beginner",
        "estimated_time": 30
    }

    resource2 = {
        "title": "JavaScript Resource",
        "url": "https://example.com/js",
        "topics": ["javascript"],
        "difficulty": "intermediate",
        "estimated_time": 45
    }

    client.post("/api/resources/articles", json=resource1, headers=auth_headers)
    client.post("/api/resources/articles", json=resource2, headers=auth_headers)

    # Filter by topic
    response = client.get(
        "/api/resources/articles?topic=python",
        headers=auth_headers,
    )

    assert response.status_code == 200
    resources = response.json()
    assert len(resources) == 1
    assert resources[0]["title"] == "Python Resource"

def test_update_resource(client, auth_headers, test_db):
    """Test updating a resource."""
    # Create a resource first
    resource_data = {
        "title": "Original Title",
        "url": "https://example.com/original",
        "topics": ["python"],
        "difficulty": "beginner",
        "estimated_time": 30
    }

    create_response = client.post(
        "/api/resources/articles",
        json=resource_data,
        headers=auth_headers,
    )

    resource_id = create_response.json()["id"]

    # Update the resource
    update_data = {
        "title": "Updated Title",
        "difficulty": "intermediate"
    }

    update_response = client.put(
        f"/api/resources/articles/{resource_id}",
        json=update_data,
        headers=auth_headers,
    )

    assert update_response.status_code == 200
    updated_resource = update_response.json()
    assert updated_resource["title"] == "Updated Title"
    assert updated_resource["difficulty"] == "intermediate"
    assert updated_resource["url"] == "https://example.com/original"  # Unchanged
    assert updated_resource["topics"] == ["python"]  # Unchanged

def test_mark_resource_completed(client, auth_headers, test_db):
    """Test marking a resource as completed."""
    # Create a resource first
    resource_data = {
        "title": "Test Resource",
        "url": "https://example.com/test",
        "topics": ["python"],
        "difficulty": "beginner",
        "estimated_time": 30
    }

    create_response = client.post(
        "/api/resources/articles",
        json=resource_data,
        headers=auth_headers,
    )

    resource_id = create_response.json()["id"]

    # Mark as completed
    completion_data = {
        "notes": "This was a great resource!"
    }

    complete_response = client.post(
        f"/api/resources/articles/{resource_id}/complete",
        json=completion_data,
        headers=auth_headers,
    )

    assert complete_response.status_code == 200
    completed_resource = complete_response.json()
    assert completed_resource["completed"] is True
    assert "completion_date" in completed_resource
    assert completed_resource["notes"] == "This was a great resource!"

def test_delete_resource(client, auth_headers, test_db):
    """Test deleting a resource."""
    # Create a resource first
    resource_data = {
        "title": "Test Resource",
        "url": "https://example.com/test",
        "topics": ["python"],
        "difficulty": "beginner",
        "estimated_time": 30
    }

    create_response = client.post(
        "/api/resources/articles",
        json=resource_data,
        headers=auth_headers,
    )

    resource_id = create_response.json()["id"]

    # Delete the resource
    delete_response = client.delete(
        f"/api/resources/articles/{resource_id}",
        headers=auth_headers,
    )

    assert delete_response.status_code == 204

    # Verify it's deleted
    get_response = client.get(
        "/api/resources/articles",
        headers=auth_headers,
    )

    assert get_response.status_code == 200
    resources = get_response.json()
    assert len(resources) == 0

def test_get_resource_statistics(client, auth_headers, test_db):
    """Test getting resource statistics."""
    # Create resources of different types
    article = {
        "title": "Article",
        "url": "https://example.com/article",
        "topics": ["python"],
        "difficulty": "beginner",
        "estimated_time": 30
    }

    video = {
        "title": "Video",
        "url": "https://youtube.com/video",
        "topics": ["python"],
        "difficulty": "intermediate",
        "estimated_time": 45
    }

    client.post("/api/resources/articles", json=article, headers=auth_headers)
    client.post("/api/resources/videos", json=video, headers=auth_headers)

    # Mark article as completed
    article_response = client.get("/api/resources/articles", headers=auth_headers)
    article_id = article_response.json()[0]["id"]

    client.post(
        f"/api/resources/articles/{article_id}/complete",
        json={"notes": "Completed"},
        headers=auth_headers,
    )

    # Get statistics
    stats_response = client.get(
        "/api/resources/statistics",
        headers=auth_headers,
    )

    assert stats_response.status_code == 200
    stats = stats_response.json()

    assert stats["total_resources"] == 2
    assert stats["completed_resources"] == 1
    assert stats["completion_rate"] == 50.0
    assert "resources_by_type" in stats
    assert stats["resources_by_type"]["articles"] == 1
    assert stats["resources_by_type"]["videos"] == 1