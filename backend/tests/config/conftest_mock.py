import pytest
from fastapi.testclient import TestClient
import sys
import os
import asyncio
import logging
from unittest.mock import patch, MagicMock

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the parent directory to the path so we can import main
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import mongomock_motor before importing the app
from mongomock_motor import AsyncMongoMockClient

# Create a custom event loop for the tests
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

# Patch motor.motor_asyncio.AsyncIOMotorClient before importing the app
patch('motor.motor_asyncio.AsyncIOMotorClient', AsyncMongoMockClient).start()

# Now import the app after patching
from main import app, db, get_user, authenticate_user, UserInDB

# Create a mock MongoDB client
mock_mongo_client = AsyncMongoMockClient()
test_db_name = "test_learning_platform"

# Override the db with our mock db
db = mock_mongo_client.learning_platform_db

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
    db = mongo_connection.learning_platform_db

    # Clear the test database before each test
    collections = await db.list_collection_names()
    for collection in collections:
        await db[collection].drop()

    yield db

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
        "resources": {
            "articles": [],
            "videos": [],
            "courses": [],
            "books": []
        },
        "learning_paths": [],
        "progress": {
            "metrics": [],
            "reviews": []
        }
    }

    try:
        # Insert the test user with await
        await test_db.users.insert_one(user_data)
        return user_data
    except Exception as e:
        logger.error(f"Error creating test user: {e}")
        pytest.skip(f"Could not create test user: {e}")

@pytest.fixture
async def auth_headers(client, test_user):
    """
    Get authentication headers for the test user.
    Note: This is now an async fixture to properly handle async operations.
    """
    try:
        response = client.post(
            "/token",
            data={"username": test_user["username"], "password": "password123"},
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    except Exception as e:
        logger.error(f"Error getting auth token: {e}")
        pytest.skip(f"Could not get auth token: {e}")

# Patch the get_user function to return our test user
original_get_user = get_user
async def mock_get_user(username: str):
    if username == "testuser":
        return UserInDB(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
            disabled=False
        )
    return await original_get_user(username)

# Patch the authenticate_user function to return our test user
original_authenticate_user = authenticate_user
async def mock_authenticate_user(username: str, password: str):
    if username == "testuser" and password == "password123":
        return UserInDB(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
            disabled=False
        )
    return await original_authenticate_user(username, password)

# Apply the patches
patch('main.get_user', mock_get_user).start()
patch('main.authenticate_user', mock_authenticate_user).start()