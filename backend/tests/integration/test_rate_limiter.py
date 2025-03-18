import pytest
import asyncio
from httpx import AsyncClient
from fastapi import FastAPI, Request, Depends
from main import app
from utils.rate_limiter import rate_limit_dependency, redis_client
import logging
import time
from unittest.mock import patch, AsyncMock, MagicMock
from bson import ObjectId

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@pytest.fixture(autouse=True)
async def clear_rate_limits():
    """Clear rate limits before and after each test."""
    if redis_client:
        try:
            # Clear all rate limit keys
            for key in redis_client.scan_iter("rate_limit:*"):
                redis_client.delete(key)

            yield

            # Cleanup after test
            for key in redis_client.scan_iter("rate_limit:*"):
                redis_client.delete(key)
        except Exception as e:
            logger.error(f"Error clearing rate limits: {str(e)}")
            yield
    else:
        yield

@pytest.mark.asyncio
async def test_auth_rate_limit():
    """Test rate limiting on authentication endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Make requests up to the limit
        responses = []
        for _ in range(6):  # Limit is 5
            response = await client.post(
                "/token",
                data={
                    "username": "test",
                    "password": "test"
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            responses.append(response)

        # First 5 should be 401 (invalid credentials)
        for response in responses[:5]:
            assert response.status_code == 401
            assert "X-RateLimit-Remaining" in response.headers

        # 6th should be 429 (too many requests)
        assert responses[5].status_code == 429
        assert "Retry-After" in responses[5].headers
        assert "X-RateLimit-Reset" in responses[5].headers

@pytest.mark.asyncio
async def test_user_creation_rate_limit():
    """Test rate limiting on user creation endpoint."""
    # Patch the database operations
    with patch('routers.users.db') as mock_db, patch('main.db') as main_mock_db:
        # Setup AsyncMock for find_one to return None (no user exists)
        mock_db.users.find_one = AsyncMock(return_value=None)
        main_mock_db.users.find_one = AsyncMock(return_value=None)

        # Setup insert_one to return success
        insert_result = MagicMock()
        insert_result.inserted_id = ObjectId("507f1f77bcf86cd799439011")
        mock_db.users.insert_one = AsyncMock(return_value=insert_result)
        main_mock_db.users.insert_one = AsyncMock(return_value=insert_result)

        # Patch validate functions
        with patch('routers.users.validate_email', return_value=True), \
             patch('routers.users.validate_password_strength', return_value=True), \
             patch('main.validate_email', return_value=True), \
             patch('main.validate_password_strength', return_value=True):

            async with AsyncClient(app=app, base_url="http://test") as client:
                # Make requests up to the limit
                responses = []
                timestamp = int(time.time())  # Use timestamp to ensure unique usernames/emails

                for i in range(4):  # Limit is 3
                    response = await client.post(
                        "/users/",
                        json={
                            "username": f"test_rate_user_{i}_{timestamp}",
                            "email": f"test_rate_{i}_{timestamp}@example.com",
                            "password": "SecurePass123!",
                            "full_name": f"Test User {i}"
                        }
                    )
                    responses.append(response)

                # First 3 should be 201 (created)
                for i, response in enumerate(responses[:3]):
                    assert response.status_code == 201, f"Expected 201 for request {i}, got {response.status_code}"
                    assert "X-RateLimit-Remaining" in response.headers

                # 4th should be 429 (too many requests)
                assert responses[3].status_code == 429
                assert "Retry-After" in responses[3].headers
                assert "X-RateLimit-Reset" in responses[3].headers

@pytest.mark.asyncio
async def test_rate_limit_headers():
    """Test that rate limit headers are properly set."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        timestamp = int(time.time())
        response = await client.post(
            "/users/",
            json={
                "username": f"test_headers_user_{timestamp}",
                "email": f"test_headers_{timestamp}@example.com",
                "password": "SecurePass123!",
                "full_name": "Test User"
            }
        )

        # Verify headers
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers
        assert "X-RateLimit-Reset" in response.headers

        # Verify values
        assert int(response.headers["X-RateLimit-Limit"]) == 3  # user_creation limit
        assert int(response.headers["X-RateLimit-Remaining"]) == 2  # 3 - 1
        assert int(response.headers["X-RateLimit-Reset"]) > 0

@pytest.mark.asyncio
async def test_rate_limit_reset():
    """Test that rate limits are properly reset after window expires."""
    # Patch the database operations
    with patch('routers.users.db') as mock_db, patch('main.db') as main_mock_db:
        # Setup AsyncMock for find_one to return None (no user exists)
        mock_db.users.find_one = AsyncMock(return_value=None)
        main_mock_db.users.find_one = AsyncMock(return_value=None)

        # Setup insert_one to return success
        insert_result = MagicMock()
        insert_result.inserted_id = ObjectId("507f1f77bcf86cd799439011")
        mock_db.users.insert_one = AsyncMock(return_value=insert_result)
        main_mock_db.users.insert_one = AsyncMock(return_value=insert_result)

        # Patch validate functions
        with patch('routers.users.validate_email', return_value=True), \
             patch('routers.users.validate_password_strength', return_value=True), \
             patch('main.validate_email', return_value=True), \
             patch('main.validate_password_strength', return_value=True):

            async with AsyncClient(app=app, base_url="http://test") as client:
                # Make max requests
                timestamp = int(time.time())
                for i in range(3):
                    await client.post(
                        "/users/",
                        json={
                            "username": f"test_reset_user_{i}_{timestamp}",
                            "email": f"test_reset_{i}_{timestamp}@example.com",
                            "password": "SecurePass123!",
                            "full_name": "Test User"
                        }
                    )

                # Next request should be rate limited
                response = await client.post(
                    "/users/",
                    json={
                        "username": f"test_reset_user_3_{timestamp}",
                        "email": f"test_reset_3_{timestamp}@example.com",
                        "password": "SecurePass123!",
                        "full_name": "Test User"
                    }
                )
                assert response.status_code == 429

                # Clear rate limits (simulating time passing)
                if redis_client:
                    for key in redis_client.scan_iter("rate_limit:*"):
                        redis_client.delete(key)

                # Should be able to make request again
                response = await client.post(
                    "/users/",
                    json={
                        "username": f"test_reset_user_4_{timestamp}",
                        "email": f"test_reset_4_{timestamp}@example.com",
                        "password": "SecurePass123!",
                        "full_name": "Test User"
                    }
                )
                assert response.status_code == 201

@pytest.mark.asyncio
async def test_different_clients():
    """Test that rate limits are applied separately to different clients."""
    # Patch the database operations
    with patch('routers.users.db') as mock_db, patch('main.db') as main_mock_db:
        # Setup AsyncMock for find_one to return None (no user exists)
        mock_db.users.find_one = AsyncMock(return_value=None)
        main_mock_db.users.find_one = AsyncMock(return_value=None)

        # Setup insert_one to return success
        insert_result = MagicMock()
        insert_result.inserted_id = ObjectId("507f1f77bcf86cd799439011")
        mock_db.users.insert_one = AsyncMock(return_value=insert_result)
        main_mock_db.users.insert_one = AsyncMock(return_value=insert_result)

        # Patch validate functions
        with patch('routers.users.validate_email', return_value=True), \
             patch('routers.users.validate_password_strength', return_value=True), \
             patch('main.validate_email', return_value=True), \
             patch('main.validate_password_strength', return_value=True):

            async with AsyncClient(app=app, base_url="http://test") as client1:
                async with AsyncClient(app=app, base_url="http://test") as client2:
                    # Different User-Agent headers
                    client1.headers["User-Agent"] = "TestClient1"
                    client2.headers["User-Agent"] = "TestClient2"

                    # Use timestamp to ensure unique usernames/emails
                    timestamp = int(time.time())

                    # Make max requests with client1
                    for i in range(3):
                        await client1.post(
                            "/users/",
                            json={
                                "username": f"test_client1_user_{i}_{timestamp}",
                                "email": f"test_client1_{i}_{timestamp}@example.com",
                                "password": "SecurePass123!",
                                "full_name": "Test User"
                            }
                        )

                    # Client1 should be rate limited
                    response = await client1.post(
                        "/users/",
                        json={
                            "username": f"test_client1_user_3_{timestamp}",
                            "email": f"test_client1_3_{timestamp}@example.com",
                            "password": "SecurePass123!",
                            "full_name": "Test User"
                        }
                    )
                    assert response.status_code == 429

                    # Client2 should still be able to make requests
                    response = await client2.post(
                        "/users/",
                        json={
                            "username": f"test_client2_user_0_{timestamp}",
                            "email": f"test_client2_0_{timestamp}@example.com",
                            "password": "SecurePass123!",
                            "full_name": "Test User"
                        }
                    )
                    assert response.status_code == 201