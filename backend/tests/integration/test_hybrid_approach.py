import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import asyncio
import json
import uuid
from bson import ObjectId

from main import app
from database import db
from auth import create_access_token

@pytest_asyncio.fixture
async def resource_id():
    """Create a resource and return its ID, then clean up after the test."""
    resource_data = {
        "title": "Hybrid Test Resource",
        "description": "A test resource created using hybrid approach",
        "url": "https://example.com/hybrid-test",
        "resource_type": "article",
        "tags": ["test", "hybrid"],
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "completion_status": "not_started",
        "notes": "Hybrid test notes",
        "priority": 6,
        "owner_username": "testuser"
    }

    # Insert the resource
    result = await db.resources.insert_one(resource_data)
    resource_id = str(result.inserted_id)

    yield resource_id

    # Clean up
    await db.resources.delete_one({"_id": ObjectId(resource_id)})

@pytest.mark.integration
@pytest.mark.asyncio
async def test_hybrid_approach(client, auth_headers, resource_id):
    """
    Test that combines TestClient for authentication and direct database access for resource operations.
    1. Verify authentication works using TestClient
    2. Use a pre-created resource from the fixture
    3. Retrieve the resource using TestClient
    """
    # 1. Verify authentication works using TestClient
    response = client.get("/users/me/", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get user profile: {response.content}"

    user_data = response.json()
    assert user_data["username"] == "testuser"

    # 3. Retrieve the resource using TestClient
    response = client.get(f"/api/resources/{resource_id}", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get resource: {response.content}"

    retrieved_resource = response.json()
    assert retrieved_resource["title"] == "Hybrid Test Resource"
    assert retrieved_resource["description"] == "A test resource created using hybrid approach"