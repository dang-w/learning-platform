import pytest
import asyncio
from fastapi.testclient import TestClient
from fastapi import Depends
from bson import ObjectId
import mongomock
import mongomock_motor
from datetime import datetime, timedelta
from typing import Generator, Dict, Any, AsyncGenerator
import sys
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the parent directory to the path so we can import main
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import mongomock_motor before importing the app
from unittest.mock import patch
from mongomock_motor import AsyncMongoMockClient

# Import your application
from main import app, get_db, get_current_user, create_access_token, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# Create a mock MongoDB client
mock_client = mongomock_motor.AsyncMongoMockClient()
mock_db = mock_client.learning_platform_db

# Create a test user
TEST_USER_EMAIL = "test@example.com"
TEST_USER_USERNAME = "testuser"
TEST_USER_PASSWORD = "password123"
TEST_USER_ID = str(ObjectId())

# Override the get_db dependency
async def override_get_db():
    try:
        yield mock_db
    finally:
        pass

# Override the get_current_user dependency
async def override_get_current_user():
    return {
        "username": TEST_USER_USERNAME,
        "email": TEST_USER_EMAIL,
        "first_name": "Test",
"last_name": "User",
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

# Create a pytest fixture for the event loop
@pytest.fixture(scope="function")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

# Create a pytest fixture for the test client
@pytest.fixture(scope="function")
async def client():
    # Override the dependencies
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    # Create a test client
    with TestClient(app) as test_client:
        yield test_client

    # Clean up
    app.dependency_overrides = {}

# Create a pytest fixture for the test database
@pytest.fixture(scope="function")
async def test_db():
    # Clear all collections before each test
    collections = await mock_db.list_collection_names()
    for collection in collections:
        await mock_db[collection].delete_many({})

    # Create a test user in the database
    await mock_db.users.insert_one({
        "_id": ObjectId(TEST_USER_ID),
        "username": TEST_USER_USERNAME,
        "email": TEST_USER_EMAIL,
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
    })

    yield mock_db

    # Clear all collections after each test
    collections = await mock_db.list_collection_names()
    for collection in collections:
        await mock_db[collection].delete_many({})

# Create a pytest fixture for authentication headers
@pytest.fixture(scope="function")
async def auth_headers():
    # Create an access token
    access_token = create_access_token(
        data={"sub": TEST_USER_USERNAME},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    # Return the headers
    return {"Authorization": f"Bearer {access_token}"}