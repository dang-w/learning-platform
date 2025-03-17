import pytest
import pytest_asyncio
from datetime import datetime, timedelta
import asyncio
import json
import uuid
from bson import ObjectId

from database import db
from auth import create_access_token

@pytest_asyncio.fixture(scope="function")
async def setup_test_resource():
    """Create a test resource directly in the database."""
    # Define test resource data
    resource_data = {
        "title": "Test Resource",
        "description": "A test resource for integration testing",
        "url": "https://example.com/test-resource",
        "resource_type": "article",
        "tags": ["test", "integration"],
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "completion_status": "not_started",
        "notes": "Test notes",
        "priority": 5,
        "owner_username": "testuser"
    }

    # Insert the test resource
    result = await db.resources.insert_one(resource_data)
    resource_id = result.inserted_id

    # Add the ID to the resource data
    resource_data["_id"] = resource_id

    yield resource_data

    # Clean up after tests
    await db.resources.delete_one({"_id": resource_id})

@pytest.mark.integration
@pytest.mark.asyncio
async def test_resource_creation_direct():
    """
    Test that resources can be created directly in the database:
    1. Create a resource
    2. Retrieve the resource
    3. Verify the resource details
    """
    # 1. Create a resource
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

    # Insert the resource
    result = await db.resources.insert_one(resource_data)
    resource_id = result.inserted_id

    try:
        # 2. Retrieve the resource
        retrieved_resource = await db.resources.find_one({"_id": resource_id})

        # 3. Verify the resource details
        assert retrieved_resource is not None
        assert retrieved_resource["title"] == resource_data["title"]
        assert retrieved_resource["description"] == resource_data["description"]
        assert retrieved_resource["url"] == resource_data["url"]
        assert retrieved_resource["resource_type"] == resource_data["resource_type"]
        assert retrieved_resource["owner_username"] == "testuser"
    finally:
        # Clean up
        await db.resources.delete_one({"_id": resource_id})