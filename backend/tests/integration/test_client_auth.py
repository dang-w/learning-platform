import pytest
import pytest_asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import json

from main import app
from database import db
from auth import get_current_user, get_current_active_user, create_access_token

# Import test utilities
from tests.conftest import MockUser

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()

@pytest.mark.integration
@pytest.mark.asyncio
async def test_login_success(async_client):
    """Test successful login."""
    # Mock the database
    mock_db = MagicMock()
    mock_db.users = MagicMock()
    mock_db.users.find_one = AsyncMock(return_value={
        "username": "testuser",
        "email": "testuser@example.com",
        "full_name": "Test User",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
        "disabled": False
    })

    with patch("auth._db", mock_db), \
         patch("auth.verify_password", return_value=True):  # Also mock verify_password to return True
        login_data = {
            "username": "testuser",
            "password": "password123"
        }

        # Use the correct path /auth/token instead of /token
        response = await async_client.post("/auth/token", data=login_data)
        assert response.status_code == 200
        token_data = response.json()
        assert "access_token" in token_data
        assert token_data["token_type"] == "bearer"

@pytest.mark.integration
@pytest.mark.asyncio
async def test_login_invalid_credentials(async_client):
    """Test login with invalid credentials."""
    # Mock the database
    mock_db = MagicMock()
    mock_db.users = MagicMock()
    mock_db.users.find_one = AsyncMock(return_value={
        "username": "testuser",
        "email": "testuser@example.com",
        "full_name": "Test User",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
        "disabled": False
    })

    with patch("auth._db", mock_db), \
         patch("auth.verify_password", return_value=False):  # Mock verify_password to return False for invalid credentials
        login_data = {
            "username": "testuser",
            "password": "wrongpassword"
        }

        # Use the correct path /auth/token instead of /token
        response = await async_client.post("/auth/token", data=login_data)
        assert response.status_code == 401
        error_data = response.json()
        assert "detail" in error_data
        assert "Incorrect username or password" in error_data["detail"]

@pytest.mark.integration
@pytest.mark.asyncio
async def test_protected_endpoint_with_token(async_client, auth_headers):
    """Test accessing a protected endpoint with a valid token."""
    # Setup mock user
    mock_user = MockUser(username="testuser")
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    response = await async_client.get("/users/me/", headers=auth_headers)
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == "testuser"

@pytest.mark.integration
@pytest.mark.asyncio
async def test_protected_endpoint_without_token(async_client):
    """Test accessing a protected endpoint without a token."""
    # Clear any existing dependency overrides
    app.dependency_overrides.clear()

    # Create a new client without authentication headers
    from httpx import AsyncClient
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/users/me/")
        assert response.status_code == 401
        error_data = response.json()
        assert "detail" in error_data
        assert "Not authenticated" in error_data["detail"]