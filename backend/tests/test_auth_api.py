import pytest

def test_login_with_valid_credentials(client, test_user):
    """Test login with valid credentials."""
    response = client.post(
        "/token",
        data={"username": test_user["username"], "password": "password123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "token_type" in response.json()

def test_login_with_invalid_credentials(client):
    """Test login with invalid credentials."""
    response = client.post(
        "/token",
        data={"username": "invaliduser", "password": "invalidpassword"},
    )
    assert response.status_code == 401
    assert "detail" in response.json()

def test_get_current_user(client, auth_headers):
    """Test getting the current user."""
    response = client.get(
        "/users/me/",
        headers=auth_headers,
    )
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == "testuser"
    assert "email" in user_data
    assert "full_name" in user_data

def test_get_current_user_without_token(client):
    """Test getting the current user without a token."""
    response = client.get("/users/me/")
    assert response.status_code == 401
    assert "detail" in response.json()
