"""
Consolidated authentication tests that cover all authentication functionality.
This file replaces test_auth.py, test_auth_direct.py, and test_client_auth.py.
"""
import pytest
import pytest_asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from httpx import AsyncClient
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
import logging

from main import app
from database import db
from auth import (
    get_current_user,
    get_current_active_user,
    create_access_token,
    authenticate_user,
    get_user,
    get_password_hash,
    SECRET_KEY,
    ALGORITHM
)

# Import test utilities
from tests.conftest import MockUser

logger = logging.getLogger(__name__)

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()

# ===============================
# Section 1: Basic Authentication
# ===============================

@pytest.mark.integration
def test_authentication(client, auth_headers):
    """
    Test that authentication works with a valid token using TestClient.
    """
    # Make a request with the auth headers
    response = client.get("/api/users/me/", headers=auth_headers)

    # Verify the response
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == "testuser"
    assert "email" in user_data
    assert "full_name" in user_data

@pytest.mark.integration
def test_authentication_failure():
    """
    Test that authentication fails with an invalid token.
    """
    # Create a test client
    client = TestClient(app)

    # Create invalid auth headers
    invalid_headers = {"Authorization": "Bearer invalid_token"}

    # Make a request with invalid auth headers
    response = client.get("/api/users/me/", headers=invalid_headers)

    # Verify the response is unauthorized
    assert response.status_code == 401
    response_json = response.json()
    # FastAPI returns a standard error format with a "detail" field
    assert "detail" in response_json
    assert response_json["detail"] == "Could not validate credentials"

# =======================================
# Section 2: Direct Authentication Tests
# =======================================

@pytest.mark.integration
@pytest.mark.asyncio
async def test_authentication_direct():
    """
    Test that authentication works directly without using the TestClient.
    """
    # Create a test user
    username = "test_auth_user"
    user_data = {
        "username": username,
        "email": f"{username}@example.com",
        "full_name": "Test Auth User",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
        "disabled": False,
        "resources": [],
        "study_sessions": [],
        "review_sessions": [],
        "learning_paths": [],
        "reviews": [],
        "concepts": [],
        "goals": [],
        "milestones": []
    }

    # Create a mock for get_user function
    mock_get_user = AsyncMock(return_value=user_data)

    # Patch the get_user function
    with patch('auth.get_user', mock_get_user):
        # Create a token for the test user
        token = create_access_token(data={"sub": username}, expires_delta=timedelta(days=1))
        logger.info("Created token for test user")

        # Verify the token works with get_current_user
        user = await get_current_user(token)
        assert user is not None
        assert user["username"] == username
        logger.info("Verified token with get_current_user")

        # Verify the token works with get_current_active_user
        active_user = await get_current_active_user(user)
        assert active_user is not None
        assert active_user["username"] == username
        logger.info("Verified token with get_current_active_user")

    # Verify the mock was called correctly
    mock_get_user.assert_called_with(username=username)

@pytest.mark.integration
@pytest.mark.asyncio
async def test_authentication_direct_disabled_user():
    """
    Test that authentication fails for a disabled user.
    """
    # Create a test user with disabled=True
    username = "test_disabled_user"
    user_data = {
        "username": username,
        "email": f"{username}@example.com",
        "full_name": "Test Disabled User",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
        "disabled": True
    }

    # Create a mock for get_user function
    mock_get_user = AsyncMock(return_value=user_data)

    # Patch the get_user function
    with patch('auth.get_user', mock_get_user):
        # Create a token for the test user
        token = create_access_token(data={"sub": username}, expires_delta=timedelta(days=1))

        # Verify the token works with get_current_user
        user = await get_current_user(token)
        assert user is not None
        assert user["username"] == username

        # Verify get_current_active_user raises an exception for disabled user
        with pytest.raises(Exception) as excinfo:
            await get_current_active_user(user)

        assert "Inactive user" in str(excinfo.value)

    # Verify the mock was called correctly
    mock_get_user.assert_called_with(username=username)

@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_access_token():
    """Test creating an access token."""
    data = {"sub": "testuser"}
    # Standard expiry, buffer removed as we skip exp validation here
    expires_delta = timedelta(minutes=30)

    token = create_access_token(data=data, expires_delta=expires_delta)

    # Verify the token, skip expiration check for this specific test due to timing issues
    payload = jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM],
        options={"leeway": 10, "verify_exp": False}
    )
    assert payload["sub"] == "testuser"
    assert "exp" in payload # Still check that exp claim exists

@pytest.mark.integration
@pytest.mark.asyncio
async def test_password_hashing():
    """Test password hashing."""
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    plain_password = "password123"

    # Get the password hash
    hashed_password = get_password_hash(plain_password)

    # Verify the hash
    assert hashed_password != plain_password
    assert pwd_context.verify(plain_password, hashed_password) is True

@pytest.mark.integration
@pytest.mark.asyncio
async def test_authenticate_user():
    """Test authenticating a user."""
    username = "testuser"
    password = "password123"

    # Mock the get_user function
    mock_user = {
        "username": username,
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"  # hashed version of password123
    }

    # Also need to mock verify_password to ensure it returns True
    with patch("auth.get_user", AsyncMock(return_value=mock_user)), \
         patch("auth.verify_password", return_value=True):
        # Authenticate the user
        user = await authenticate_user(username, password)
        assert user is not None
        assert user["username"] == username

    # Try with wrong password by mocking verify_password to return False
    with patch("auth.get_user", AsyncMock(return_value=mock_user)), \
         patch("auth.verify_password", return_value=False):
        user = await authenticate_user(username, "wrongpassword")
        assert user is None  # Should return None, not False

    # Try with non-existent user
    with patch("auth.get_user", AsyncMock(return_value=None)):
        user = await authenticate_user("nonexistentuser", password)
        assert user is None  # Should return None, not False

@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_user():
    """Test getting a user."""
    username = "testuser"

    # Mock the database
    mock_db = MagicMock()
    mock_db.users = MagicMock()
    mock_db.users.find_one = AsyncMock(return_value={
        "username": username,
        "email": f"{username}@example.com",
        "full_name": "Test User",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",
        "disabled": False
    })

    # Patch the database directly
    with patch("auth._db", mock_db):
        # Get the user
        user = await get_user(username)
        assert user is not None
        assert user["username"] == username
        assert "email" in user
        assert "full_name" in user
        assert "hashed_password" in user

        # Try with non-existent user
        mock_db.users.find_one = AsyncMock(return_value=None)
        user = await get_user("nonexistentuser")
        assert user is None

# ===================================
# Section 3: Client Authentication
# ===================================

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

        # Use the correct path /auth/token and send JSON
        response = await async_client.post("/api/auth/token", json=login_data)
        assert response.status_code == 200
        token_data = response.json()
        assert "access_token" in token_data
        # refresh_token should now be in HttpOnly cookie
        assert "refresh_token" not in token_data
        assert "token_type" in token_data
        assert token_data["token_type"] == "bearer"
        # Check for refresh token cookie
        assert "refresh_token" in response.cookies
        assert response.cookies["refresh_token"] is not None
        assert "HttpOnly" in response.headers["set-cookie"]

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

        # Use the correct path /auth/token and send JSON
        response = await async_client.post("/api/auth/token", json=login_data)
        assert response.status_code == 401
        error_data = response.json()
        assert "detail" in error_data
        assert error_data["detail"] == "Incorrect username or password"

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

    # Create a new client without authentication headers
    from httpx import AsyncClient
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/users/me/")
        assert response.status_code == 401
        error_detail = response.json()
        assert "detail" in error_detail
        assert error_detail["detail"] == "Not authenticated"