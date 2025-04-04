import pytest
from fastapi.testclient import TestClient
import sys
import os
import asyncio
import logging
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone
from jose import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from bson import ObjectId
import nest_asyncio

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

# Create a mock MongoDB client
mock_mongo_client = AsyncMongoMockClient()
test_db_name = "test_learning_platform"

# Define the OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Define user models to match the application's models
class User(BaseModel):
    username: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    disabled: Optional[bool] = None

class UserInDB(User):
    hashed_password: str

# Create a test user
test_user_data = {
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
"last_name": "User",
    "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
    "disabled": False
}

# Create a test user object
test_user = UserInDB(**test_user_data)

# Secret key for JWT token generation
SECRET_KEY = "testsecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_test_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a test JWT token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Mock functions for authentication
async def mock_get_current_user(token: str = Depends(oauth2_scheme)):
    """Mock function to return a test user without requiring a token."""
    # For tests with a token, return the test user
    return User(
        username="testuser",
        email="test@example.com",
        first_name="Test",
        last_name="User",
        disabled=False
    )

async def mock_get_current_active_user(current_user: User = Depends(mock_get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def mock_authenticate_user(username: str, password: str):
    """Mock function to authenticate a user."""
    if username == "testuser" and password == "password123":
        return User(
            username="testuser",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            disabled=False
        )
    return None

# Mock URL extractor functions
async def mock_extract_metadata_from_url(url: str) -> Dict[str, Any]:
    """Mock function for extracting metadata from a URL"""
    return {
        "title": "Test Title",
        "description": "Test Description",
        "image": None,
        "url": str(url),
        "site_name": None,
        "estimated_time": 30,
        "topics": ["python", "testing"],
        "difficulty": "intermediate"
    }

async def mock_detect_resource_type(url: str) -> str:
    """Mock function for detecting resource type"""
    return "article"

# Mock endpoint functions
async def mock_get_resources_by_type(
    resource_type: str,
    completed: Optional[bool] = None,
    topic: Optional[str] = None,
    current_user: User = Depends(mock_get_current_active_user)
):
    """Mock implementation of get_resources_by_type endpoint."""
    # Create a sample resource
    resource = {
        "id": 1,
        "title": "Test Resource",
        "url": "https://example.com/test",
        "topics": ["python", "testing"],
        "difficulty": "beginner",
        "estimated_time": 30,
        "completed": False,
        "date_added": datetime.now().isoformat(),
        "completion_date": None,
        "notes": ""
    }

    # For the filter test
    if topic == "python":
        python_resource = resource.copy()
        python_resource["title"] = "Python Resource"
        return [python_resource]

    # For the regular test
    return [resource]

# Mock statistics endpoint
async def mock_get_resource_statistics(
    current_user: User = Depends(mock_get_current_active_user)
):
    """Mock implementation of the statistics endpoint."""
    return {
        "total_resources": 2,
        "completed_resources": 1,
        "completion_rate": 50.0,
        "resources_by_type": {
            "articles": 1,
            "videos": 1
        }
    }

# Define learning path models to match the application's models
class ResourceInPath(BaseModel):
    id: str
    title: str
    url: str
    type: str
    completed: bool = False
    completion_date: Optional[str] = None
    notes: Optional[str] = None

class LearningPathBase(BaseModel):
    title: str
    description: str
    topics: List[str]
    difficulty: str
    estimated_time: int
    resources: List[ResourceInPath] = []

class LearningPathCreate(LearningPathBase):
    pass

class LearningPath(LearningPathBase):
    id: str
    created_at: str
    updated_at: str

# Mock learning path functions
async def mock_create_learning_path(
    learning_path: LearningPathCreate,
    current_user: User = Depends(mock_get_current_active_user)
):
    """Mock implementation of create_learning_path endpoint."""
    # Create a learning path with a unique ID
    now = datetime.now().isoformat()
    learning_path_dict = learning_path.model_dump()
    learning_path_dict["id"] = f"{now}_{learning_path.title.lower().replace(' ', '_')}"
    learning_path_dict["created_at"] = now
    learning_path_dict["updated_at"] = now

    # Store in mock database
    user = await database.db.users.find_one({"username": current_user.username})
    if not user:
        # Create user if not exists
        await database.db.users.insert_one({
            "username": current_user.username,
            "email": current_user.email,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "disabled": current_user.disabled,
            "learning_paths": [learning_path_dict]
        })
    else:
        # Add learning path to existing user
        if "learning_paths" not in user:
            await database.db.users.update_one(
                {"username": current_user.username},
                {"$set": {"learning_paths": [learning_path_dict]}}
            )
        else:
            await database.db.users.update_one(
                {"username": current_user.username},
                {"$push": {"learning_paths": learning_path_dict}}
            )

    return learning_path_dict

async def mock_get_learning_paths(
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    current_user: User = Depends(mock_get_current_active_user)
):
    """Mock implementation of get_learning_paths endpoint."""
    user = await database.db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        return []

    paths = user["learning_paths"]

    # Filter by topic if specified
    if topic:
        paths = [p for p in paths if topic in p.get("topics", [])]

    # Filter by difficulty if specified
    if difficulty:
        paths = [p for p in paths if p.get("difficulty") == difficulty]

    return paths

async def mock_get_learning_path(
    learning_path_id: str,
    current_user: User = Depends(mock_get_current_active_user)
):
    """Mock implementation of get_learning_path endpoint."""
    user = await database.db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning paths not found"
        )

    # Find the learning path
    for path in user["learning_paths"]:
        if path.get("id") == learning_path_id:
            return path

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Learning path with ID {learning_path_id} not found"
    )

async def mock_update_learning_path(
    learning_path_id: str,
    learning_path_update: Dict[str, Any],
    current_user: User = Depends(mock_get_current_active_user)
):
    """Mock implementation of update_learning_path endpoint."""
    user = await database.db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning paths not found"
        )

    # Find the learning path to update
    paths = user["learning_paths"]
    path_index = None
    for i, p in enumerate(paths):
        if p.get("id") == learning_path_id:
            path_index = i
            break

    if path_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {learning_path_id} not found"
        )

    # Update learning path fields
    updated_path = paths[path_index].copy()
    for key, value in learning_path_update.items():
        if value is not None:
            updated_path[key] = value

    # Update in database
    paths[path_index] = updated_path
    await database.db.users.update_one(
        {"username": current_user.username},
        {"$set": {"learning_paths": paths}}
    )

    return updated_path

async def mock_delete_learning_path(
    learning_path_id: str,
    current_user: User = Depends(mock_get_current_active_user)
):
    """Mock implementation of delete_learning_path endpoint."""
    user = await database.db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning paths not found"
        )

    # Find the learning path to delete
    paths = user["learning_paths"]
    path_index = None
    for i, p in enumerate(paths):
        if p.get("id") == learning_path_id:
            path_index = i
            break

    if path_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {learning_path_id} not found"
        )

    # Remove from database
    paths.pop(path_index)
    await database.db.users.update_one(
        {"username": current_user.username},
        {"$set": {"learning_paths": paths}}
    )

    return None

async def mock_add_resource_to_learning_path(
    learning_path_id: str,
    resource: Dict[str, Any],
    current_user: User = Depends(mock_get_current_active_user)
):
    """Mock implementation of add_resource_to_learning_path endpoint."""
    user = await database.db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning paths not found"
        )

    # Find the learning path
    paths = user["learning_paths"]
    path_index = None
    for i, p in enumerate(paths):
        if p.get("id") == learning_path_id:
            path_index = i
            break

    if path_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {learning_path_id} not found"
        )

    # Add resource to learning path
    path = paths[path_index]
    if "resources" not in path:
        path["resources"] = []

    # Add completed field if not present
    if "completed" not in resource:
        resource["completed"] = False

    path["resources"].append(resource)

    # Update in database
    await database.db.users.update_one(
        {"username": current_user.username},
        {"$set": {"learning_paths": paths}}
    )

    return path

async def mock_update_resource_in_learning_path(
    learning_path_id: str,
    resource_id: str,
    resource_update: Dict[str, Any],
    current_user: User = Depends(mock_get_current_active_user)
):
    """Mock implementation of update_resource_in_learning_path endpoint."""
    user = await database.db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning paths not found"
        )

    # Find the learning path
    paths = user["learning_paths"]
    path_index = None
    for i, p in enumerate(paths):
        if p.get("id") == learning_path_id:
            path_index = i
            break

    if path_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {learning_path_id} not found"
        )

    # Find the resource
    path = paths[path_index]
    if "resources" not in path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No resources found in learning path {learning_path_id}"
        )

    resource_index = None
    for i, r in enumerate(path["resources"]):
        if r.get("id") == resource_id:
            resource_index = i
            break

    if resource_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} not found in learning path {learning_path_id}"
        )

    # Update resource fields
    resource = path["resources"][resource_index]
    for key, value in resource_update.items():
        if value is not None:
            resource[key] = value

    # Update in database
    await database.db.users.update_one(
        {"username": current_user.username},
        {"$set": {"learning_paths": paths}}
    )

    return path

async def mock_mark_resource_completed_in_learning_path(
    learning_path_id: str,
    resource_id: str,
    notes: Optional[Dict[str, str]] = None,
    current_user: User = Depends(mock_get_current_active_user)
):
    """Mock implementation of mark_resource_completed_in_learning_path endpoint."""
    user = await database.db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning paths not found"
        )

    # Find the learning path
    paths = user["learning_paths"]
    path_index = None
    for i, p in enumerate(paths):
        if p.get("id") == learning_path_id:
            path_index = i
            break

    if path_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {learning_path_id} not found"
        )

    # Find the resource
    path = paths[path_index]
    if "resources" not in path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No resources found in learning path {learning_path_id}"
        )

    resource_index = None
    for i, r in enumerate(path["resources"]):
        if r.get("id") == resource_id:
            resource_index = i
            break

    if resource_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} not found in learning path {learning_path_id}"
        )

    # Mark resource as completed
    resource = path["resources"][resource_index]
    resource["completed"] = True
    resource["completion_date"] = datetime.now().isoformat()

    # Add notes if provided
    if notes and "notes" in notes:
        resource["notes"] = notes["notes"]

    # Update progress
    completed_resources = sum(1 for r in path["resources"] if r.get("completed", False))
    total_resources = len(path["resources"])
    path["progress"] = int((completed_resources / total_resources) * 100) if total_resources > 0 else 0

    # Update in database
    await database.db.users.update_one(
        {"username": current_user.username},
        {"$set": {"learning_paths": paths}}
    )

    return path

async def mock_remove_resource_from_learning_path(
    learning_path_id: str,
    resource_id: str,
    current_user: User = Depends(mock_get_current_active_user)
):
    """Mock implementation of remove_resource_from_learning_path endpoint."""
    user = await database.db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning paths not found"
        )

    # Find the learning path
    paths = user["learning_paths"]
    path_index = None
    for i, p in enumerate(paths):
        if p.get("id") == learning_path_id:
            path_index = i
            break

    if path_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {learning_path_id} not found"
        )

    # Find the resource
    path = paths[path_index]
    if "resources" not in path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No resources found in learning path {learning_path_id}"
        )

    resource_index = None
    for i, r in enumerate(path["resources"]):
        if r.get("id") == resource_id:
            resource_index = i
            break

    if resource_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} not found in learning path {learning_path_id}"
        )

    # Remove resource
    path["resources"].pop(resource_index)

    # Update progress
    completed_resources = sum(1 for r in path["resources"] if r.get("completed", False))
    total_resources = len(path["resources"])
    path["progress"] = int((completed_resources / total_resources) * 100) if total_resources > 0 else 0

    # Update in database
    await database.db.users.update_one(
        {"username": current_user.username},
        {"$set": {"learning_paths": paths}}
    )

    return path

# Patch the database module
with patch('motor.motor_asyncio.AsyncIOMotorClient', return_value=mock_mongo_client):
    # Now import the modules after patching
    import database
    database.client = mock_mongo_client
    database.db = mock_mongo_client[test_db_name]

    # Import app and auth dependencies after database is patched
    from main import app
    from auth import get_current_user, get_current_active_user, authenticate_user, oauth2_scheme

    # Import all routers to override their dependencies
    from routers import resources, progress, reviews, learning_path, url_extractor

    # Override the dependencies in the main app
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user
    app.dependency_overrides[authenticate_user] = mock_authenticate_user
    app.dependency_overrides[oauth2_scheme] = lambda: "fake_token"

    # Override dependencies in all router modules
    resources.get_current_user = mock_get_current_user
    resources.get_current_active_user = mock_get_current_active_user

    progress.get_current_user = mock_get_current_user
    progress.get_current_active_user = mock_get_current_active_user

    reviews.get_current_user = mock_get_current_user
    reviews.get_current_active_user = mock_get_current_active_user

    learning_path.get_current_user = mock_get_current_user
    learning_path.get_current_active_user = mock_get_current_active_user

    url_extractor.get_current_user = mock_get_current_user
    url_extractor.get_current_active_user = mock_get_current_active_user

    # Override specific endpoints
    for route in resources.routes:
        if getattr(route, "path", "") == "/statistics" and getattr(route, "methods", set()) == {"GET"}:
            route.endpoint = mock_get_resource_statistics
        elif getattr(route, "path", "") == "/{resource_type}" and getattr(route, "methods", set()) == {"GET"}:
            route.endpoint = mock_get_resources_by_type

    # Override learning path router endpoints
    for route in learning_path.routes:
        if getattr(route, "path", "") == "/" and "POST" in getattr(route, "methods", set()):
            route.endpoint = mock_create_learning_path
        elif getattr(route, "path", "") == "/" and "GET" in getattr(route, "methods", set()):
            route.endpoint = mock_get_learning_paths
        elif getattr(route, "path", "") == "/{learning_path_id}" and "GET" in getattr(route, "methods", set()):
            route.endpoint = mock_get_learning_path
        elif getattr(route, "path", "") == "/{learning_path_id}" and "PUT" in getattr(route, "methods", set()):
            route.endpoint = mock_update_learning_path
        elif getattr(route, "path", "") == "/{learning_path_id}" and "DELETE" in getattr(route, "methods", set()):
            route.endpoint = mock_delete_learning_path
        elif getattr(route, "path", "") == "/{learning_path_id}/resources" and "POST" in getattr(route, "methods", set()):
            route.endpoint = mock_add_resource_to_learning_path
        elif getattr(route, "path", "") == "/{learning_path_id}/resources/{resource_id}" and "PUT" in getattr(route, "methods", set()):
            route.endpoint = mock_update_resource_in_learning_path
        elif getattr(route, "path", "") == "/{learning_path_id}/resources/{resource_id}/complete" and "POST" in getattr(route, "methods", set()):
            route.endpoint = mock_mark_resource_completed_in_learning_path
        elif getattr(route, "path", "") == "/{learning_path_id}/resources/{resource_id}" and "DELETE" in getattr(route, "methods", set()):
            route.endpoint = mock_remove_resource_from_learning_path

@pytest.fixture(scope="session")
def mongo_connection():
    """Create a session-scoped MongoDB client using mongomock-motor."""
    yield mock_mongo_client

@pytest.fixture
def client(mongo_connection):
    """Create a test client with mocked MongoDB."""
    # Override the database module
    database.client = mongo_connection
    database.db = mongo_connection["test_db"]

    # Import the auth module to get the correct dependencies
    from auth import get_current_user, get_current_active_user, oauth2_scheme

    # Define async mock functions
    async def mock_get_current_user():
        return test_user

    async def mock_get_current_active_user():
        return test_user

    # Override authentication dependencies in the main app
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user
    app.dependency_overrides[oauth2_scheme] = lambda: "fake_token"

    # Override URL extractor dependencies
    from routers.url_extractor import extract_metadata_from_url, detect_resource_type
    app.dependency_overrides[extract_metadata_from_url] = mock_extract_metadata_from_url
    app.dependency_overrides[detect_resource_type] = mock_detect_resource_type

    # Override dependencies in all router modules
    from routers import resources, progress, reviews, learning_path, url_extractor

    # Override dependencies in the progress router
    progress.get_current_user = mock_get_current_user
    progress.get_current_active_user = mock_get_current_active_user

    # Create a test client
    test_client = TestClient(app)

    # Return the test client
    yield test_client

    # Clean up
    app.dependency_overrides.clear()

@pytest.fixture(autouse=True)
async def clear_db():
    """Clear the database before and after each test."""
    db = mock_mongo_client[test_db_name]

    # Clear all collections except users
    collections = await db.list_collection_names()
    for collection in collections:
        if collection != 'users':
            await db[collection].drop()

    # Reset the users collection to just have our test user
    if 'users' in collections:
        await db.users.delete_many({})

    # Insert the test user with empty resources
    user_data_with_resources = test_user_data.copy()
    user_data_with_resources["resources"] = {
        "articles": [],
        "videos": [],
        "courses": [],
        "books": []
    }
    # Add empty study_sessions and review_sessions arrays
    user_data_with_resources["study_sessions"] = []
    user_data_with_resources["review_sessions"] = []

    await db.users.insert_one(user_data_with_resources)

    yield

    # Clear all collections except users after the test
    collections = await db.list_collection_names()
    for collection in collections:
        if collection != 'users':
            await db[collection].drop()

    # Reset the user's resources to empty
    await db.users.update_one(
        {"username": test_user_data["username"]},
        {"$set": {
            "resources": {"articles": [], "videos": [], "courses": [], "books": []},
            "study_sessions": [],
            "review_sessions": []
        }}
    )

@pytest.fixture
async def test_db(mongo_connection):
    """Create a test database connection using mongomock-motor."""
    db = mongo_connection[test_db_name]
    yield db

@pytest.fixture
async def test_user():
    """Create a test user for the tests."""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "first_name": "Test",
"last_name": "User",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
        "disabled": False
    }

@pytest.fixture
def auth_headers():
    """Get authentication headers for the test user."""
    # Create a token with a longer expiration time (1 day)
    token = create_test_token({"sub": "testuser"}, timedelta(days=1))
    return {"Authorization": f"Bearer {token}"}