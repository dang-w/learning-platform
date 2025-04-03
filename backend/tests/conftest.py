"""Test configuration module."""
import pytest
from fastapi.testclient import TestClient
import sys
import os
import asyncio
import logging
import pytest_asyncio
from fastapi import Depends, HTTPException, status
from bson import ObjectId
from datetime import timedelta
from jose import JWTError
import nest_asyncio
import uuid
from httpx import AsyncClient

# Import standardized utilities
from utils.error_handlers import AuthenticationError, ResourceNotFoundError
from utils.response_models import StandardResponse, ErrorResponse
from utils.validators import validate_required_fields
from database import get_database
from utils.rate_limiter import redis_client

# Apply nest_asyncio to allow nested event loops
nest_asyncio.apply()

# Register custom markers
def pytest_configure(config):
    config.addinivalue_line("markers", "integration: mark test as an integration test")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the parent directory to the path so we can import main
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the app and auth modules - directly import router modules to avoid circular issues
from main import app
from auth import get_current_user, get_current_active_user, oauth2_scheme, create_access_token, jwt, SECRET_KEY, ALGORITHM
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.resources import router as resources_router
from routers.progress import router as progress_router
from routers.learning_path import router as learning_path_router
from routers.reviews import router as reviews_router
from routers.sessions import router as sessions_router
from routers.lessons import router as lessons_router
from routers.url_extractor import router as url_extractor_router
from routers.notes import router as notes_router

# Import the mock database instead of the real one
from tests.mock_db import db, create_test_user

# Create a session-scoped event loop for all async tests
@pytest.fixture(scope="session")
def event_loop():
    """Create a session-scoped event loop for all async tests."""
    # Create a new event loop
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()

    # Set it as the default event loop
    asyncio.set_event_loop(loop)

    # Apply nest_asyncio to allow nested event loops
    nest_asyncio.apply(loop)

    # Yield the loop for use in tests
    yield loop

    # Clean up pending tasks at the end of the session
    pending = asyncio.all_tasks(loop)
    for task in pending:
        task.cancel()

    # Run the event loop until all tasks are cancelled
    if pending:
        loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))

    # Close the loop at the end of the session
    loop.close()

# Mock user class for testing
class MockUser:
    """Mock user class for testing."""

    def __init__(self, username="testuser"):
        self.username = username
        self.email = f"{username}@example.com"
        self.first_name = "Test"
        self.last_name = f"User {username.capitalize()}"
        self.disabled = False
        self.id = username
        self.user_id = username
        self.roles = ["user"]
        self.permissions = ["read:own", "write:own"]
        self.created_at = "2023-01-01T00:00:00"
        self.updated_at = "2023-01-01T00:00:00"
        self.last_login = "2023-01-01T00:00:00"
        self.preferences = {"theme": "light", "notifications": True}

    def model_dump(self):
        """Convert to dict for Pydantic v2 compatibility."""
        return {
            "username": self.username,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "disabled": self.disabled,
            "id": self.id,
            "user_id": self.user_id,
            "roles": self.roles,
            "permissions": self.permissions,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_login": self.last_login,
            "preferences": self.preferences
        }

    def dict(self):
        """Convert to dict for Pydantic v1 compatibility."""
        return self.model_dump()

# Setup test user fixture
@pytest_asyncio.fixture(scope="session")
async def setup_test_user():
    """Create a test user in the database."""
    try:
        # Create a test user
        test_user = await create_test_user()

        # Create an access token for the test user
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": test_user["username"]},
            expires_delta=access_token_expires
        )

        # Return the test user and token
        return {
            "user": test_user,
            "token": access_token
        }
    except Exception as e:
        logger.error(f"Error setting up test user: {e}")
        raise

# Client fixture for testing
@pytest.fixture(scope="function")
def client(setup_test_user):
    """Create a test client with authentication overrides."""
    # Create a test client
    test_client = TestClient(app)

    # Override the dependencies for authentication
    if setup_test_user:
        # For authenticated routes
        async def override_get_current_user():
            """Override the get_current_user dependency."""
            return MockUser(username=setup_test_user["user"]["username"])

        # Override the dependencies
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_current_active_user] = override_get_current_user
    else:
        # For unauthenticated routes
        async def override_get_current_user():
            """Override to simulate authentication failure."""
            raise AuthenticationError(detail="Not authenticated for testing")

        # Override the dependencies
        app.dependency_overrides[get_current_user] = override_get_current_user

    yield test_client

    # Clear dependency overrides
    app.dependency_overrides.clear()

# Async client fixture for testing
@pytest.fixture(scope="function")
def event_loop():
    """Create an event loop for each test."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    nest_asyncio.apply(loop)
    yield loop
    loop.close()

@pytest_asyncio.fixture
async def async_client(setup_test_user, event_loop):
    """Create an async test client with authentication overrides."""
    # Create an async client
    async with AsyncClient(app=app, base_url="http://test", follow_redirects=True) as ac:
        # Override the dependencies for authentication
        if setup_test_user:
            # For authenticated routes
            async def override_get_current_user():
                """Override the get_current_user dependency."""
                return MockUser(username=setup_test_user["user"]["username"])

            # Override the dependencies
            app.dependency_overrides[get_current_user] = override_get_current_user
            app.dependency_overrides[get_current_active_user] = override_get_current_user
        else:
            # For unauthenticated routes
            async def override_get_current_user():
                """Override to simulate authentication failure."""
                raise AuthenticationError(detail="Not authenticated for testing")

            # Override the dependencies
            app.dependency_overrides[get_current_user] = override_get_current_user

        yield ac

        # Clear dependency overrides
        app.dependency_overrides.clear()

# Auth headers fixture for testing
@pytest.fixture(scope="function")
def auth_headers(setup_test_user):
    """Create authentication headers for testing."""
    if not setup_test_user or "token" not in setup_test_user:
        return {}

    # Create headers with the token
    headers = {"Authorization": f"Bearer {setup_test_user['token']}"}
    return headers

# Unique test name fixture for testing
@pytest.fixture(scope="function")
def unique_test_name():
    """Generate a unique test name for isolation."""
    return f"test_{uuid.uuid4().hex[:8]}"

# Test database fixture for testing
@pytest_asyncio.fixture(scope="session")
async def test_db():
    """Create a test database connection."""
    try:
        # Get a new database connection
        db_conn = await get_database()
        yield db_conn["db"]
    finally:
        # Close the database connection
        if "client" in db_conn:
            db_conn["client"].close()

# Patch database fixture for testing
@pytest.fixture(scope="session", autouse=True)
def patch_database():
    """Patch the database module to use the mock database."""
    # Import the modules that use the database
    import database
    import utils.db_utils

    # Save the original database
    original_db = database.db
    original_get_database = database.get_database

    # Replace with the mock database
    database.db = db
    utils.db_utils.db = db

    # Define a mock get_database function
    async def mock_get_database():
        return {"db": db, "client": None}

    # Replace the get_database function
    database.get_database = mock_get_database

    # Create a mock for verify_db_connection to avoid event loop closed errors
    async def mock_verify_db_connection():
        """Mock implementation of verify_db_connection that always returns True."""
        return True

    # Replace verify_db_connection with the mock
    database.verify_db_connection = mock_verify_db_connection

    yield

    # Restore the original database
    database.db = original_db
    database.get_database = original_get_database

# Clear rate limits before and after each test
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