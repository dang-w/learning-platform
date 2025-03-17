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

# Import the app and auth modules
from main import app
from auth import get_current_user, get_current_active_user, oauth2_scheme, create_access_token, jwt, SECRET_KEY, ALGORITHM
from database import db

@pytest.fixture(scope="session")
def client():
    """
    Create a test client for the FastAPI app.
    """
    # Override the get_current_user dependency for testing
    async def override_get_current_user():
        # Return a mock user
        return {
            "username": "testuser",
            "email": "testuser@example.com",
            "full_name": "Test User",
            "disabled": False,
            "_id": str(ObjectId()),
            "resources": [],
            "study_sessions": [],
            "review_sessions": [],
            "learning_paths": [],
            "reviews": [],
            "concepts": [],
            "goals": [],
            "milestones": []
        }

    # Override the dependency
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as test_client:
        yield test_client

    # Clear the dependency override after tests
    app.dependency_overrides = {}

@pytest_asyncio.fixture(scope="session")
async def test_db():
    """
    Create a test database connection.
    Note: This is now an async fixture to properly handle async operations.
    """
    # Clear the test database before each test
    collections = await db.list_collection_names()
    for collection in collections:
        await db[collection].drop()

    yield db

# Create a mock user class that mimics the behavior of the User model
class MockUser:
    def __init__(self, username="testuser"):
        self.username = username
        self.email = f"{username}@example.com"
        self.full_name = f"{username.capitalize()} User"
        self.disabled = False
        self._id = ObjectId()  # Add a mock _id field
        # Add additional fields that might be needed
        self.resources = []
        self.study_sessions = []
        self.review_sessions = []
        self.learning_paths = []
        self.reviews = []
        self.concepts = []
        self.goals = []
        self.milestones = []

    def model_dump(self):
        """Return a dict representation of the user."""
        return {
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "disabled": self.disabled,
            "resources": self.resources,
            "study_sessions": self.study_sessions,
            "review_sessions": self.review_sessions,
            "learning_paths": self.learning_paths,
            "reviews": self.reviews,
            "concepts": self.concepts,
            "goals": self.goals,
            "milestones": self.milestones
        }

    def dict(self):
        """Alias for model_dump for compatibility."""
        return self.model_dump()

@pytest_asyncio.fixture(scope="session")
async def setup_test_user():
    """Create a test user directly in the database and return a valid token."""
    # Define test user data
    username = "testuser"
    user_data = {
        "username": username,
        "email": f"{username}@example.com",
        "full_name": "Test User",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
        "disabled": False,
        "resources": [],
        "study_sessions": [],
        "review_sessions": [],
        "learning_paths": [],
        "reviews": [],
        "concepts": [],
        "goals": [],
        "milestones": []
    }

    # Check if user already exists and delete if needed
    existing_user = await db.users.find_one({"username": username})
    if existing_user:
        await db.users.delete_one({"_id": existing_user["_id"]})

    # Insert the test user
    await db.users.insert_one(user_data)

    # Verify the user was created
    user = await db.users.find_one({"username": username})
    if not user:
        pytest.fail(f"Failed to create test user {username} in database")

    # Create a token for the test user
    token = create_access_token(data={"sub": username}, expires_delta=timedelta(days=1))

    yield token

    # Clean up after the test
    await db.users.delete_one({"username": username})

@pytest.fixture
def auth_headers():
    """
    Create authentication headers for test requests.
    This fixture doesn't rely on the setup_test_user fixture to avoid async issues.
    """
    # Create a token directly
    token = create_access_token(data={"sub": "testuser"}, expires_delta=timedelta(days=1))
    return {"Authorization": f"Bearer {token}"}