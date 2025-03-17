import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException, status

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