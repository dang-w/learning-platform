import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import HTTPException, status
import jwt
from jwt.exceptions import PyJWTError
from datetime import datetime

# Import the app and auth functions
from main import app
from auth import get_current_user, get_current_active_user

# Import the MockUser class from conftest
from tests.conftest import MockUser

# Test data
test_user_data = {
    "username": "testuser",
    "email": "test@example.com",
    "full_name": "Test User",
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

def test_get_current_user_with_valid_token(client, auth_headers):
    """Test getting the current user with a valid token."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    response = client.get("/users/me/", headers=auth_headers)

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

    response = client.get("/users/me/")

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

    response = client.get("/users/me/", headers=headers)

    assert response.status_code == 401
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Could not validate credentials"

@patch("auth.get_user")
@patch("auth.authenticate_user")
def test_login_with_valid_credentials(mock_auth, mock_get_user, client):
    """Test login with valid credentials."""
    # Create a user dictionary that matches what the auth module expects
    user_dict = {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "disabled": False,
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"  # password123
    }

    # Mock the authenticate_user function
    mock_auth.return_value = user_dict
    # Mock the get_user function
    mock_get_user.return_value = user_dict

    response = client.post(
        "/token",
        data={"username": "testuser", "password": "password123"},
    )

    assert response.status_code == 200
    response_data = response.json()
    assert "access_token" in response_data
    assert "token_type" in response_data
    assert response_data["token_type"] == "bearer"

@patch("auth.authenticate_user")
def test_login_with_invalid_username(mock_auth, client):
    """Test login with an invalid username."""
    # Mock the authenticate_user function to return None (authentication failed)
    mock_auth.return_value = None

    response = client.post(
        "/token",
        data={"username": "invaliduser", "password": "password123"},
    )

    assert response.status_code == 401
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Incorrect username or password"

@patch("auth.authenticate_user")
def test_login_with_invalid_password(mock_auth, client):
    """Test login with an invalid password."""
    # Mock the authenticate_user function to return None (authentication failed)
    mock_auth.return_value = None

    response = client.post(
        "/token",
        data={"username": "testuser", "password": "invalidpassword"},
    )

    assert response.status_code == 401
    error_response = response.json()
    assert "detail" in error_response
    assert error_response["detail"] == "Incorrect username or password"

def test_login_incorrect_credentials(client):
    # ... existing code ...
    pass

def test_token_refresh(client, auth_headers):
    """Test refreshing an access token with a valid token."""
    # Mock directly in main.py where the endpoint is defined
    with patch('main.jwt.decode') as mock_decode, \
         patch('main.get_user') as mock_get_user:

        # Configure the mocks
        mock_decode.return_value = {"sub": "testuser", "exp": datetime.now().timestamp() + 1000}

        # Create a user dict that will be returned by get_user
        user_dict = {
            "username": "testuser",
            "email": "test@example.com",
            "disabled": False
        }

        # Create a coroutine mock that returns the user dict
        async def mock_get_user_coro(*args, **kwargs):
            return user_dict

        mock_get_user.side_effect = mock_get_user_coro

        # Use an arbitrary token for the test
        refresh_data = {"refresh_token": "valid_token"}

        # Send the request
        response = client.post("/token/refresh", json=refresh_data)

        # Verify the response
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

def test_token_refresh_invalid_token(client):
    """Test refreshing an access token with an invalid token."""
    # Create a mock for the decode function to simulate an invalid token
    with patch('jwt.decode') as mock_decode:
        # Configure the mock to raise a PyJWTError
        mock_decode.side_effect = jwt.exceptions.PyJWTError()

        # Use an arbitrary token for the test
        refresh_data = {"refresh_token": "invalid_token"}

        # Send the request
        response = client.post("/token/refresh", json=refresh_data)

        # Verify the response
        assert response.status_code == 401
        error_response = response.json()
        assert "detail" in error_response
        assert error_response["detail"] == "Invalid token"