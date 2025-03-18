import pytest
import asyncio
from httpx import AsyncClient
from datetime import datetime, timedelta
import jwt
from main import app
from database import db, init_db
from auth import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test data
TEST_USER = {
    "username": "auth_test_user",
    "email": "auth_test@example.com",
    "password": "TestPassword123!",
    "full_name": "Auth Test User"
}

@pytest.fixture(autouse=True)
async def setup_test_user():
    """Setup test user before each test."""
    try:
        # Initialize database
        await init_db()

        # Clear any existing test user
        await db.users.delete_many({"username": TEST_USER["username"]})

        # Create test user
        async with AsyncClient(app=app, base_url="http://test") as client:
            await client.post("/users/", json=TEST_USER)

        yield

        # Cleanup
        await db.users.delete_many({"username": TEST_USER["username"]})
    except Exception as e:
        logger.error(f"Error in test setup: {str(e)}")
        raise

@pytest.mark.asyncio
async def test_successful_login():
    """Test successful login with valid credentials."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/auth/token",
            data={
                "username": TEST_USER["username"],
                "password": TEST_USER["password"]
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

        # Verify tokens are valid
        access_token = data["access_token"]
        refresh_token = data["refresh_token"]

        access_payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        assert access_payload["sub"] == TEST_USER["username"]
        assert access_payload["type"] == "access"

        refresh_payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        assert refresh_payload["sub"] == TEST_USER["username"]
        assert refresh_payload["type"] == "refresh"

@pytest.mark.asyncio
async def test_failed_login_attempts():
    """Test failed login attempts."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Test with wrong password
        response = await client.post(
            "/auth/token",
            data={
                "username": TEST_USER["username"],
                "password": "wrongpassword"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 401

        # Test with non-existent user
        response = await client.post(
            "/auth/token",
            data={
                "username": "nonexistentuser",
                "password": TEST_USER["password"]
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 401

@pytest.mark.asyncio
async def test_token_refresh():
    """Test token refresh functionality."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # First get tokens
        response = await client.post(
            "/auth/token",
            data={
                "username": TEST_USER["username"],
                "password": TEST_USER["password"]
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        refresh_token = response.json()["refresh_token"]

        # Try to refresh the token
        response = await client.post(
            "/auth/token/refresh",
            json={"refresh_token": refresh_token}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

        # Verify new tokens are valid
        new_access_token = data["access_token"]
        new_refresh_token = data["refresh_token"]

        access_payload = jwt.decode(new_access_token, SECRET_KEY, algorithms=[ALGORITHM])
        assert access_payload["sub"] == TEST_USER["username"]
        assert access_payload["type"] == "access"

        refresh_payload = jwt.decode(new_refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        assert refresh_payload["sub"] == TEST_USER["username"]
        assert refresh_payload["type"] == "refresh"

@pytest.mark.asyncio
async def test_token_expiration():
    """Test token expiration handling."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create an expired refresh token
        expire = datetime.utcnow() - timedelta(minutes=1)
        expired_token = jwt.encode(
            {"sub": TEST_USER["username"], "exp": expire, "type": "refresh"},
            SECRET_KEY,
            algorithm=ALGORITHM
        )

        # Try to refresh expired token
        response = await client.post(
            "/auth/token/refresh",
            json={"refresh_token": expired_token}
        )

        assert response.status_code == 401
        assert "invalid or expired refresh token" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_protected_endpoint_access():
    """Test accessing protected endpoints with and without token."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # First get a token
        response = await client.post(
            "/auth/token",
            data={
                "username": TEST_USER["username"],
                "password": TEST_USER["password"]
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        token = response.json()["access_token"]

        # Test accessing protected endpoint with valid token
        response = await client.get(
            "/users/me/",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["username"] == TEST_USER["username"]

        # Test accessing protected endpoint without token
        response = await client.get("/users/me/")
        assert response.status_code == 401

        # Test accessing protected endpoint with invalid token
        response = await client.get(
            "/users/me/",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401

@pytest.mark.asyncio
async def test_concurrent_token_refresh():
    """Test concurrent token refresh requests."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Get initial tokens
        response = await client.post(
            "/auth/token",
            data={
                "username": TEST_USER["username"],
                "password": TEST_USER["password"]
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        refresh_token = response.json()["refresh_token"]

        # Try to refresh token concurrently
        refresh_requests = [
            client.post("/auth/token/refresh", json={"refresh_token": refresh_token})
            for _ in range(5)
        ]

        responses = await asyncio.gather(*refresh_requests, return_exceptions=True)

        # Verify all requests completed
        assert len(responses) == 5

        # At least one should succeed
        success_count = sum(1 for r in responses if r.status_code == 200)
        assert success_count >= 1

@pytest.mark.asyncio
async def test_token_reuse():
    """Test that refreshed tokens can't be reused."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Get initial tokens
        response = await client.post(
            "/auth/token",
            data={
                "username": TEST_USER["username"],
                "password": TEST_USER["password"]
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        original_refresh_token = response.json()["refresh_token"]

        # Refresh token
        response = await client.post(
            "/auth/token/refresh",
            json={"refresh_token": original_refresh_token}
        )

        # Try to use original refresh token again
        response = await client.post(
            "/auth/token/refresh",
            json={"refresh_token": original_refresh_token}
        )

        # Should fail as token has been refreshed
        assert response.status_code == 401
        assert "invalid or expired refresh token" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_token_verification():
    """Test token verification endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # First get a token
        response = await client.post(
            "/auth/token",
            data={
                "username": TEST_USER["username"],
                "password": TEST_USER["password"]
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        token = response.json()["access_token"]

        # Test token verification
        response = await client.get(
            "/auth/verify",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["username"] == TEST_USER["username"]