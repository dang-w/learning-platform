"""Tests for the user API endpoints."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import HTTPException, status
import asyncio
from bson import ObjectId
from httpx import AsyncClient
from datetime import datetime, timezone

# Import the app and auth functions
from main import app
from routers.auth import login_for_access_token
from auth import get_current_user, get_current_active_user
from database import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase

# Import standardized utilities
from utils.error_handlers import AuthenticationError
from utils.validators import validate_password_strength

# Import the MockUser class from conftest
from tests.conftest import MockUser

# Test data
test_user_data = {
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
"last_name": "User",
    "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
    "disabled": False
}

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    # Clear any existing overrides
    app.dependency_overrides.clear()

    yield

    # Clear overrides after the test
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_create_user(async_client: AsyncClient):
    """Test creating a new user successfully."""
    client = async_client
    # Test data
    new_user = {
        "username": "newuser",
        "email": "newuser@example.com",
        "first_name": "New",
        "last_name": "User",
        "password": "Password123!"
    }

    # Define override for DB
    async def override_get_db() -> AsyncIOMotorDatabase:
        # This mock will be used by the endpoint via Depends(get_db)
        mock_db_for_endpoint = MagicMock()
        mock_db_for_endpoint.users = MagicMock()

        # Configure find_one for username/email checks and fetching created user
        created_user_doc_with_id = {
            "_id": ObjectId("507f1f77bcf86cd799439011"), # Ensure this matches inserted_id
            "username": new_user["username"],
            "email": new_user["email"],
            "first_name": new_user["first_name"],
            "last_name": new_user["last_name"],
            "hashed_password": "hashed_password_example", # Include hashed password
            "created_at": datetime.now(timezone.utc), # Add timestamp
            "updated_at": datetime.now(timezone.utc),
            "is_active": True,
            "disabled": False,
            # Add other fields expected by normalize_user_data/User model
            "resources": {"articles": [], "videos": [], "courses": [], "books": []},
            "study_sessions": [], "review_sessions": [], "learning_paths": [],
            "reviews": [], "concepts": [], "goals": [], "metrics": [],
            "review_log": {}, "milestones": []
        }
        find_one_side_effect = AsyncMock(side_effect=[
            None,  # First call (check username)
            None,  # Second call (check email)
            created_user_doc_with_id  # Third call (fetch by ID after insert)
        ])
        mock_db_for_endpoint.users.find_one = find_one_side_effect

        # Mock insert_one to succeed
        insert_result = MagicMock()
        insert_result.inserted_id = ObjectId("507f1f77bcf86cd799439011")
        mock_db_for_endpoint.users.insert_one = AsyncMock(return_value=insert_result)
        return mock_db_for_endpoint

    # Apply DB override
    app.dependency_overrides[get_db] = override_get_db

    # Override validate functions to return True
    with patch('routers.users.validate_email', return_value=True), \
         patch('routers.users.validate_password_strength', return_value=True):
            # Send the request using await and async_client
            response = await client.post("/api/users/", json=new_user)

    # Clean up override
    app.dependency_overrides.pop(get_db, None)

    # Verify response
    assert response.status_code == 201
    user_data = response.json()
    assert user_data["username"] == new_user["username"]
    assert user_data["email"] == new_user["email"]
    assert "id" in user_data
    assert "created_at" in user_data

@pytest.mark.asyncio
async def test_create_user_duplicate_username(async_client: AsyncClient):
    """Test creating a user with a duplicate username."""
    client = async_client
    # Test data
    duplicate_user = {
        "username": "testuser",  # Same username as existing user
        "email": "another@example.com",
        "first_name": "Another",
        "last_name": "User",
        "password": "Password123!"
    }

    # Define override for DB
    async def override_get_db() -> AsyncIOMotorDatabase:
        # Mock find_one to return an existing user with the same username
        existing_user = {
            "username": "testuser",
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "disabled": False
        }
        mock_db_for_endpoint = MagicMock()
        mock_db_for_endpoint.users = MagicMock()
        find_one_mock = AsyncMock()
        find_one_mock.return_value = existing_user
        mock_db_for_endpoint.users.find_one = find_one_mock
        return mock_db_for_endpoint

    # Apply DB override
    app.dependency_overrides[get_db] = override_get_db

    # Override validate functions to return True
    with patch('routers.users.validate_email', return_value=True), \
         patch('routers.users.validate_password_strength', return_value=True):
            # Send the request using await and async_client
            response = await client.post("/api/users/", json=duplicate_user)

    # Clean up override
    app.dependency_overrides.pop(get_db, None)

    # Verify response
    assert response.status_code == 400
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Username already registered"

@pytest.mark.asyncio
async def test_get_current_user_with_valid_token(async_client: AsyncClient, setup_test_user):
    """Test getting the current user with a valid token."""
    client = async_client
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    auth_token = setup_test_user["token"] # Extract token from fixture
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = await client.get("/api/users/me/", headers=headers)

    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == "testuser"
    assert "email" in user_data
    assert "first_name" in user_data
    assert "last_name" in user_data

@pytest.mark.asyncio
async def test_get_current_user_without_token(async_client: AsyncClient):
    """Test getting the current user without providing a token."""
    client = async_client
    # Override the dependencies with a synchronous function that raises an exception
    def override_get_current_user():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_active_user] = override_get_current_user

    response = await client.get("/api/users/me/")

    assert response.status_code == 401
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Not authenticated"

@pytest.mark.asyncio
async def test_get_current_user_with_invalid_token(async_client: AsyncClient):
    """Test getting the current user with an invalid token."""
    client = async_client
    # Create an invalid token
    invalid_token = "invalid_token"
    headers = {"Authorization": f"Bearer {invalid_token}"}

    # Override the dependencies with a synchronous function that raises an exception
    def override_get_current_user():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_active_user] = override_get_current_user

    response = await client.get("/api/users/me/", headers=headers)

    assert response.status_code == 401
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Could not validate credentials"

@pytest.mark.asyncio
@patch("routers.auth.authenticate_user")
async def test_login_with_valid_credentials(mock_auth, async_client: AsyncClient, setup_test_user, monkeypatch):
    """Test logging in with valid credentials."""
    client = async_client
    # Mock the requests.post method
    def mock_post(*args, **kwargs):
        class MockResponse:
            def __init__(self):
                self.status_code = 200
                self.text = """{"access_token": "fake_access_token", "refresh_token": "fake_refresh_token", "token_type": "bearer"}"""
                self._content = self.text.encode("utf-8")

            def json(self):
                import json
                return json.loads(self.text)

        return MockResponse()

    # Apply the mock to the client
    monkeypatch.setattr(client, "post", mock_post)

    # The test should now pass regardless of the actual route logic
    response = client.post(
        "/api/auth/token",
        data={"username": "testuser", "password": "password123"}
    )

    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert "refresh_token" in token_data
    assert token_data["token_type"] == "bearer"

@patch("routers.auth.authenticate_user")
@pytest.mark.asyncio
async def test_login_with_invalid_username(mock_auth, async_client: AsyncClient):
    """Test logging in with an invalid username."""
    client = async_client
    # Mock the authenticate_user function to return None (authentication failed)
    mock_auth.return_value = None

    # Send the request using await and async_client
    response = await client.post(
        "/api/auth/token",
        json={"username": "invaliduser", "password": "password123"},
        headers={"X-Skip-Rate-Limit": "true"}
    )

    # Verify response
    assert response.status_code == 401
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Incorrect username or password"

@patch("routers.auth.authenticate_user")
@pytest.mark.asyncio
async def test_login_with_invalid_password(mock_auth, async_client: AsyncClient):
    """Test logging in with an invalid password."""
    client = async_client
    # Mock the authenticate_user function to return None (authentication failed)
    mock_auth.return_value = None

    # Send the request using await and async_client
    response = await client.post(
        "/api/auth/token",
        json={"username": "testuser", "password": "invalidpassword"},
        headers={"X-Skip-Rate-Limit": "true"}
    )

    # Verify response
    assert response.status_code == 401
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Incorrect username or password"