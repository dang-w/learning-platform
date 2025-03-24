"""Tests for the notes API endpoints."""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime
import asyncio
import time
import sys
from pathlib import Path
import json

# Add the parent directory to the path so we can import modules
sys.path.append(str(Path(__file__).parent.parent.parent))

# Import the app and auth functions
from main import app
from auth import get_current_user, get_current_active_user
from database import db

# Import standardized utilities
from utils.error_handlers import AuthenticationError, ResourceNotFoundError

# Import the MockUser class from conftest
from tests.conftest import MockUser

def serialize_object_id(obj):
    """Convert ObjectId to string in a dictionary."""
    if isinstance(obj, dict):
        return {k: str(v) if isinstance(v, ObjectId) else serialize_object_id(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_object_id(item) for item in obj]
    return obj

# Test data
_id = ObjectId("507f1f77bcf86cd799439011")
test_note = {
    "_id": _id,
    "id": str(_id),
    "title": "Test Note",
    "content": "This is test note content",
    "tags": ["test", "note", "python"],
    "user_id": "testuser",
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow()
}

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def mock_user():
    """Create a mock authenticated user."""
    mock_user = MockUser(username="testuser")
    mock_user._id = "testuser"
    return mock_user

@pytest.fixture
def auth_headers():
    """Create mock authentication headers."""
    return {"Authorization": "Bearer fake_token"}

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

def test_get_notes(client, mock_db, mock_user, auth_headers):
    """Test getting notes."""
    # Override dependencies
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Set up mock return value with serialized ObjectId
    mock_db.notes.find.return_value.to_list.return_value = [serialize_object_id(test_note)]

    with patch('routers.notes.db', mock_db):
        response = client.get("/api/notes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == test_note["title"]
        assert data["items"][0]["id"] == str(test_note["_id"])

def test_get_note(client, mock_db, mock_user, auth_headers):
    """Test getting a single note."""
    # Override dependencies
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Set up mock return value with serialized ObjectId
    mock_db.notes.find_one.return_value = serialize_object_id(test_note)

    with patch('routers.notes.db', mock_db):
        response = client.get(f"/api/notes/{str(test_note['_id'])}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == test_note["title"]
        assert data["id"] == str(test_note["_id"])

def test_create_note(client, mock_db, mock_user, auth_headers):
    """Test creating a note."""
    # Override dependencies
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Set up mock return values with serialized ObjectId
    note_data = {"title": "New Note", "content": "New Content"}
    created_note = {**test_note, **note_data}
    mock_db.notes.insert_one.return_value.inserted_id = test_note["_id"]
    mock_db.notes.find_one.return_value = serialize_object_id(created_note)

    with patch('routers.notes.db', mock_db):
        response = client.post("/api/notes", json=note_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == note_data["title"]
        assert data["id"] == str(test_note["_id"])

def test_update_note(client, mock_db, mock_user, auth_headers):
    """Test updating a note."""
    # Override dependencies
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Set up mock return values with serialized ObjectId
    update_data = {"title": "Updated Note", "content": "Updated Content"}
    updated_note = {**test_note, **update_data}
    mock_db.notes.find_one.return_value = serialize_object_id(updated_note)
    mock_db.notes.update_one.return_value.modified_count = 1

    with patch('routers.notes.db', mock_db):
        response = client.put(
            f"/api/notes/{str(test_note['_id'])}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["id"] == str(test_note["_id"])

def test_delete_note(client, mock_db, mock_user, auth_headers):
    """Test deleting a note."""
    # Override dependencies
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Set up mock return values with serialized ObjectId
    mock_db.notes.find_one.return_value = serialize_object_id(test_note)
    mock_db.notes.delete_one.return_value.deleted_count = 1

    with patch('routers.notes.db', mock_db):
        response = client.delete(
            f"/api/notes/{str(test_note['_id'])}",
            headers=auth_headers
        )
        assert response.status_code == 204

def test_filter_notes_by_tag(client, mock_db, mock_user, auth_headers):
    """Test filtering notes by tag."""
    # Override dependencies
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Set up mock return value with serialized ObjectId
    mock_db.notes.find.return_value.to_list.return_value = [serialize_object_id(test_note)]

    with patch('routers.notes.db', mock_db):
        response = client.get("/api/notes?tag=test", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert "test" in data["items"][0]["tags"]
        assert data["items"][0]["id"] == str(test_note["_id"])

def test_get_notes_unauthorized(client):
    """Test getting notes without authentication."""
    # Override dependencies to ensure no user is authenticated
    app.dependency_overrides[get_current_user] = lambda: None
    app.dependency_overrides[get_current_active_user] = lambda: None

    response = client.get("/api/notes")
    assert response.status_code == 401

    # Clean up overrides
    app.dependency_overrides.clear()

def test_notes_pagination(client, mock_db, mock_user, auth_headers):
    """Test notes pagination."""
    # Override dependencies
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Set up mock return values with serialized ObjectId
    mock_db.notes.count_documents.return_value = 25
    mock_db.notes.find.return_value.to_list.return_value = [serialize_object_id(test_note)]

    with patch('routers.notes.db', mock_db):
        response = client.get("/api/notes?page=1&per_page=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        assert data["total"] == 25
        assert len(data["items"]) == 1
        assert data["items"][0]["id"] == str(test_note["_id"])

@pytest.mark.asyncio
async def test_note_validation(async_client, mock_db, monkeypatch):
    """Test note validation."""
    monkeypatch.setattr("database.db", mock_db)
    invalid_note = {"content": ""}  # Missing title
    response = await async_client.post("/api/notes", json=invalid_note)
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_rate_limit(async_client, mock_db, monkeypatch):
    """Test rate limiting."""
    monkeypatch.setattr("database.db", mock_db)
    mock_db.notes.find.return_value.to_list.return_value = [
        {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "title": "Test Note",
            "content": "Test Content",
            "created_at": "2024-03-24T00:00:00",
            "updated_at": "2024-03-24T00:00:00",
            "user_id": "testuser"
        }
    ]
    for _ in range(51):  # Exceed rate limit (50 requests per minute)
        await async_client.get("/api/notes")
    response = await async_client.get("/api/notes")
    assert response.status_code == 429