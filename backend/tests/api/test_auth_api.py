import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import HTTPException, status
import jwt
from jwt.exceptions import PyJWTError
from datetime import datetime, timedelta
from bson import ObjectId
from main import app
from routers.auth import login_for_access_token
from auth import get_current_user, get_current_active_user
from tests.conftest import MockUser

# Test data
test_user_data = {
    "username": "testuser",
    "email": "test@example.com",
    "full_name": "Test User",
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
    assert "full_name" in user_data

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
async def test_register_success(
    mock_set_cookie, mock_create_refresh, mock_create_access, mock_create_user, client
):
    """Test successful user registration."""
    mock_create_user.return_value = {"username": "newuser"}
    register_payload = {
        "username": "newuser",
        "email": "new@example.com",
        "password": "password123",
        "confirm_password": "password123",
        "full_name": "New User"
    }
    response = client.post("/api/auth/register", json=register_payload)
    assert response.status_code == 200
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
async def test_register_password_mismatch(client):
    """Test registration with mismatching passwords."""
    register_payload = {
        "username": "newuser",
        "email": "new@example.com",
        "password": "password123",
        "confirm_password": "password456", # Mismatch
        "full_name": "New User"
    }
    response = client.post("/api/auth/register", json=register_payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Password and confirmation password do not match" in response.json()["detail"]

@pytest.mark.asyncio
@patch("routers.auth.create_user", new_callable=AsyncMock)
async def test_register_user_exists(mock_create_user, client):
    """Test registration when user already exists."""
    mock_create_user.side_effect = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Username already registered"
    )
    register_payload = {
        "username": "existinguser",
        "email": "existing@example.com",
        "password": "password123",
        "confirm_password": "password123",
        "full_name": "Existing User"
    }
    response = client.post("/api/auth/register", json=register_payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Username already registered" in response.json()["detail"]
    mock_create_user.assert_awaited_once()

@pytest.mark.asyncio
@patch("routers.auth.authenticate_user", new_callable=AsyncMock)
@patch("routers.auth.create_access_token", return_value="fake_access_token")
@patch("routers.auth.create_refresh_token", return_value="fake_refresh_token")
@patch("routers.auth.set_refresh_token_cookie")
async def test_token_success(mock_set_cookie, mock_create_refresh, mock_create_access, mock_auth_user, client):
    """Test successful login via /token endpoint."""
    mock_auth_user.return_value = {"username": "testuser"}
    login_payload = {"username": "testuser", "password": "password123"}
    response = client.post("/api/auth/token", json=login_payload)
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

@patch("routers.auth.authenticate_user", new_callable=AsyncMock)
def test_login_with_invalid_username(mock_auth_async, client):
    """Test login with invalid username."""
    mock_auth_async.return_value = None
    response = client.post(
        "/api/auth/token",
        json={"username": "nonexistent", "password": "password123"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"
    mock_auth_async.assert_awaited_once_with("nonexistent", "password123")

@patch("routers.auth.authenticate_user", new_callable=AsyncMock)
def test_login_with_invalid_password(mock_auth_async, client):
    """Test login with invalid password."""
    mock_auth_async.return_value = None
    response = client.post(
        "/api/auth/token",
        json={"username": "testuser", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"
    mock_auth_async.assert_awaited_once_with("testuser", "wrongpassword")

def test_login_incorrect_credentials(client):
    # ... existing code ...
    pass

def test_token_refresh(client, monkeypatch):
    """Test refreshing an access token."""
    # Mock verify_refresh_token to simulate successful validation
    with patch("routers.auth.verify_refresh_token", return_value={"sub": "testuser", "type": "refresh"}):
        # Simulate the refresh_token cookie being present
        response = client.post(
            "/api/auth/token/refresh",
            cookies={"refresh_token": "valid_refresh_token"}
        )

        assert response.status_code == 200
        token_data = response.json()
        assert "access_token" in token_data
        assert "refresh_token" not in token_data
        assert token_data["token_type"] == "bearer"
        assert "refresh_token" in response.cookies
        assert response.cookies["refresh_token"] is not None
        assert "HttpOnly" in response.headers["set-cookie"]

def test_token_refresh_invalid_token(client):
    """Test token refresh with invalid token/cookie."""
    response = client.post(
        "/api/auth/token/refresh",
        cookies={"refresh_token": "invalid_token"}
    )

    assert response.status_code == 401
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Invalid or expired refresh token"

    response_no_cookie = client.post("/api/auth/token/refresh")
    assert response_no_cookie.status_code == 401
    assert response_no_cookie.json()["detail"] == "Refresh token cookie not found"

def test_auth_me_endpoint_with_valid_token(client, auth_headers):
    """Test accessing the /api/auth/me endpoint with a valid token."""
    # Create a mock user with all required fields
    mock_user = {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
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

    # Make request to the /api/auth/me endpoint
    response = client.get("/api/auth/me", headers=auth_headers)

    # Assert response is successful and contains user data
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == "testuser"
    assert user_data["email"] == "test@example.com"
    assert user_data["full_name"] == "Test User"
    assert "resources" in user_data
    assert "articles" in user_data["resources"]
    assert "videos" in user_data["resources"]
    assert "courses" in user_data["resources"]
    assert "books" in user_data["resources"]

def test_auth_me_endpoint_without_token(client):
    """Test accessing the /api/auth/me endpoint without a token."""
    # Override the dependency to raise an authentication error
    def override_get_current_active_user():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    app.dependency_overrides[get_current_active_user] = override_get_current_active_user

    # Make request without providing an auth token
    response = client.get("/api/auth/me")

    # Assert that we get an unauthorized error
    assert response.status_code == 401
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Not authenticated"

def test_auth_statistics_endpoint(client, auth_headers):
    """Test accessing the /api/auth/statistics endpoint."""
    # Create a mock user
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
        response = client.get("/api/auth/statistics", headers=auth_headers)
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

def test_auth_notification_preferences(client, auth_headers):
    """Test accessing the /api/auth/notification-preferences endpoint."""
    # Create a mock user with notification preferences
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

    response = client.get("/api/auth/notification-preferences", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Verify the response contains all expected preferences
    assert data["email_notifications"] is True
    assert data["learning_reminders"] is False
    assert data["review_reminders"] is True
    assert data["achievement_notifications"] is True
    assert data["newsletter"] is False

def test_update_notification_preferences(client, auth_headers):
    """Test updating the notification preferences."""
    # Create a mock user with notification preferences
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

    response = client.put("/api/auth/notification-preferences", headers=auth_headers, json=update_data)
    assert response.status_code == 200
    data = response.json()

    # Verify the response contains the updated preferences
    assert data["email_notifications"] is False
    assert data["learning_reminders"] is True
    assert data["review_reminders"] is False
    assert data["achievement_notifications"] is False
    assert data["newsletter"] is True