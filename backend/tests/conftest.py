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
from httpx import AsyncClient, Headers, ASGITransport
import redis.asyncio as redis
import utils.db_utils

# Import standardized utilities
from utils.error_handlers import AuthenticationError, ResourceNotFoundError
from utils.response_models import StandardResponse, ErrorResponse
from utils.validators import validate_required_fields
from database import get_database
from utils.rate_limiter import get_redis_client

# Apply nest_asyncio to allow nested event loops
# nest_asyncio.apply()

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
@pytest_asyncio.fixture(scope="function")
async def setup_test_user():
    """Create a test user in the database for each test."""
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
@pytest.fixture(scope="function", autouse=True)
def patch_database():
    """Patch database functions for each test and clear mock data."""
    # Import the modules that use the database
    import database
    import utils.db_utils # Ensure utils.db_utils is imported if used below
    # Import the global mock db instance and the MockDatabase class from tests.mock_db
    from tests.mock_db import db as mock_db_instance, MockDatabase

    # --- Start: Clear mock data before test ---
    logger.debug("Clearing mock database collections before test run.")

    # Reset the _collections dictionary directly
    if isinstance(mock_db_instance, MockDatabase): # Add safety check
        mock_db_instance._collections = {}
        logger.debug("Reset mock database collections to empty dictionary.")
    else:
        logger.error(f"patch_database fixture: mock_db_instance is not a MockDatabase instance! Type: {type(mock_db_instance)}")
        # Optionally raise an error here if this state is unexpected and should halt tests
        # raise TypeError("Mock database instance is of unexpected type.")

    # --- End: Clear mock data ---

    # Save the original database references
    original_db = database.db
    original_get_database = database.get_database
    original_utils_db = getattr(utils.db_utils, 'db', None) # Handle if utils.db_utils might not have db

    # Replace with the mock database instance
    database.db = mock_db_instance
    utils.db_utils.db = mock_db_instance

    # Define a mock get_database function
    async def mock_get_database():
        # Return the *same* mock_db_instance used above
        return {"db": mock_db_instance, "client": None}

    # Replace the get_database function
    database.get_database = mock_get_database

    # Create a mock for verify_db_connection to avoid event loop closed errors
    async def mock_verify_db_connection():
        """Mock implementation of verify_db_connection that always returns True."""
        return True

    # Replace verify_db_connection with the mock
    database.verify_db_connection = mock_verify_db_connection

    yield # Test runs here

    # Restore the original database references
    database.db = original_db
    database.get_database = original_get_database
    if original_utils_db is not None:
        utils.db_utils.db = original_utils_db
    else:
        # If it didn't exist before, remove it
        if hasattr(utils.db_utils, 'db'):
             delattr(utils.db_utils, 'db')

# Clear rate limits before and after each test
@pytest.fixture()
async def clear_rate_limits(redis_client: redis.Redis = Depends(get_redis_client)):
    """Clear rate limits before and after test execution using the injected Redis client."""
    logger.info("Clearing rate limits before test...")
    # Use the injected redis_client directly
    keys = await redis_client.keys("rate_limit:*")
    if keys:
        logger.info(f"Found keys to delete: {keys}")
        await redis_client.delete(*keys)
    else:
        logger.info("No rate limit keys found to delete.")

    yield # Test runs here

    logger.info("Clearing rate limits after test...")
    # Re-fetch keys and delete again after the test
    keys_after = await redis_client.keys("rate_limit:*")
    if keys_after:
        logger.info(f"Found keys to delete post-test: {keys_after}")
        await redis_client.delete(*keys_after)
    else:
        logger.info("No rate limit keys found post-test.")
    # Note: The redis_client closing is handled by the get_redis_client dependency's finally block

# Async client fixture for testing
@pytest_asyncio.fixture
async def async_client():
    """Create an async test client WITHOUT authentication overrides."""
    # Create an async client
    # Ensure the base_url reflects the test server setup
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", follow_redirects=True) as ac:
        # Dependency overrides removed - rely on actual auth logic or specific test overrides
        yield ac
        # Clear any potentially remaining overrides from other fixtures/tests if necessary
        app.dependency_overrides.clear()