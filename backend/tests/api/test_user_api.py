import pytest

def test_create_user(client, test_db):
    """Test creating a new user."""
    user_data = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "password123",
        "full_name": "New User"
    }

    response = client.post(
        "/users/",
        json=user_data,
    )

    assert response.status_code == 200
    created_user = response.json()
    assert created_user["username"] == "newuser"
    assert created_user["email"] == "newuser@example.com"
    assert created_user["full_name"] == "New User"
    assert "hashed_password" not in created_user

def test_create_user_duplicate_username(client, test_user, test_db):
    """Test creating a user with a duplicate username."""
    user_data = {
        "username": test_user["username"],  # Same username as test_user
        "email": "different@example.com",
        "password": "password123",
        "full_name": "Different User"
    }

    response = client.post(
        "/users/",
        json=user_data,
    )

    assert response.status_code == 400
    assert "detail" in response.json()
    assert "already registered" in response.json()["detail"]

def test_get_current_user_with_valid_token(client, auth_headers):
    """Test getting the current user with a valid token."""
    response = client.get(
        "/users/me/",
        headers=auth_headers,
    )

    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == "testuser"
    assert user_data["email"] == "test@example.com"
    assert user_data["full_name"] == "Test User"
    assert "hashed_password" not in user_data

def test_get_current_user_without_token(client):
    """Test getting the current user without a token."""
    response = client.get("/users/me/")

    assert response.status_code == 401
    assert "detail" in response.json()
    assert "Not authenticated" in response.json()["detail"]

def test_get_current_user_with_invalid_token(client):
    """Test getting the current user with an invalid token."""
    headers = {"Authorization": "Bearer invalidtoken"}

    response = client.get(
        "/users/me/",
        headers=headers,
    )

    assert response.status_code == 401
    assert "detail" in response.json()
    assert "Could not validate credentials" in response.json()["detail"]

def test_login_with_valid_credentials(client, test_user):
    """Test login with valid credentials."""
    response = client.post(
        "/token",
        data={"username": test_user["username"], "password": "password123"},
    )

    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert "token_type" in token_data
    assert token_data["token_type"] == "bearer"

def test_login_with_invalid_username(client):
    """Test login with an invalid username."""
    response = client.post(
        "/token",
        data={"username": "nonexistentuser", "password": "password123"},
    )

    assert response.status_code == 401
    assert "detail" in response.json()
    assert "Incorrect username or password" in response.json()["detail"]

def test_login_with_invalid_password(client, test_user):
    """Test login with an invalid password."""
    response = client.post(
        "/token",
        data={"username": test_user["username"], "password": "wrongpassword"},
    )

    assert response.status_code == 401
    assert "detail" in response.json()
    assert "Incorrect username or password" in response.json()["detail"]