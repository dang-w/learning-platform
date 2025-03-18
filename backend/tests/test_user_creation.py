import pytest
import asyncio
import time
from httpx import AsyncClient
from main import app
from database import db, init_db
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test data
VALID_USER = {
    "username": "testuser1",
    "email": "testuser1@example.com",
    "password": "SecurePass123!",
    "full_name": "Test User One"
}

INVALID_USERS = {
    "weak_password": {
        "username": "testuser2",
        "email": "testuser2@example.com",
        "password": "weak",
        "full_name": "Test User Two"
    },
    "invalid_email": {
        "username": "testuser3",
        "email": "invalid-email",
        "password": "SecurePass123!",
        "full_name": "Test User Three"
    },
    "duplicate_username": {
        "username": "testuser1",  # Same as VALID_USER
        "email": "different@example.com",
        "password": "SecurePass123!",
        "full_name": "Duplicate Username"
    }
}

@pytest.fixture(autouse=True)
async def setup_database():
    """Setup test database before each test."""
    try:
        # Initialize database with indexes
        await init_db()

        # Clear any existing test users
        await db.users.delete_many({
            "username": {"$in": ["testuser1", "testuser2", "testuser3"]}
        })

        yield

        # Cleanup after tests
        await db.users.delete_many({
            "username": {"$in": ["testuser1", "testuser2", "testuser3"]}
        })
    except Exception as e:
        logger.error(f"Error in database setup: {str(e)}")
        raise

@pytest.mark.asyncio
async def test_valid_user_creation():
    """Test creating a user with valid data."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/users/", json=VALID_USER)
        logger.info(f"Response status: {response.status_code}")
        logger.info(f"Response content: {response.content}")
        assert response.status_code == 201

        # Verify response data
        user_data = response.json()
        assert user_data["username"] == VALID_USER["username"]
        assert user_data["email"] == VALID_USER["email"]
        assert user_data["full_name"] == VALID_USER["full_name"]
        assert "hashed_password" not in user_data

        # Verify user in database
        db_user = await db.users.find_one({"username": VALID_USER["username"]})
        assert db_user is not None
        assert db_user["email"] == VALID_USER["email"]
        assert "hashed_password" in db_user
        assert db_user["is_active"] is True

@pytest.mark.asyncio
async def test_weak_password():
    """Test creating a user with a weak password."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/users/", json=INVALID_USERS["weak_password"])
        assert response.status_code == 422
        # Check that the error is related to string length (simple validation error)
        detail = response.json()["detail"][0]
        assert "string" in detail["msg"].lower() and "characters" in detail["msg"].lower()

@pytest.mark.asyncio
async def test_invalid_email():
    """Test creating a user with an invalid email."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/users/", json=INVALID_USERS["invalid_email"])
        assert response.status_code == 422
        assert "email" in response.json()["detail"][0]["msg"].lower()

@pytest.mark.asyncio
async def test_duplicate_username():
    """Test creating a user with a duplicate username."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # First create the valid user
        await client.post("/users/", json=VALID_USER)

        # Try to create user with same username
        response = await client.post("/users/", json=INVALID_USERS["duplicate_username"])
        assert response.status_code == 500
        assert "error creating user" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_database_verification():
    """Test that user creation properly verifies database state."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create user
        response = await client.post("/users/", json=VALID_USER)
        assert response.status_code == 201

        # Verify all required fields in database
        user = await db.users.find_one({"username": VALID_USER["username"]})
        assert user is not None

        # Check standard fields
        assert "hashed_password" in user
        assert "is_active" in user
        assert user["is_active"] is True
        assert "username" in user
        assert "email" in user
        assert "created_at" in user

@pytest.mark.asyncio
async def test_concurrent_user_creation():
    """Test creating multiple users concurrently."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create multiple users with different usernames using timestamp to ensure uniqueness
        users = [
            {**VALID_USER,
             "username": f"concurrent_user_{i}_{int(time.time())}",
             "email": f"concurrent{i}_{int(time.time())}@example.com"}
            for i in range(5)
        ]

        # Create users concurrently
        responses = await asyncio.gather(
            *[client.post("/users/", json=user) for user in users],
            return_exceptions=True
        )

        # Count response types
        success_count = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 201)
        rate_limited_count = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 429)

        # We expect some successful creations and some rate limited
        assert success_count + rate_limited_count == 5, f"Expected all requests to be either successful or rate limited, got {success_count} successes and {rate_limited_count} rate limited"
        assert success_count > 0, f"Expected at least one successful creation, got {success_count}"
        assert rate_limited_count > 0, f"Expected at least one rate limited request, got {rate_limited_count}"

        # Cleanup concurrent test users
        await db.users.delete_many({
            "username": {"$regex": "^concurrent_user_"}
        })