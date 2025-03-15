import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from jose import jwt
from pydantic import BaseModel
from typing import Optional

# Import the app and auth functions
from main import app, User, UserInDB, oauth2_scheme, get_current_user, get_current_active_user
from auth import SECRET_KEY, ALGORITHM

# Create a test client
client = TestClient(app)

# Create a test token
def create_test_token(username="testuser", expires_minutes=15):
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode = {"sub": username, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Test data
test_user = User(
    username="testuser",
    email="test@example.com",
    full_name="Test User",
    disabled=False
)

test_user_db = UserInDB(
    username="testuser",
    email="test@example.com",
    full_name="Test User",
    disabled=False,
    hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"  # password123
)

@pytest.fixture
def auth_headers():
    token = create_test_token()
    return {"Authorization": f"Bearer {token}"}

@patch("main.get_user")
@patch("main.authenticate_user")
def test_login_with_valid_credentials(mock_auth, mock_get_user, monkeypatch):
    """Test login with valid credentials."""
    # Mock the authenticate_user function
    mock_auth.return_value = test_user_db
    # Mock the get_user function
    mock_get_user.return_value = test_user_db

    response = client.post(
        "/token",
        data={"username": "testuser", "password": "password123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "token_type" in response.json()

@patch("main.authenticate_user")
def test_login_with_invalid_credentials(mock_auth):
    """Test login with invalid credentials."""
    # Mock the authenticate_user function to return None (authentication failed)
    mock_auth.return_value = None

    response = client.post(
        "/token",
        data={"username": "invaliduser", "password": "invalidpassword"},
    )
    assert response.status_code == 401
    assert "detail" in response.json()

def test_get_current_user(auth_headers):
    """Test getting the current user."""
    # Define async mock functions
    async def mock_get_current_user():
        return test_user

    async def mock_get_current_active_user():
        return test_user

    # Override the dependencies
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user

    try:
        response = client.get(
            "/users/me/",
            headers=auth_headers,
        )

        assert response.status_code == 200
        user_data = response.json()
        assert user_data["username"] == "testuser"
        assert "email" in user_data
        assert "full_name" in user_data
    finally:
        # Clear dependency overrides
        app.dependency_overrides.clear()

def test_get_current_user_without_token():
    """Test getting the current user without a token."""
    response = client.get("/users/me/")
    assert response.status_code == 401
    assert "detail" in response.json()
