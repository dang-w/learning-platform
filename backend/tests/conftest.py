import pytest
from fastapi.testclient import TestClient
import sys
import os
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the parent directory to the path so we can import main
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import mongomock_motor before importing the app
from unittest.mock import patch, MagicMock
from mongomock_motor import AsyncMongoMockClient

# Create a custom event loop for the tests
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

# Create a mock MongoDB client
mock_mongo_client = AsyncMongoMockClient()
test_db_name = "test_learning_platform"

# Patch the database module
with patch('motor.motor_asyncio.AsyncIOMotorClient', return_value=mock_mongo_client):
    # Now import the modules after patching
    import database
    database.client = mock_mongo_client
    database.db = mock_mongo_client[test_db_name]

    # Import app after database is patched
    from main import app
    from auth import get_current_user, get_current_active_user, oauth2_scheme, create_access_token

@pytest.fixture(scope="session")
def mongo_connection():
    """
    Create a session-scoped MongoDB client using mongomock-motor.
    """
    yield mock_mongo_client

@pytest.fixture
def client():
    """
    Create a test client for the FastAPI app.
    """
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
async def test_db(mongo_connection):
    """
    Create a test database connection using mongomock-motor.
    Note: This is now an async fixture to properly handle async operations.
    """
    db = mongo_connection[test_db_name]

    # Clear the test database before each test
    collections = await db.list_collection_names()
    for collection in collections:
        await db[collection].drop()

    yield db

    # Clear the test database after each test
    collections = await db.list_collection_names()
    for collection in collections:
        await db[collection].drop()

@pytest.fixture
async def test_user(test_db):
    """
    Create a test user in the database.
    Note: This is now an async fixture to properly handle async operations.
    """
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
        "disabled": False,
        "resources": [],
        "study_sessions": [],
        "review_sessions": [],
        "learning_paths": [],
        "reviews": [],
        "concepts": []
    }

    try:
        # Insert the test user with await
        await test_db.users.insert_one(user_data)
        return user_data
    except Exception as e:
        logger.error(f"Error creating test user: {e}")
        pytest.skip(f"Could not create test user: {e}")

# Create a mock user class that mimics the behavior of the User model
class MockUser:
    def __init__(self):
        self.username = "testuser"
        self.email = "test@example.com"
        self.full_name = "Test User"
        self.disabled = False

    def model_dump(self):
        return {
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "disabled": self.disabled
        }

    # Keep dict method for backward compatibility but make it call model_dump
    def dict(self):
        return self.model_dump()

@pytest.fixture
def auth_headers():
    """
    Create authentication headers with a valid token.
    """
    try:
        # Create a token directly using the create_access_token function
        token = create_access_token(data={"sub": "testuser"})
        return {"Authorization": f"Bearer {token}"}
    except Exception as e:
        logger.error(f"Error creating auth token: {e}")
        return None

# Setup dependency overrides for authentication
@pytest.fixture
def mock_auth_dependencies():
    """
    Override dependencies for authentication in tests.
    This fixture should be explicitly requested in tests that need authentication mocking.
    """
    # Create a mock user
    mock_user = MockUser()

    # Define mock functions
    async def mock_get_current_user():
        return mock_user

    async def mock_get_current_active_user():
        return mock_user

    # Set up the dependency overrides
    app.dependency_overrides[oauth2_scheme] = lambda: "test_token"
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user

    yield

    # Clear the dependency overrides after the test
    app.dependency_overrides.clear()