import pytest
from fastapi.testclient import TestClient
import sys
import os
import asyncio
import logging
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timedelta
from jose import jwt
from fastapi import Depends, HTTPException, status

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the parent directory to the path so we can import main
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

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
from main import app, db, get_user, authenticate_user, UserInDB, verify_password, get_password_hash, get_current_user
from main import SECRET_KEY, ALGORITHM, get_current_active_user, oauth2_scheme

# Create a mock MongoDB client
mock_mongo_client = AsyncMongoMockClient()
test_db_name = "test_learning_platform"

# Override the db with our mock db
db = mock_mongo_client.learning_platform_db

# Create a mock user for testing
async def mock_get_current_user(token: str = Depends(oauth2_scheme)):
    # This will raise an HTTPException with 401 status code when no token is provided
    # which is the expected behavior for the test_get_current_user_without_token test
    return UserInDB(
        username="testuser",
        email="test@example.com",
        full_name="Test User",
        hashed_password=get_password_hash("password123"),
        disabled=False
    )

async def mock_get_current_active_user(current_user: UserInDB = Depends(mock_get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Override the dependencies
app.dependency_overrides[get_current_user] = mock_get_current_user
app.dependency_overrides[get_current_active_user] = mock_get_current_active_user

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
    # Use the real password hashing function
    hashed_password = get_password_hash("password123")

    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "hashed_password": hashed_password,
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

# Create a valid token for testing
def create_test_token(username: str = "testuser"):
    expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode = {"sub": username, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@pytest.fixture
def auth_headers():
    """
    Create authentication headers with a valid token.
    This is a synchronous fixture that doesn't depend on the database.
    """
    token = create_test_token()
    return {"Authorization": f"Bearer {token}"}

# Mock the authenticate_user function
original_authenticate_user = authenticate_user
async def mock_authenticate_user(username: str, password: str):
    if username == "testuser" and password == "password123":
        return UserInDB(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            hashed_password=get_password_hash("password123"),
            disabled=False
        )
    return False

# Apply the patch for authenticate_user
patch('main.authenticate_user', mock_authenticate_user).start()