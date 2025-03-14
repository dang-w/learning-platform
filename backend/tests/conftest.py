import pytest
from fastapi.testclient import TestClient
from main import app
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@pytest.fixture
def client():
    """
    Create a test client for the FastAPI app.
    """
    return TestClient(app)

@pytest.fixture
def test_db():
    """
    Create a test database connection.
    """
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    client = MongoClient(mongo_uri)
    db = client.get_database("test_learning_platform")

    # Clear the test database before each test
    for collection in db.list_collection_names():
        db[collection].drop()

    yield db

    # Clean up after tests
    for collection in db.list_collection_names():
        db[collection].drop()
    client.close()

@pytest.fixture
def test_user(test_db):
    """
    Create a test user in the database.
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

    test_db.users.insert_one(user_data)
    return user_data

@pytest.fixture
def auth_headers(client, test_user):
    """
    Get authentication headers for the test user.
    """
    response = client.post(
        "/token",
        data={"username": test_user["username"], "password": "password123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}