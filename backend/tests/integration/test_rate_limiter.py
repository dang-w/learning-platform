import pytest
import asyncio
from httpx import AsyncClient
from fastapi import FastAPI, Request, Depends
import pytest_asyncio
from main import app
from utils.rate_limiter import rate_limit_dependency, REDIS_URL, REDIS_DB, get_redis_client, rate_limit_dependency_with_logging, check_rate_limit, get_client_identifier, RateLimitExceeded
import redis.asyncio as redis
import logging
import time
from unittest.mock import patch, AsyncMock, MagicMock
from bson import ObjectId
import uuid
from httpx import Headers
from starlette.testclient import TestClient # Import TestClient for sync tests

# Import DB dependency
from database import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fixture to get the actual Redis client via dependency injection
@pytest_asyncio.fixture(scope="function")
async def injected_redis_client():
    gen = get_redis_client()
    client = await gen.__anext__()
    yield client
    # Cleanup is handled by the finally block in get_redis_client
    try:
        await gen.__anext__() # Allow finally block to run
    except StopAsyncIteration:
        pass

@pytest.mark.asyncio
async def test_auth_rate_limit(async_client: AsyncClient, injected_redis_client: redis.Redis):
    """Test rate limiting on authentication endpoint."""
    redis_client = injected_redis_client
    try:
        await redis_client.ping() # Test connection
        logger.info("Injected Redis client connected for test_auth_rate_limit")

        # Patch the get_client_identifier function to ensure consistent identifier
        with patch('utils.rate_limiter.get_client_identifier', return_value="test-client:test-user-agent"):
            # Clear specific keys before test
            async for key in redis_client.scan_iter("rate_limit:token:*"):
                await redis_client.delete(key)

            # Patch authenticate_user to avoid actual DB calls for this rate limit test
            with patch('routers.auth.authenticate_user', new_callable=AsyncMock) as mock_auth_user:
                # Simulate successful authentication to bypass auth logic
                mock_auth_user.return_value = {"username": "test", "disabled": False}

                # Force set the rate limit to 1 below the limit to ensure the next request triggers it
                client_identifier = "test-client:test-user-agent"
                key = f"rate_limit:token:{client_identifier}"
                # Set to value of 21 which should exceed limit of 20
                await redis_client.setex(key, 3600, 21)
                logger.info(f"Set rate limit key {key} to 21")

                # This request should hit the rate limit
                response = await async_client.post(
                    "/api/auth/token",
                    data={ # Use data for form encoding
                        "username": "test",
                        "password": "test"
                    },
                    headers={ # Headers need to match get_client_identifier mock
                        "User-Agent": "test-user-agent",
                        "X-Forwarded-For": "test-client"
                    }
                )

                # Should be 429 (too many requests)
                assert response.status_code == 429
                assert "Retry-After" in response.headers
                assert "X-RateLimit-Reset" in response.headers
                assert "X-RateLimit-Limit" in response.headers
                assert "X-RateLimit-Remaining" in response.headers # Check existence

    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error in test_auth_rate_limit: {e}")
        pytest.skip("Redis connection failed")

@pytest.mark.asyncio
async def test_user_creation_rate_limit(async_client: AsyncClient, injected_redis_client: redis.Redis):
    """Test rate limiting on user creation endpoint."""
    redis_client = injected_redis_client
    try:
        await redis_client.ping()
        logger.info("Injected Redis client connected for test_user_creation_rate_limit")

        # Define DB override function
        async def override_get_db() -> AsyncIOMotorDatabase:
            mock_db_instance = MagicMock()
            mock_db_instance.users = MagicMock()
            # Setup AsyncMock for find_one to return None (no user exists)
            mock_db_instance.users.find_one = AsyncMock(return_value=None)
            insert_result = MagicMock()
            insert_result.inserted_id = ObjectId("507f1f77bcf86cd799439011")
            mock_db_instance.users.insert_one = AsyncMock(return_value=insert_result)
            return mock_db_instance

        # Apply DB override
        app.dependency_overrides[get_db] = override_get_db

        # Patch validate functions
        with patch('routers.users.validate_email', return_value=True), \
             patch('routers.users.validate_password_strength', return_value=True):

            # Also patch the get_client_identifier to ensure consistent identifier
            with patch('utils.rate_limiter.get_client_identifier', return_value="test-client:test-user-agent"):
                # Clear specific keys before test
                async for key in redis_client.scan_iter("rate_limit:user_creation:*"):
                    await redis_client.delete(key)

                # Make requests up to the limit
                responses = []
                timestamp = int(time.time())  # Use timestamp to ensure unique usernames/emails

                # Force set the rate limit to the limit to ensure the next request triggers it
                client_identifier = "test-client:test-user-agent"
                key = f"rate_limit:user_creation:{client_identifier}"
                # Set to value of 11 which should exceed limit of 10
                await redis_client.setex(key, 3600, 11)
                logger.info(f"Set rate limit key {key} to 11")

                # This request should fail with rate limit exceeded
                response = await async_client.post(
                    "/api/users/",
                    json={
                        "username": f"test_rate_user_exceeded_{timestamp}",
                        "email": f"test_rate_exceeded_{timestamp}@example.com",
                        "password": "SecurePass123!",
                        "first_name": "Test",
                        "last_name": "User Rate Limited"
                    },
                    headers={ # Headers need to match get_client_identifier mock
                        "User-Agent": "test-user-agent",
                        "X-Forwarded-For": "test-client"
                    }
                )

                # Should be 429 (too many requests)
                assert response.status_code == 429, f"Expected 429, got {response.status_code}"
                assert "Retry-After" in response.headers
                assert "X-RateLimit-Reset" in response.headers
                assert "X-RateLimit-Limit" in response.headers
                assert "X-RateLimit-Remaining" in response.headers # Check existence

    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error in test_user_creation_rate_limit: {e}")
        pytest.skip("Redis connection failed")
    finally:
        # Clean up DB override
        app.dependency_overrides.pop(get_db, None)

@pytest.mark.asyncio
async def test_rate_limit_headers(async_client: AsyncClient, injected_redis_client: redis.Redis):
    """Test that rate limit headers are properly set in rate limit exception responses."""
    redis_client = injected_redis_client
    try:
        await redis_client.ping()
        logger.info("Injected Redis client connected for test_rate_limit_headers")

        # Define DB override function (same as above)
        async def override_get_db() -> AsyncIOMotorDatabase:
            mock_db_instance = MagicMock()
            mock_db_instance.users = MagicMock()
            mock_db_instance.users.find_one = AsyncMock(return_value=None)
            insert_result = MagicMock()
            insert_result.inserted_id = ObjectId("507f1f77bcf86cd799439011")
            mock_db_instance.users.insert_one = AsyncMock(return_value=insert_result)
            return mock_db_instance

        # Apply DB override
        app.dependency_overrides[get_db] = override_get_db

        # Patch validate functions
        with patch('routers.users.validate_email', return_value=True), \
             patch('routers.users.validate_password_strength', return_value=True):

            # IMPORTANT: For debugging purposes, also patch the get_client_identifier function
            # to return a known value that we can use to check Redis
            with patch('utils.rate_limiter.get_client_identifier', return_value="test-client:test-user-agent"):
                # Clear specific keys before test
                async for key in redis_client.scan_iter("rate_limit:user_creation:*"):
                    await redis_client.delete(key)
                    logger.info(f"Deleted existing key: {key}")

                # Send multiple requests to trigger rate limit
                timestamp = int(time.time())
                client_identifier = "test-client:test-user-agent"  # This should match our mocked value

                # Force set the rate limit to exceed the limit
                key = f"rate_limit:user_creation:{client_identifier}"
                await redis_client.setex(key, 3600, 11)  # Exceeds limit of 10
                logger.info(f"Set rate limit key {key} to 11")

                # Make the request that should be rate limited
                response = await async_client.post(
                    "/api/users/",
                    json={
                        "username": f"test_rate_limited_headers_{timestamp}",
                        "email": f"test_rate_headers_{timestamp}@example.com",
                        "password": "SecurePass123!",
                        "first_name": "Test Headers",
                        "last_name": "User Rate Limited Headers"
                    },
                    headers={ # Headers need to match get_client_identifier mock
                        "User-Agent": "test-user-agent",
                        "X-Forwarded-For": "test-client"
                    }
                )

                assert response.status_code == 429
                assert "Retry-After" in response.headers
                assert "X-RateLimit-Reset" in response.headers
                assert "X-RateLimit-Limit" in response.headers
                assert "X-RateLimit-Remaining" in response.headers
                # Verify header values (adjust based on your actual limits)
                assert response.headers["X-RateLimit-Limit"] == "10" # user_creation limit is 10
                assert response.headers["X-RateLimit-Remaining"] == "0"

    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error in test_rate_limit_headers: {e}")
        pytest.skip("Redis connection failed")
    finally:
        # Clean up DB override
        app.dependency_overrides.pop(get_db, None)

@pytest.mark.asyncio
async def test_rate_limit_reset(async_client: AsyncClient, injected_redis_client: redis.Redis):
    """Test that the rate limit resets after the window expires."""
    redis_client = injected_redis_client
    try:
        await redis_client.ping()
        logger.info("Injected Redis client connected for test_rate_limit_reset")

        # Use a shorter window for testing reset
        limit = 2
        window = 2 # seconds

        # Patch RATE_LIMIT_SETTINGS and get_client_identifier
        with patch('utils.rate_limiter.get_client_identifier', return_value="test-client-reset:test-user-agent-reset"):
            client_identifier = "test-client-reset:test-user-agent-reset"
            key = f"rate_limit:default:{client_identifier}"

            # Clear keys before test
            await redis_client.delete(key)
            logger.info(f"Cleared key {key} before test")

            # Define a simple endpoint for testing the default rate limit
            @app.get(
                "/test-rate-limit-reset",
                dependencies=[Depends(rate_limit_dependency_with_logging(
                    limit=limit, # Pass limit directly
                    window=window, # Pass window directly
                    key_prefix="default"
                ))]
            )
            async def _test_reset_endpoint(): # Ensure newline exists before function def
                return {"status": "ok"}

            # Make requests up to the limit
            for i in range(limit):
                response = await async_client.get("/test-rate-limit-reset")
                assert response.status_code == 200, f"Request {i+1} failed, expected 200"
                logger.info(f"Reset Test: Request {i+1}/{limit} successful (200 OK)")

            # Next request should fail (limit reached)
            response_fail = await async_client.get("/test-rate-limit-reset")
            assert response_fail.status_code == 429, f"Request {limit+1} did not fail, expected 429"
            logger.info(f"Reset Test: Request {limit+1} correctly failed (429 Too Many Requests)")

            # Wait for the window to expire (add buffer)
            wait_time = window + 1.0 # Increased buffer to 1.0 second
            logger.info(f"Reset Test: Waiting for {wait_time:.1f} seconds for rate limit window to expire...")
            await asyncio.sleep(wait_time)
            logger.info("Reset Test: Wait complete.")

            # This request should succeed now that the window has passed
            response_success_after_wait = await async_client.get("/test-rate-limit-reset")
            assert response_success_after_wait.status_code == 200, "Request after window expiry failed, expected 200"
            logger.info("Reset Test: Request after window expiry successful (200 OK)")

            # Clean up the dummy route (important!)
            # Find the route definition and remove it
            routes_to_remove = [r for r in app.routes if getattr(r, 'path', '') == "/test-rate-limit-reset"]
            for route in routes_to_remove:
                app.routes.remove(route)
            logger.info("Cleaned up dummy route /test-rate-limit-reset")

    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error in test_rate_limit_reset: {e}")
        pytest.skip("Redis connection failed")

@pytest.mark.asyncio
async def test_different_clients(async_client: AsyncClient, injected_redis_client: redis.Redis):
    """Test that different clients have independent rate limits."""
    redis_client = injected_redis_client
    try:
        await redis_client.ping()
        logger.info("Injected Redis client connected for test_different_clients")

        limit = 3
        window = 60 # seconds

        # Patch RATE_LIMIT_SETTINGS
        with patch('utils.rate_limiter.get_client_identifier', return_value="test-client:test-user-agent"):
            # Define a simple endpoint for testing
            @app.get(
                "/test-rate-limit-diff-clients",
                dependencies=[Depends(rate_limit_dependency_with_logging(
                    limit=limit, # Pass limit directly
                    window=window, # Pass window directly
                    key_prefix="default"
                ))]
            )
            async def _test_diff_clients_endpoint():
                return {"status": "ok"}

            # Client 1
            client_id_1 = "client1:agent1"
            key1 = f"rate_limit:default:{client_id_1}"
            await redis_client.delete(key1) # Clear before test

            # Patch get_client_identifier for Client 1's requests
            with patch('utils.rate_limiter.get_client_identifier', return_value=client_id_1):
                # Make requests up to the limit for client 1
                for i in range(limit):
                    response1 = await async_client.get("/test-rate-limit-diff-clients")
                    assert response1.status_code == 200, f"Client 1 Request {i+1} failed"
                    logger.info(f"Client 1: Request {i+1}/{limit} successful (200 OK)")

                # Next request for client 1 should fail
                response1_fail = await async_client.get("/test-rate-limit-diff-clients")
                assert response1_fail.status_code == 429, "Client 1 Request {limit+1} did not fail"
                logger.info(f"Client 1: Request {limit+1} correctly failed (429 Too Many Requests)")

            # Client 2
            client_id_2 = "client2:agent2"
            key2 = f"rate_limit:default:{client_id_2}"
            await redis_client.delete(key2) # Clear before test

            # Patch get_client_identifier for Client 2's requests
            with patch('utils.rate_limiter.get_client_identifier', return_value=client_id_2):
                # Make requests up to the limit for client 2 - SHOULD SUCCEED
                for i in range(limit):
                    response2 = await async_client.get("/test-rate-limit-diff-clients")
                    assert response2.status_code == 200, f"Client 2 Request {i+1} failed unexpectedly"
                    logger.info(f"Client 2: Request {i+1}/{limit} successful (200 OK)")

                # Next request for client 2 should fail
                response2_fail = await async_client.get("/test-rate-limit-diff-clients")
                assert response2_fail.status_code == 429, f"Client 2 Request {limit+1} did not fail"
                logger.info(f"Client 2: Request {limit+1} correctly failed (429 Too Many Requests)")

            # Clean up the dummy route
            routes_to_remove = [r for r in app.routes if getattr(r, 'path', '') == "/test-rate-limit-diff-clients"]
            for route in routes_to_remove:
                app.routes.remove(route)
            logger.info("Cleaned up dummy route /test-rate-limit-diff-clients")

    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error in test_different_clients: {e}")
        pytest.skip("Redis connection failed")

@pytest.mark.integration
@pytest.mark.asyncio
async def test_rate_limit_exceeded(async_client: AsyncClient, injected_redis_client: redis.Redis):
    """Test the behavior when the rate limit is already exceeded."""
    redis_client = injected_redis_client
    try:
        await redis_client.ping()
        logger.info("Injected Redis client connected for test_rate_limit_exceeded")

        limit = 5
        window = 60 # seconds
        client_identifier = "exceeded-client:exceeded-agent"
        key_prefix = "exceeded_test"
        key = f"rate_limit:{key_prefix}:{client_identifier}"

        # Ensure key is clean before starting
        await redis_client.delete(key)

        # Patch RATE_LIMIT_SETTINGS and get_client_identifier
        with patch('utils.rate_limiter.get_client_identifier', return_value=client_identifier):

            # Define a simple endpoint for testing
            @app.get(
                "/test-rate-limit-exceeded-endpoint",
                dependencies=[Depends(rate_limit_dependency_with_logging(
                    limit=limit, # Pass limit directly
                    window=window, # Pass window directly
                    key_prefix=key_prefix
                ))]
            )
            async def _test_exceeded_endpoint():
                return {"status": "ok"}

            # Pre-set the counter to be exactly at the limit
            await redis_client.setex(key, window, limit)
            logger.info(f"Pre-set rate limit key {key} to {limit}")

            # The very next request should fail
            response = await async_client.get("/test-rate-limit-exceeded-endpoint")
            assert response.status_code == 429, f"First request after pre-setting limit did not fail (Expected 429, got {response.status_code})"
            logger.info("First request after pre-setting limit correctly failed (429)")
            assert int(response.headers["X-RateLimit-Remaining"]) == 0

            # Subsequent requests should also fail until reset
            response_again = await async_client.get("/test-rate-limit-exceeded-endpoint")
            assert response_again.status_code == 429, "Subsequent request did not fail"
            logger.info("Subsequent request also correctly failed (429)")

            # Clean up the dummy route
            routes_to_remove = [r for r in app.routes if getattr(r, 'path', '') == "/test-rate-limit-exceeded-endpoint"]
            for route in routes_to_remove:
                app.routes.remove(route)
            logger.info("Cleaned up dummy route /test-rate-limit-exceeded-endpoint")

            # Clean up Redis key
            await redis_client.delete(key)
            logger.info(f"Cleaned up Redis key {key}")

    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error in test_rate_limit_exceeded: {e}")
        pytest.skip("Redis connection failed")

@pytest.mark.integration
@pytest.mark.asyncio
async def test_rate_limit_bypass_header(async_client: AsyncClient, injected_redis_client: redis.Redis):
    """Test that the X-Skip-Rate-Limit header bypasses rate limiting."""
    redis_client = injected_redis_client
    try:
        await redis_client.ping()
        logger.info("Injected Redis client connected for test_rate_limit_bypass_header")

        limit = 2
        window = 60 # seconds
        client_identifier = "bypass-client:bypass-agent"
        key_prefix = "bypass_test"
        key = f"rate_limit:{key_prefix}:{client_identifier}"

        # Ensure key is clean before starting
        await redis_client.delete(key)

        # Patch RATE_LIMIT_SETTINGS and get_client_identifier
        with patch('utils.rate_limiter.get_client_identifier', return_value=client_identifier):

            # Define a simple endpoint for testing
            @app.get(
                "/test-rate-limit-bypass-endpoint",
                dependencies=[Depends(rate_limit_dependency_with_logging(
                    limit=limit, # Pass limit directly
                    window=window, # Pass window directly
                    key_prefix=key_prefix
                ))]
            )
            async def _test_bypass_endpoint():
                return {"status": "ok"}

            # Pre-set the counter to be exactly at the limit
            await redis_client.setex(key, window, limit)
            logger.info(f"Pre-set rate limit key {key} to {limit}")

            # Make a request WITHOUT the bypass header - should fail
            response_fail = await async_client.get("/test-rate-limit-bypass-endpoint")
            assert response_fail.status_code == 429, "Request without bypass header did not fail as expected"
            logger.info("Request without bypass header correctly failed (429)")

            # Make a request WITH the bypass header - should succeed
            headers_bypass = Headers({"X-Skip-Rate-Limit": "true"})
            response_success = await async_client.get("/test-rate-limit-bypass-endpoint", headers=headers_bypass)
            assert response_success.status_code == 200, f"Request with bypass header failed (Expected 200, got {response_success.status_code})"
            logger.info("Request with bypass header correctly succeeded (200)")

            # Check that the counter was NOT incremented by the bypassed request
            count_after = await redis_client.get(key)
            assert int(count_after) == limit, f"Counter was incremented despite bypass header (Expected {limit}, got {count_after})"
            logger.info("Rate limit counter remained unchanged after bypass request")

            # Clean up the dummy route
            routes_to_remove = [r for r in app.routes if getattr(r, 'path', '') == "/test-rate-limit-bypass-endpoint"]
            for route in routes_to_remove:
                app.routes.remove(route)
            logger.info("Cleaned up dummy route /test-rate-limit-bypass-endpoint")

            # Clean up Redis key
            await redis_client.delete(key)
            logger.info(f"Cleaned up Redis key {key}")

    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error in test_rate_limit_bypass_header: {e}")
        pytest.skip("Redis connection failed")

# Mock environment variables for testing
@pytest.fixture(autouse=True)
def set_test_environment(monkeypatch):
    monkeypatch.setenv("TEST_ENVIRONMENT", "true")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0") # Ensure Redis URL is set for tests
    # Ensure IS_DEVELOPMENT is not set or false for bypass header tests
    monkeypatch.delenv("IS_DEVELOPMENT", raising=False)