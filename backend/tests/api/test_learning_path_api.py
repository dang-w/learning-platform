import pytest
from datetime import datetime

def test_get_learning_paths_empty(client, auth_headers, test_db):
    """Test getting learning paths when there are none."""
    response = client.get(
        "/api/learning-path/",
        headers=auth_headers,
    )
    assert response.status_code == 200
    paths = response.json()
    assert len(paths) == 0

def test_create_learning_path(client, auth_headers, test_db):
    """Test creating a learning path."""
    # Create a learning path
    path_data = {
        "title": "Python for Machine Learning",
        "description": "A learning path for Python in ML",
        "topics": ["python", "machine learning"],
        "difficulty": "intermediate",
        "estimated_time": 120,  # hours
        "resources": []
    }

    response = client.post(
        "/api/learning-path/",
        json=path_data,
        headers=auth_headers,
    )

    assert response.status_code == 201
    created_path = response.json()
    assert created_path["title"] == "Python for Machine Learning"
    assert created_path["description"] == "A learning path for Python in ML"
    assert created_path["topics"] == ["python", "machine learning"]
    assert created_path["difficulty"] == "intermediate"
    assert created_path["estimated_time"] == 120
    assert len(created_path["resources"]) == 0
    assert "id" in created_path
    assert "date_created" in created_path
    assert created_path["progress"] == 0

def test_get_learning_paths(client, auth_headers, test_db):
    """Test getting all learning paths."""
    # Create a learning path first
    path_data = {
        "title": "Test Learning Path",
        "description": "A test learning path",
        "topics": ["python"],
        "difficulty": "beginner",
        "estimated_time": 60,
        "resources": []
    }

    client.post(
        "/api/learning-path/",
        json=path_data,
        headers=auth_headers,
    )

    # Get all learning paths
    response = client.get(
        "/api/learning-path/",
        headers=auth_headers,
    )

    assert response.status_code == 200
    paths = response.json()
    assert len(paths) == 1
    assert paths[0]["title"] == "Test Learning Path"
    assert paths[0]["description"] == "A test learning path"

def test_get_learning_path_by_id(client, auth_headers, test_db):
    """Test getting a learning path by ID."""
    # Create a learning path first
    path_data = {
        "title": "Test Learning Path",
        "description": "A test learning path",
        "topics": ["python"],
        "difficulty": "beginner",
        "estimated_time": 60,
        "resources": []
    }

    create_response = client.post(
        "/api/learning-path/",
        json=path_data,
        headers=auth_headers,
    )

    path_id = create_response.json()["id"]

    # Get the learning path by ID
    response = client.get(
        f"/api/learning-path/{path_id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    path = response.json()
    assert path["id"] == path_id
    assert path["title"] == "Test Learning Path"

def test_update_learning_path(client, auth_headers, test_db):
    """Test updating a learning path."""
    # Create a learning path first
    path_data = {
        "title": "Original Title",
        "description": "Original description",
        "topics": ["python"],
        "difficulty": "beginner",
        "estimated_time": 60,
        "resources": []
    }

    create_response = client.post(
        "/api/learning-path/",
        json=path_data,
        headers=auth_headers,
    )

    path_id = create_response.json()["id"]

    # Update the learning path
    update_data = {
        "title": "Updated Title",
        "description": "Updated description",
        "difficulty": "intermediate"
    }

    update_response = client.put(
        f"/api/learning-path/{path_id}",
        json=update_data,
        headers=auth_headers,
    )

    assert update_response.status_code == 200
    updated_path = update_response.json()
    assert updated_path["title"] == "Updated Title"
    assert updated_path["description"] == "Updated description"
    assert updated_path["difficulty"] == "intermediate"
    assert updated_path["topics"] == ["python"]  # Unchanged
    assert updated_path["estimated_time"] == 60  # Unchanged

def test_add_resource_to_learning_path(client, auth_headers, test_db):
    """Test adding a resource to a learning path."""
    # Create a learning path
    path_data = {
        "title": "Test Learning Path",
        "description": "A test learning path",
        "topics": ["python"],
        "difficulty": "beginner",
        "estimated_time": 60,
        "resources": []
    }

    path_response = client.post(
        "/api/learning-path/",
        json=path_data,
        headers=auth_headers,
    )

    path_id = path_response.json()["id"]

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

    resource_id = resource_response.json()["id"]

    # Add the resource to the learning path
    add_resource_data = {
        "resource_type": "article",
        "resource_id": resource_id,
        "order": 1,
        "notes": "Start with this resource"
    }

    add_response = client.post(
        f"/api/learning-path/{path_id}/resources",
        json=add_resource_data,
        headers=auth_headers,
    )

    assert add_response.status_code == 200
    updated_path = add_response.json()
    assert len(updated_path["resources"]) == 1
    assert updated_path["resources"][0]["resource_type"] == "article"
    assert updated_path["resources"][0]["resource_id"] == resource_id
    assert updated_path["resources"][0]["order"] == 1
    assert updated_path["resources"][0]["notes"] == "Start with this resource"
    assert updated_path["resources"][0]["completed"] is False

def test_update_resource_in_learning_path(client, auth_headers, test_db):
    """Test updating a resource in a learning path."""
    # Create a learning path with a resource
    path_data = {
        "title": "Test Learning Path",
        "description": "A test learning path",
        "topics": ["python"],
        "difficulty": "beginner",
        "estimated_time": 60,
        "resources": []
    }

    path_response = client.post(
        "/api/learning-path/",
        json=path_data,
        headers=auth_headers,
    )

    path_id = path_response.json()["id"]

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

    resource_id = resource_response.json()["id"]

    # Add the resource to the learning path
    add_resource_data = {
        "resource_type": "article",
        "resource_id": resource_id,
        "order": 1,
        "notes": "Initial notes"
    }

    client.post(
        f"/api/learning-path/{path_id}/resources",
        json=add_resource_data,
        headers=auth_headers,
    )

    # Update the resource in the learning path
    update_resource_data = {
        "order": 2,
        "notes": "Updated notes"
    }

    update_response = client.put(
        f"/api/learning-path/{path_id}/resources/article/{resource_id}",
        json=update_resource_data,
        headers=auth_headers,
    )

    assert update_response.status_code == 200
    updated_path = update_response.json()
    assert updated_path["resources"][0]["order"] == 2
    assert updated_path["resources"][0]["notes"] == "Updated notes"

def test_mark_resource_completed_in_learning_path(client, auth_headers, test_db):
    """Test marking a resource as completed in a learning path."""
    # Create a learning path with a resource
    path_data = {
        "title": "Test Learning Path",
        "description": "A test learning path",
        "topics": ["python"],
        "difficulty": "beginner",
        "estimated_time": 60,
        "resources": []
    }

    path_response = client.post(
        "/api/learning-path/",
        json=path_data,
        headers=auth_headers,
    )

    path_id = path_response.json()["id"]

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

    resource_id = resource_response.json()["id"]

    # Add the resource to the learning path
    add_resource_data = {
        "resource_type": "article",
        "resource_id": resource_id,
        "order": 1,
        "notes": "Test notes"
    }

    client.post(
        f"/api/learning-path/{path_id}/resources",
        json=add_resource_data,
        headers=auth_headers,
    )

    # Mark the resource as completed
    complete_data = {
        "notes": "Completed this resource"
    }

    complete_response = client.post(
        f"/api/learning-path/{path_id}/resources/article/{resource_id}/complete",
        json=complete_data,
        headers=auth_headers,
    )

    assert complete_response.status_code == 200
    updated_path = complete_response.json()
    assert updated_path["resources"][0]["completed"] is True
    assert "completion_date" in updated_path["resources"][0]
    assert updated_path["progress"] == 100  # 1/1 resources completed = 100%

def test_remove_resource_from_learning_path(client, auth_headers, test_db):
    """Test removing a resource from a learning path."""
    # Create a learning path with a resource
    path_data = {
        "title": "Test Learning Path",
        "description": "A test learning path",
        "topics": ["python"],
        "difficulty": "beginner",
        "estimated_time": 60,
        "resources": []
    }

    path_response = client.post(
        "/api/learning-path/",
        json=path_data,
        headers=auth_headers,
    )

    path_id = path_response.json()["id"]

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

    resource_id = resource_response.json()["id"]

    # Add the resource to the learning path
    add_resource_data = {
        "resource_type": "article",
        "resource_id": resource_id,
        "order": 1,
        "notes": "Test notes"
    }

    client.post(
        f"/api/learning-path/{path_id}/resources",
        json=add_resource_data,
        headers=auth_headers,
    )

    # Remove the resource from the learning path
    remove_response = client.delete(
        f"/api/learning-path/{path_id}/resources/article/{resource_id}",
        headers=auth_headers,
    )

    assert remove_response.status_code == 200
    updated_path = remove_response.json()
    assert len(updated_path["resources"]) == 0

def test_delete_learning_path(client, auth_headers, test_db):
    """Test deleting a learning path."""
    # Create a learning path
    path_data = {
        "title": "Test Learning Path",
        "description": "A test learning path",
        "topics": ["python"],
        "difficulty": "beginner",
        "estimated_time": 60,
        "resources": []
    }

    create_response = client.post(
        "/api/learning-path/",
        json=path_data,
        headers=auth_headers,
    )

    path_id = create_response.json()["id"]

    # Delete the learning path
    delete_response = client.delete(
        f"/api/learning-path/{path_id}",
        headers=auth_headers,
    )

    assert delete_response.status_code == 204

    # Verify it's deleted
    get_response = client.get(
        "/api/learning-path/",
        headers=auth_headers,
    )

    assert get_response.status_code == 200
    paths = get_response.json()
    assert len(paths) == 0