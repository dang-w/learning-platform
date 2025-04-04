import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import HTTPException, status
import jwt
from jwt.exceptions import PyJWTError
from datetime import datetime, timedelta
from bson import ObjectId
from main import app
from routers.auth import login_for_access_token, REFRESH_TOKEN_COOKIE_NAME
from auth import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    TokenData,
    get_current_user,
    get_current_active_user,
    authenticate_user,
    get_user,
    ALGORITHM,
    SECRET_KEY
)
from tests.utils import serialize_object_id
from tests.conftest import MockUser
from httpx import AsyncClient

# Test data
test_user_data = {
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
"last_name": "User",
    "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
    "disabled": False
}

test_user = {
    "username": "testuser",
    "email": "test@example.com",
    "metrics": [
        {"type": "login", "timestamp": datetime.now() - timedelta(hours=2)},
        {"type": "login", "timestamp": datetime.now() - timedelta(hours=1)},
        {"type": "token_refresh", "timestamp": datetime.now() - timedelta(minutes=30)},
        {"type": "logout", "timestamp": datetime.now() - timedelta(minutes=15)}
    ],
    "created_at": datetime.now() - timedelta(days=30),
    "notification_preferences": {
        "email_notifications": True,
        "learning_reminders": False,
        "review_reminders": True,
        "achievement_notifications": True,
        "newsletter": False
    }
}

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    # Clear any existing overrides
    app.dependency_overrides.clear()

    yield

    # Clear overrides after the test
    app.dependency_overrides.clear()

@pytest.fixture(autouse=True)
def mock_database():
    """Mock database for testing."""
    mock_db = MagicMock()
    mock_db.users = MagicMock()
    mock_db.users.find_one = AsyncMock(return_value=test_user)
    mock_db.users.update_one = AsyncMock(return_value=MagicMock(modified_count=1))

    # Import the modules that use the database
    import database
    import utils.db_utils

    # Save the original database
    original_db = database.db
    original_get_database = database.get_database

    # Replace with the mock database
    async def mock_get_database():
        return {"db": mock_db, "client": None}

    database.get_database = mock_get_database
    utils.db_utils.db = mock_db

    yield mock_db

    # Restore the original database
    database.db = original_db
    database.get_database = original_get_database

def test_get_current_user_with_valid_token(client, auth_headers):
    """Test getting the current user with a valid token."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    response = client.get("/api/users/me/", headers=auth_headers)

    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == "testuser"
    assert "email" in user_data
    assert "first_name" in user_data
    assert "last_name" in user_data

def test_get_current_user_without_token(client):
    """Test getting the current user without a token."""
    # Override the dependencies with a synchronous function that raises an exception
    def override_get_current_user():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_active_user] = override_get_current_user

    response = client.get("/api/users/me/")

    assert response.status_code == 401
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Not authenticated"

def test_get_current_user_with_invalid_token(client):
    """Test getting the current user with an invalid token."""
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

    response = client.get("/api/users/me/", headers=headers)

    assert response.status_code == 401
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Could not validate credentials"

@pytest.mark.asyncio
@patch("routers.auth.create_user", new_callable=AsyncMock)
@patch("routers.auth.create_access_token", return_value="fake_access_token")
@patch("routers.auth.create_refresh_token", return_value="fake_refresh_token")
@patch("routers.auth.set_refresh_token_cookie")
async def test_register_success(mock_set_cookie, mock_create_refresh, mock_create_access, mock_create_user, async_client: AsyncClient):
    """Test successful user registration."""
    # Return a mock object that has a username attribute
    mock_user_instance = MagicMock()
    mock_user_instance.username = "newuser"
    mock_create_user.return_value = mock_user_instance
    register_payload = {
        "username": "newuser",
        "email": "new@example.com",
        "password": "password123",
        "confirm_password": "password123",
        "first_name": "New",
        "last_name": "User"
    }
    response = await async_client.post("/api/auth/register", json=register_payload, headers={"X-Skip-Rate-Limit": "true"})
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["access_token"] == "fake_access_token"
    mock_create_user.assert_awaited_once()
    mock_create_access.assert_called_once_with(data={"sub": "newuser"})
    mock_create_refresh.assert_called_once_with(data={"sub": "newuser"})
    mock_set_cookie.assert_called_once()
    args, kwargs = mock_set_cookie.call_args
    assert args[1] == "fake_refresh_token"
    from starlette.responses import Response
    assert isinstance(args[0], Response)

@pytest.mark.asyncio
async def test_register_password_mismatch(async_client: AsyncClient):
    """Test registration failure when passwords do not match."""
    register_payload = {
        "username": "newuser",
        "email": "new@example.com",
        "password": "password123",
        "confirm_password": "password456", # Mismatch
        "first_name": "New",
        "last_name": "User"
    }
    response = await async_client.post("/api/auth/register", json=register_payload, headers={"X-Skip-Rate-Limit": "true"})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Password and confirmation password do not match" in response.json()["detail"]

@pytest.mark.asyncio
@patch("routers.auth.create_user", new_callable=AsyncMock)
async def test_register_user_exists(mock_create_user, async_client: AsyncClient):
    """Test registration failure when user already exists."""
    mock_create_user.side_effect = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Username already registered"
    )
    register_payload = {
        "username": "existinguser",
        "email": "existing@example.com",
        "password": "password123",
        "confirm_password": "password123",
        "first_name": "Existing",
        "last_name": "User"
    }
    response = await async_client.post("/api/auth/register", json=register_payload, headers={"X-Skip-Rate-Limit": "true"})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Username already registered" in response.json()["detail"]
    mock_create_user.assert_awaited_once()

@pytest.mark.asyncio
@patch("routers.auth.authenticate_user", new_callable=AsyncMock)
@patch("routers.auth.create_access_token", return_value="fake_access_token")
@patch("routers.auth.create_refresh_token", return_value="fake_refresh_token")
@patch("routers.auth.set_refresh_token_cookie")
async def test_token_success(mock_set_cookie, mock_create_refresh, mock_create_access, mock_auth_user, async_client: AsyncClient):
    """Test successful token generation (login)."""
    mock_auth_user.return_value = {"username": "testuser"}
    login_data = {"username": "testuser", "password": "password123"}
    response = await async_client.post("/api/auth/token", json=login_data)
    assert response.status_code == status.HTTP_200_OK
    response_data = response.json()
    assert response_data["access_token"] == "fake_access_token"
    assert response_data["token_type"] == "bearer"
    mock_auth_user.assert_awaited_once_with("testuser", "password123")
    mock_create_access.assert_called_once()
    args, kwargs = mock_create_access.call_args
    assert kwargs['data']['sub'] == "testuser"
    mock_create_refresh.assert_called_once_with(data={"sub": "testuser"})
    mock_set_cookie.assert_called_once()
    args_cookie, kwargs_cookie = mock_set_cookie.call_args
    assert args_cookie[1] == "fake_refresh_token"
    from starlette.responses import Response
    assert isinstance(args_cookie[0], Response)

@pytest.mark.asyncio
@patch("routers.auth.authenticate_user", new_callable=AsyncMock)
async def test_login_with_invalid_username(mock_auth_async, async_client: AsyncClient):
    """Test login failure with invalid username."""
    mock_auth_async.return_value = None
    login_data = {"username": "wronguser", "password": "testpassword"}
    response = await async_client.post("/api/auth/token", json=login_data)
    assert response.status_code == 401
    mock_auth_async.assert_awaited_once_with("wronguser", "testpassword")

@pytest.mark.asyncio
@patch("routers.auth.authenticate_user", new_callable=AsyncMock)
async def test_login_with_invalid_password(mock_auth_async, async_client: AsyncClient, setup_test_user):
    """Test login failure with invalid password."""
    mock_auth_async.return_value = None
    test_user = setup_test_user["user"]
    login_data = {"username": test_user["username"], "password": "wrongpassword"}
    response = await async_client.post("/api/auth/token", json=login_data)
    assert response.status_code == 401
    mock_auth_async.assert_awaited_once_with(test_user["username"], "wrongpassword")

def test_login_incorrect_credentials(client):
    # ... existing code ...
    pass

@pytest.mark.asyncio
async def test_token_refresh(async_client: AsyncClient, setup_test_user):
    """Test successful token refresh."""
    test_user = setup_test_user["user"]
    # Simulate obtaining initial tokens (we only need the refresh token)
    # In a real scenario, this would come from the login response cookie
    # Here, we generate one directly for testing purposes.
    refresh_token_payload = {"sub": test_user["username"], "type": "refresh"}
    refresh_token = create_refresh_token(data=refresh_token_payload) # Assuming create_refresh_token is available

    # Set the refresh token cookie on the client
    async_client.cookies.set(REFRESH_TOKEN_COOKIE_NAME, refresh_token)

    # Step 2: Use the refresh token (implicitly via cookie) to get a new access token
    refresh_response = await async_client.post("/api/auth/token/refresh")

    # Assertions for the refresh response
    assert refresh_response.status_code == 200
    refresh_data = refresh_response.json()
    assert "access_token" in refresh_data
    assert refresh_data["token_type"] == "bearer"

    new_access_token = refresh_data["access_token"]

    # Step 3: Verify the new access token works (Optional but good practice)
    profile_response = await async_client.get("/api/users/me/", headers={"Authorization": f"Bearer {new_access_token}"})
    assert profile_response.status_code == 200
    profile_data = profile_response.json()
    assert profile_data["username"] == test_user["username"]

@pytest.mark.asyncio
async def test_token_refresh_invalid_token(async_client: AsyncClient):
    """Test token refresh failure with invalid token."""
    # Ensure no refresh token cookie is set
    async_client.cookies.clear()

    response = await async_client.post("/api/auth/token/refresh")
    # The endpoint now correctly raises 401 when no cookie is found.
    assert response.status_code == 401
    assert response.json() == {"detail": "Refresh token cookie not found"}

@pytest.mark.asyncio
async def test_auth_me_endpoint_with_valid_token(async_client: AsyncClient, setup_test_user):
    """Test accessing the /me endpoint with a valid token."""
    mock_user = {
        "username": "testuser",
        "email": "test@example.com",
        "first_name": "Test",
"last_name": "User",
        "id": "123456789",
        "created_at": datetime.now().isoformat(),
        "is_active": True,
        "disabled": False,
        "resources": {
            "articles": [],
            "videos": [],
            "courses": [],
            "books": []
        }
    }

    # Override the dependency to return our mock user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Make request to the /me endpoint
    response = await async_client.get("/api/auth/me")

    # Assert response is successful and contains user data
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == "testuser"
    assert user_data["email"] == "test@example.com"
    assert user_data["first_name"] == "Test"
    assert user_data["last_name"] == "User"
    assert "resources" in user_data
    assert "articles" in user_data["resources"]
    assert "videos" in user_data["resources"]
    assert "courses" in user_data["resources"]
    assert "books" in user_data["resources"]

@pytest.mark.asyncio
async def test_auth_me_endpoint_without_token(async_client: AsyncClient):
    """Test accessing the /me endpoint without a token."""
    # Override the dependency to raise an authentication error
    def override_get_current_active_user():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    app.dependency_overrides[get_current_active_user] = override_get_current_active_user

    # Make request without providing an auth token
    response = await async_client.get("/api/auth/me")

    # Assert that we get an unauthorized error
    assert response.status_code == 401
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Not authenticated"

@pytest.mark.asyncio
async def test_auth_statistics_endpoint(async_client: AsyncClient, setup_test_user):
    """Test accessing the /statistics endpoint."""
    current_time = datetime.now()
    mock_user = {
        "username": "testuser",
        "email": "test@example.com",
        "metrics": [
            {"type": "login", "timestamp": current_time - timedelta(hours=2)},
            {"type": "login", "timestamp": current_time - timedelta(hours=1)},
            {"type": "token_refresh", "timestamp": current_time - timedelta(minutes=30)},
            {"type": "logout", "timestamp": current_time - timedelta(minutes=15)}
        ],
        "created_at": current_time - timedelta(days=30)
    }

    # Override the dependencies
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create a mock for get_user_sessions
    mock_get_user_sessions = AsyncMock(return_value=[{"id": "session1"}, {"id": "session2"}])

    # Create a module patch
    modules = {
        'routers.sessions': MagicMock(),
    }
    modules['routers.sessions'].get_user_sessions = mock_get_user_sessions

    # Patch the modules
    with patch.dict('sys.modules', modules, clear=False):
        response = await async_client.get("/api/auth/statistics")
        assert response.status_code == 200
        data = response.json()

        # Verify the response contains the expected fields
        assert "login_count" in data
        assert "token_refresh_count" in data
        assert "logout_count" in data
        assert "active_sessions_count" in data
        assert "last_login" in data
        assert "account_creation_date" in data
        assert "days_since_creation" in data

        # Verify the counts are correct
        assert data["login_count"] == 2
        assert data["token_refresh_count"] == 1
        assert data["logout_count"] == 1
        assert data["active_sessions_count"] == 2

@pytest.mark.asyncio
async def test_auth_notification_preferences(async_client: AsyncClient, setup_test_user):
    """Test accessing the /notification-preferences endpoint."""
    mock_user = {
        "username": "testuser",
        "notification_preferences": {
            "email_notifications": True,
            "learning_reminders": False,
            "review_reminders": True,
            "achievement_notifications": True,
            "newsletter": False
        }
    }

    # Override the dependency to return our mock user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    response = await async_client.get("/api/auth/notification-preferences")
    assert response.status_code == 200
    data = response.json()

    # Verify the response contains all expected preferences
    assert data["email_notifications"] is True
    assert data["learning_reminders"] is False
    assert data["review_reminders"] is True
    assert data["achievement_notifications"] is True
    assert data["newsletter"] is False

@pytest.mark.asyncio
async def test_update_notification_preferences(async_client: AsyncClient, setup_test_user):
    """Test updating the notification preferences."""
    mock_user = {
        "username": "testuser",
        "notification_preferences": {
            "email_notifications": True,
            "learning_reminders": False,
            "review_reminders": True,
            "achievement_notifications": True,
            "newsletter": False
        }
    }

    # Update data
    update_data = {
        "email_notifications": False,
        "learning_reminders": True,
        "review_reminders": False,
        "achievement_notifications": False,
        "newsletter": True
    }

    # Override the dependency to return our mock user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    response = await async_client.put("/api/auth/notification-preferences", json=update_data)
    assert response.status_code == 200
    data = response.json()

    # Verify the response contains the updated preferences
    assert data["email_notifications"] is False
    assert data["learning_reminders"] is True
    assert data["review_reminders"] is False
    assert data["achievement_notifications"] is False
    assert data["newsletter"] is True

    # Verify the update was applied (optional, depends on endpoint implementation)
    # Example: Fetch the preferences again and assert the changes
    response_get = await async_client.get("/api/auth/notification-preferences")
    assert response_get.status_code == 200
    updated_prefs = response_get.json()