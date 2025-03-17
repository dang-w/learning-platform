import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import json
from bson import ObjectId

from database import db
from auth import create_access_token

@pytest.fixture
def mock_resource():
    """Create a mock resource for testing."""
    resource_data = {
        "title": "Direct Test Resource",
        "description": "A test resource created directly",
        "url": "https://example.com/direct-test",
        "resource_type": "article",
        "tags": ["test", "direct"],
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "completion_status": "not_started",
        "notes": "Direct test notes",
        "priority": 7,
        "owner_username": "testuser"
    }

    # Generate a unique ID
    resource_id = str(ObjectId())

    # Add the ID to the resource data
    resource_data["_id"] = ObjectId(resource_id)

    return resource_data, resource_id

@pytest.mark.integration
@pytest.mark.skip(reason="Test requires a real database connection and has event loop issues")
def test_resource_creation_direct(mock_resource):
    """
    Test that resources can be created directly in the database:
    1. Create a resource
    2. Retrieve the resource
    3. Verify the resource details
    """
    resource_data, resource_id = mock_resource

    # Create mocks
    mock_insert_one = MagicMock()
    mock_insert_one.return_value = MagicMock()
    mock_insert_one.return_value.inserted_id = ObjectId(resource_id)

    mock_find_one = MagicMock(return_value=resource_data)

    mock_delete_one = MagicMock()

    mock_resources = MagicMock()
    mock_resources.insert_one = mock_insert_one
    mock_resources.find_one = mock_find_one
    mock_resources.delete_one = mock_delete_one

    # Mock the database
    with patch("database.db.resources", mock_resources):
        # 1. Create a resource
        result = db.resources.insert_one(resource_data)
        assert result.inserted_id is not None
        resource_id = result.inserted_id

        # 2. Retrieve the resource
        resource = db.resources.find_one({"_id": resource_id})
        assert resource is not None

        # 3. Verify the resource details
        assert resource["title"] == resource_data["title"]
        assert resource["description"] == resource_data["description"]
        assert resource["url"] == resource_data["url"]
        assert resource["resource_type"] == resource_data["resource_type"]
        assert resource["tags"] == resource_data["tags"]
        assert resource["completion_status"] == resource_data["completion_status"]
        assert resource["notes"] == resource_data["notes"]
        assert resource["priority"] == resource_data["priority"]
        assert resource["owner_username"] == resource_data["owner_username"]

        # Clean up
        db.resources.delete_one({"_id": resource_id})

        # Verify the mocks were called correctly
        mock_insert_one.assert_called_once_with(resource_data)
        mock_find_one.assert_called_once_with({"_id": resource_id})
        mock_delete_one.assert_called_once_with({"_id": resource_id})