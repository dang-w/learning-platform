import pytest
from datetime import datetime

def test_get_reviews_empty(client, auth_headers, test_db):
    """Test getting reviews when there are none."""
    response = client.get(
        "/api/reviews/",
        headers=auth_headers,
    )
    assert response.status_code == 200
    reviews = response.json()
    assert len(reviews) == 0

def test_create_resource_review(client, auth_headers, test_db):
    """Test creating a resource review."""
    # First create a resource to review
    resource_data = {
        "title": "Test Resource",
        "url": "https://example.com/test",
        "topics": ["python", "testing"],
        "difficulty": "beginner",
        "estimated_time": 30
    }

    resource_response = client.post(
        "/api/resources/articles",
        json=resource_data,
        headers=auth_headers,
    )

    resource_id = resource_response.json()["id"]

    # Create a review for the resource
    review_data = {
        "resource_type": "article",
        "resource_id": resource_id,
        "rating": 4,
        "content": "This was a great resource!",
        "difficulty_rating": 3,
        "topics": ["python", "testing"]
    }

    response = client.post(
        "/api/reviews/",
        json=review_data,
        headers=auth_headers,
    )

    assert response.status_code == 201
    created_review = response.json()
    assert created_review["resource_type"] == "article"
    assert created_review["resource_id"] == resource_id
    assert created_review["rating"] == 4
    assert created_review["content"] == "This was a great resource!"
    assert created_review["difficulty_rating"] == 3
    assert created_review["topics"] == ["python", "testing"]
    assert "date" in created_review

def test_get_reviews(client, auth_headers, test_db):
    """Test getting all reviews."""
    # First create a resource and a review
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

    resource_id = resource_response.json()["id"]

    review_data = {
        "resource_type": "article",
        "resource_id": resource_id,
        "rating": 5,
        "content": "Excellent resource",
        "difficulty_rating": 2,
        "topics": ["python"]
    }

    client.post(
        "/api/reviews/",
        json=review_data,
        headers=auth_headers,
    )

    # Get all reviews
    response = client.get(
        "/api/reviews/",
        headers=auth_headers,
    )

    assert response.status_code == 200
    reviews = response.json()
    assert len(reviews) == 1
    assert reviews[0]["rating"] == 5
    assert reviews[0]["content"] == "Excellent resource"

def test_get_reviews_by_resource(client, auth_headers, test_db):
    """Test getting reviews for a specific resource."""
    # Create two resources
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

    resource2_response = client.post(
        "/api/resources/videos",
        json=resource2,
        headers=auth_headers,
    )

    resource1_id = resource1_response.json()["id"]
    resource2_id = resource2_response.json()["id"]

    # Create reviews for both resources
    review1 = {
        "resource_type": "article",
        "resource_id": resource1_id,
        "rating": 4,
        "content": "Good article",
        "difficulty_rating": 2,
        "topics": ["python"]
    }

    review2 = {
        "resource_type": "video",
        "resource_id": resource2_id,
        "rating": 5,
        "content": "Great video",
        "difficulty_rating": 3,
        "topics": ["javascript"]
    }

    client.post("/api/reviews/", json=review1, headers=auth_headers)
    client.post("/api/reviews/", json=review2, headers=auth_headers)

    # Get reviews for resource 1
    response = client.get(
        f"/api/reviews/resource/article/{resource1_id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    reviews = response.json()
    assert len(reviews) == 1
    assert reviews[0]["content"] == "Good article"

def test_update_review(client, auth_headers, test_db):
    """Test updating a review."""
    # First create a resource and a review
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

    review_id = review_response.json()["id"]

    # Update the review
    update_data = {
        "rating": 4,
        "content": "Updated review",
        "difficulty_rating": 3
    }

    update_response = client.put(
        f"/api/reviews/{review_id}",
        json=update_data,
        headers=auth_headers,
    )

    assert update_response.status_code == 200
    updated_review = update_response.json()
    assert updated_review["rating"] == 4
    assert updated_review["content"] == "Updated review"
    assert updated_review["difficulty_rating"] == 3
    assert updated_review["topics"] == ["python"]  # Unchanged

def test_delete_review(client, auth_headers, test_db):
    """Test deleting a review."""
    # First create a resource and a review
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

    resource_id = resource_response.json()["id"]

    review_data = {
        "resource_type": "article",
        "resource_id": resource_id,
        "rating": 3,
        "content": "Test review",
        "difficulty_rating": 2,
        "topics": ["python"]
    }

    review_response = client.post(
        "/api/reviews/",
        json=review_data,
        headers=auth_headers,
    )

    review_id = review_response.json()["id"]

    # Delete the review
    delete_response = client.delete(
        f"/api/reviews/{review_id}",
        headers=auth_headers,
    )

    assert delete_response.status_code == 204

    # Verify it's deleted
    get_response = client.get(
        "/api/reviews/",
        headers=auth_headers,
    )

    assert get_response.status_code == 200
    reviews = get_response.json()
    assert len(reviews) == 0

def test_get_review_statistics(client, auth_headers, test_db):
    """Test getting review statistics."""
    # Create resources and reviews
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
        "topics": ["python"],
        "difficulty": "intermediate",
        "estimated_time": 45
    }

    resource1_response = client.post(
        "/api/resources/articles",
        json=resource1,
        headers=auth_headers,
    )

    resource2_response = client.post(
        "/api/resources/articles",
        json=resource2,
        headers=auth_headers,
    )

    resource1_id = resource1_response.json()["id"]
    resource2_id = resource2_response.json()["id"]

    # Create reviews
    review1 = {
        "resource_type": "article",
        "resource_id": resource1_id,
        "rating": 4,
        "content": "Good resource",
        "difficulty_rating": 2,
        "topics": ["python"]
    }

    review2 = {
        "resource_type": "article",
        "resource_id": resource2_id,
        "rating": 5,
        "content": "Great resource",
        "difficulty_rating": 4,
        "topics": ["python"]
    }

    client.post("/api/reviews/", json=review1, headers=auth_headers)
    client.post("/api/reviews/", json=review2, headers=auth_headers)

    # Get statistics
    response = client.get(
        "/api/reviews/statistics",
        headers=auth_headers,
    )

    assert response.status_code == 200
    stats = response.json()

    assert stats["total_reviews"] == 2
    assert stats["average_rating"] == 4.5  # (4 + 5) / 2
    assert stats["average_difficulty"] == 3.0  # (2 + 4) / 2
    assert "topics" in stats
    assert "python" in stats["topics"]
    assert stats["topics"]["python"]["count"] == 2