"""Tests for the notes API endpoints."""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime, timezone
import asyncio
import time
import sys
from pathlib import Path
import json
from fastapi.testclient import TestClient
from httpx import AsyncClient  # Import AsyncClient
from jose import jwt
from pydantic import validator

# Add the parent directory to the path so we can import modules
sys.path.append(str(Path(__file__).parent.parent.parent))

# Import the app and auth functions
from main import app
# Remove unused get_current_user, get_current_active_user imports if not needed elsewhere
from auth import get_current_user, get_current_active_user # Re-add necessary imports
from database import db
from auth import create_access_token # Import if needed for token generation, maybe not needed if using setup_test_user

# Import standardized utilities
from utils.error_handlers import AuthenticationError, ResourceNotFoundError

# Import setup_test_user fixture from conftest instead of MockUser
from tests.conftest import setup_test_user # Assuming setup_test_user is defined in conftest

# Import from tests.utils
from tests.utils import serialize_object_id

# Define test_note directly in this file
# Ensure the user_id matches the user from setup_test_user
TEST_USER_USERNAME = "testuser" # Consistent username
test_note = {
    "_id": ObjectId("507f1f77bcf86cd799439011"), # Example valid ObjectId
    "title": "Test Note Title",
    "content": "This is the content of the test note.",
    "user_id": TEST_USER_USERNAME, # Use consistent username
    "tags": ["test", "example"],
    "created_at": datetime.now(),
    "updated_at": datetime.now()
}

# Test data
_id = ObjectId("507f1f77bcf86cd799439011")

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()

# Removed local mock_user fixture, use setup_test_user from conftest

@pytest.fixture
def mock_db():
    """Create a mock database for testing."""
    mock_db = MagicMock()
    mock_db.notes = MagicMock()

    # Set up async mock methods
    mock_db.notes.find_one = AsyncMock()
    mock_db.notes.insert_one = AsyncMock()
    mock_db.notes.update_one = AsyncMock()
    mock_db.notes.delete_one = AsyncMock()
    mock_db.notes.count_documents = AsyncMock(return_value=10)

    # Set up find cursor mock
    mock_cursor = AsyncMock()
    mock_cursor.sort = MagicMock(return_value=mock_cursor)
    mock_cursor.skip = MagicMock(return_value=mock_cursor)
    mock_cursor.limit = MagicMock(return_value=mock_cursor)
    mock_cursor.to_list = AsyncMock()
    mock_db.notes.find = MagicMock(return_value=mock_cursor)

    return mock_db

@pytest.mark.asyncio
async def test_get_notes(async_client: AsyncClient, mock_db, setup_test_user):
    """Test getting all notes for a user."""
    client = async_client
    token = setup_test_user["token"] # Get token from fixture
    headers = {"Authorization": f"Bearer {token}"} # Create auth headers

    # Set up mock return value with serialized ObjectId
    mock_db.notes.find.return_value.to_list.return_value = [serialize_object_id(test_note)]
    mock_db.notes.count_documents.return_value = 1 # Ensure count matches list length

    with patch('routers.notes.db', mock_db):
        response = await client.get("/api/notes/", headers=headers) # Pass headers
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == test_note["title"]
        assert data["items"][0]["id"] == str(test_note["_id"])

@pytest.mark.asyncio
async def test_get_note(async_client: AsyncClient, mock_db, setup_test_user):
    """Test getting a single note by ID."""
    client = async_client
    token = setup_test_user["token"] # Get token
    headers = {"Authorization": f"Bearer {token}"} # Create headers
    note_id = test_note["_id"]
    # Ensure find_one returns a dict compatible with serialization if needed
    mock_db.notes.find_one.return_value = serialize_object_id(test_note)

    with patch('routers.notes.db', mock_db):
        # Ensure NO trailing slash
        response = await client.get(f"/api/notes/{note_id}", headers=headers) # Pass headers
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == test_note["title"]
        assert data["id"] == str(test_note["_id"])

@pytest.mark.asyncio
async def test_create_note(async_client: AsyncClient, mock_db, setup_test_user):
    """Test creating a new note."""
    client = async_client
    token = setup_test_user["token"] # Get token
    user = setup_test_user["user"] # Get user
    headers = {"Authorization": f"Bearer {token}"} # Create headers

    new_note_data = {"title": "New Test Note", "content": "New Content", "tags": ["new", "test"]}
    mock_insert_result = MagicMock()
    mock_insert_result.inserted_id = ObjectId()
    mock_db.notes.insert_one.return_value = mock_insert_result

    # Mock find_one to return the newly created note after insert
    now = datetime.now(timezone.utc)
    created_note = {
        **new_note_data,
        "_id": mock_insert_result.inserted_id,
        "user_id": user["username"], # Use username from setup_test_user
        "created_at": now,
        "updated_at": now
    }
    mock_db.notes.find_one.return_value = serialize_object_id(created_note)

    with patch('routers.notes.db', mock_db):
        response = await client.post("/api/notes/", json=new_note_data, headers=headers) # Pass headers
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == new_note_data["title"]
        assert "id" in data
        assert data["content"] == new_note_data["content"]
        assert data["tags"] == new_note_data["tags"]
        assert "created_at" in data

@pytest.mark.asyncio
async def test_update_note(async_client: AsyncClient, mock_db, setup_test_user):
    """Test updating an existing note."""
    client = async_client
    token = setup_test_user["token"] # Get token
    headers = {"Authorization": f"Bearer {token}"} # Create headers

    note_id = test_note["_id"]
    update_data = {"title": "Updated Title", "content": "Updated Content", "tags": ["updated"]}

    # Mock find_one to first return the existing note, ensuring user_id matches
    existing_note_mock = serialize_object_id({**test_note, "user_id": setup_test_user["user"]["username"]})
    updated_note_mock = {**existing_note_mock, **update_data}

    mock_db.notes.find_one.side_effect = [
        existing_note_mock, # First call for check
        updated_note_mock   # Second call after update simulation
    ]
    mock_update_result = MagicMock()
    mock_update_result.matched_count = 1
    mock_update_result.modified_count = 1
    mock_db.notes.update_one.return_value = mock_update_result

    with patch('routers.notes.db', mock_db):
        # Ensure NO trailing slash
        response = await client.put(f"/api/notes/{note_id}", json=update_data, headers=headers) # Pass headers
        assert response.status_code == 200
        updated_response = response.json()
        assert updated_response["title"] == update_data["title"]
        assert updated_response["content"] == update_data["content"]
        assert updated_response["tags"] == update_data["tags"]

@pytest.mark.asyncio
async def test_delete_note(async_client: AsyncClient, mock_db, setup_test_user):
    """Test deleting an existing note."""
    client = async_client
    token = setup_test_user["token"] # Get token
    headers = {"Authorization": f"Bearer {token}"} # Create headers

    note_id = test_note["_id"]
    # Ensure the note found belongs to the test user
    mock_db.notes.find_one.return_value = serialize_object_id({**test_note, "user_id": setup_test_user["user"]["username"]}) # Note exists
    mock_delete_result = MagicMock()
    mock_delete_result.deleted_count = 1
    mock_db.notes.delete_one.return_value = mock_delete_result

    with patch('routers.notes.db', mock_db):
        # Ensure NO trailing slash
        response = await client.delete(f"/api/notes/{note_id}", headers=headers) # Pass headers
        assert response.status_code == 204

@pytest.mark.asyncio
async def test_filter_notes_by_tag(async_client: AsyncClient, mock_db, setup_test_user):
    """Test filtering notes by tag."""
    client = async_client
    token = setup_test_user["token"] # Get token
    headers = {"Authorization": f"Bearer {token}"} # Create headers

    mock_db.notes.find.return_value.to_list.return_value = [serialize_object_id(test_note)]
    mock_db.notes.count_documents.return_value = 1 # Ensure count matches list length

    with patch('routers.notes.db', mock_db):
        response = await client.get("/api/notes/?tag=test", headers=headers) # Pass headers
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert "test" in data["items"][0]["tags"]
        assert data["items"][0]["id"] == str(test_note["_id"])

@pytest.mark.asyncio
async def test_get_notes_unauthorized(async_client: AsyncClient):
    """Test getting notes when unauthenticated."""
    client = async_client
    # Override dependencies to ensure no user is authenticated
    app.dependency_overrides[get_current_user] = lambda: None
    app.dependency_overrides[get_current_active_user] = lambda: None

    response = await client.get("/api/notes/")
    assert response.status_code == 401

    # Clean up overrides after test
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_notes_pagination(async_client: AsyncClient, mock_db, setup_test_user):
    """Test pagination for getting notes."""
    client = async_client
    token = setup_test_user["token"] # Get token
    headers = {"Authorization": f"Bearer {token}"} # Create headers

    total_notes_count = 25
    page_size = 10
    current_page = 1
    mock_db.notes.count_documents.return_value = total_notes_count
    # Simulate returning only 10 notes for the first page
    notes_page = [serialize_object_id({**test_note, '_id': ObjectId(), 'user_id': setup_test_user["user"]["username"]}) for _ in range(page_size)]
    mock_db.notes.find.return_value.to_list.return_value = notes_page

    # Expected total pages calculation
    total_pages = (total_notes_count + page_size - 1) // page_size

    with patch('routers.notes.db', mock_db):
        response = await client.get(f"/api/notes/?page={current_page}&limit={page_size}", headers=headers) # Use 'limit' instead of 'per_page'
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == total_notes_count
        assert data["total_pages"] == total_pages
        assert data["current_page"] == current_page
        assert len(data["items"]) == page_size

@pytest.mark.asyncio
async def test_note_validation(async_client: AsyncClient, auth_headers, mock_db, monkeypatch):
    """Test validation for creating/updating notes."""
    client = async_client
    # Rely on auth_headers from setup_test_user fixture now
    invalid_note = {"content": ""}  # Missing title
    with patch('routers.notes.db', mock_db): # Keep patch for safety
        response = await client.post("/api/notes/", json=invalid_note, headers=auth_headers) # Use fixture headers
        assert response.status_code == 422

@pytest.mark.asyncio
async def test_rate_limit(async_client: AsyncClient, auth_headers, mock_db, monkeypatch):
    """Test rate limiting for notes API."""
    client = async_client
    # Rely on global patch from conftest for db if applicable, keep patch for clarity
    mock_db.notes.find.return_value.to_list.return_value = [serialize_object_id(test_note)]

    limit = 50 # Define limit variable

    with patch('utils.rate_limiter.check_rate_limit', new_callable=AsyncMock) as mock_check:
        async def rate_limit_side_effect(*args, **kwargs):
            call_count = mock_check.call_count
            # Use the defined limit variable
            if call_count > limit:
                 raise HTTPException(status_code=429, detail="Rate limit exceeded")
            return (True, limit - call_count, 0, int(time.time() + 60))

        mock_check.side_effect = rate_limit_side_effect

        with patch('routers.notes.db', mock_db):
            # Make requests up to and including the limit + 1
            for i in range(limit + 1):
                response = await client.get("/api/notes/", headers=auth_headers)
                if i < limit:
                    assert response.status_code == 200, f"Request {i+1} failed unexpectedly"
                else:
                    assert response.status_code == 429, f"Request {i+1} did not trigger rate limit"

            assert mock_check.call_count == limit + 1