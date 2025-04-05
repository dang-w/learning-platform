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
    # Configure mock_db
    mock_db_instance = MagicMock()
    mock_db_instance.users = MagicMock()
    mock_db_instance.users.find_one = AsyncMock(return_value={
        "username": "testuser",
        "email": "testuser@example.com",
        "first_name": "Test",
        "last_name": "User",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
        "disabled": False
    })

    # Patch get_db to return our mock instance
    async def override_get_db():
        return mock_db_instance

    # Remove patch("auth._db") and patch database.get_db
    with patch("auth.verify_password", return_value=True), \
         patch("database.get_db", override_get_db):
        login_data = {
            "username": "testuser",
            "password": "password123"
        }

        # Use the correct path /api/auth/token and send JSON
        # Add header to bypass rate limiter
        headers = {"X-Skip-Rate-Limit": "true"}
        response = await async_client.post("/api/auth/token", json=login_data, headers=headers)
        assert response.status_code == 200
        token_data = response.json()
        assert "access_token" in token_data
        assert "refresh_token" in token_data # Refresh token is now expected in the body
        assert "token_type" in token_data
        assert "refresh_token" in response.cookies
        assert response.cookies["refresh_token"] is not None
        assert "HttpOnly" in response.headers["set-cookie"]

@pytest.mark.integration
@pytest.mark.asyncio
async def test_login_invalid_credentials(async_client):
    """Test login with invalid credentials."""
    # Remove direct db/verify_password mocks, rely on authenticate_user mock
    # mock_db = MagicMock()
    # mock_db.users = MagicMock()
    # mock_db.users.find_one = AsyncMock(return_value={
    #     "username": "testuser",
    #     "email": "testuser@example.com",
    #     "first_name": "Test",
    # "last_name": "User",
    #     "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
    #     "disabled": False
    # })

    # Patch authenticate_user used by the /token endpoint
    with patch("routers.auth.authenticate_user", new_callable=AsyncMock) as mock_auth_user:
        mock_auth_user.return_value = None # Simulate authentication failure

        login_data = {
            "username": "testuser",
            "password": "wrongpassword"
        }

        # Use the correct path /api/auth/token and send JSON
        # Add header to bypass rate limiter
        headers = {"X-Skip-Rate-Limit": "true"}
        response = await async_client.post("/api/auth/token", json=login_data, headers=headers)
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

    response = await async_client.get("/api/users/me/", headers=auth_headers)
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == "testuser"

@pytest.mark.integration
@pytest.mark.asyncio
async def test_protected_endpoint_without_token(async_client):
    """Test accessing a protected endpoint without a token."""
    # Clear any existing dependency overrides
    app.dependency_overrides.clear()

    # Use the unauthenticated client fixture directly
    response = await async_client.get("/api/users/me/")
    assert response.status_code == 401
    error_data = response.json()
    assert "detail" in error_data
    assert "Not authenticated" in error_data["detail"]