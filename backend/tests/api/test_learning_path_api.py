import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime, timedelta
from main import app
from auth import User, get_current_user, get_current_active_user, oauth2_scheme

# Import standardized utilities
from utils.error_handlers import AuthenticationError, ResourceNotFoundError

# Import the MockUser class from conftest
from tests.conftest import MockUser

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    # Clear any existing overrides
    app.dependency_overrides.clear()

    yield

    # Clear overrides after the test
    app.dependency_overrides.clear()

# Test data
test_goal_data = {
    "_id": "test_goal_id",
    "title": "Test Goal",
    "description": "Test Description",
    "target_date": datetime.now() + timedelta(days=30),
    "created_at": datetime.now(),
    "updated_at": datetime.now(),
    "status": "in_progress",
    "milestones": []
}

# Test data for milestones
test_milestone_data = {
    "_id": "test_milestone_id",
    "title": "Test Milestone",
    "description": "Test Description",
    "target_date": datetime.now() + timedelta(days=15),
    "created_at": datetime.now(),
    "updated_at": datetime.now(),
    "status": "not_started",
    "goal_id": "test_goal_id"
}

# Test data for user
test_user_data = {
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
"last_name": "User",
    "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
    "disabled": False,
    "goals": []
}

@pytest.fixture
def mock_auth_dependencies():
    """
    Override dependencies for authentication in tests.
    This fixture should be explicitly requested in tests that need authentication mocking.
    """
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    yield

    # Clear the dependency overrides after the test
    app.dependency_overrides.clear()

def test_get_goals(client, auth_headers):
    """Test getting all goals."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create test goals
    goals = [
        {
            "id": "goal1",
            "title": "Learn Python",
            "description": "Master Python programming",
            "target_date": str(datetime.now() + timedelta(days=30)),
            "priority": 5,
            "category": "Programming",
            "completed": False,
            "completion_date": None,
            "notes": ""
        },
        {
            "id": "goal2",
            "title": "Learn FastAPI",
            "description": "Master FastAPI framework",
            "target_date": str(datetime.now() + timedelta(days=60)),
            "priority": 4,
            "category": "Web Development",
            "completed": False,
            "completion_date": None,
            "notes": ""
        }
    ]

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "goals": goals
    }

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.learning_path.db', mock_db):
        response = client.get("/api/learning-path/goals", headers=auth_headers)

        assert response.status_code == 200
        goals_data = response.json()
        assert len(goals_data) == 2
        assert goals_data[0]["title"] == "Learn Python"
        assert goals_data[1]["title"] == "Learn FastAPI"

def test_create_goal(client, auth_headers):
    """Test creating a new goal."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # New goal data
    new_goal = {
        "title": "New Goal",
        "description": "New Goal Description",
        "target_date": datetime.now().strftime("%Y-%m-%d"),
        "priority": 5,
        "category": "New Category"
    }

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "goals": []
    }

    # Create a mock for the update_one method
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.learning_path.db', mock_db):
        response = client.post("/api/learning-path/goals", json=new_goal, headers=auth_headers)

        assert response.status_code == 201
        created_goal = response.json()
        assert created_goal["title"] == "New Goal"
        assert created_goal["description"] == "New Goal Description"
        assert "id" in created_goal

def test_create_goals_batch(client, auth_headers):
    """Test creating multiple goals in a batch."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "goals": []
    }

    # Create a mock for the update_one method
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Get tomorrow's date for the target dates
    tomorrow = datetime.now() + timedelta(days=1)
    target_date = tomorrow.strftime("%Y-%m-%d")

    # Mock the ObjectId for predictable IDs in tests
    mock_object_id = MagicMock()
    mock_object_id.return_value = "mock_object_id"

    # Test data
    batch_goals = {
        "goals": [
            {
                "title": "Learn Python",
                "description": "Master Python programming",
                "target_date": target_date,
                "priority": 5,
                "category": "Programming"
            },
            {
                "title": "Learn FastAPI",
                "description": "Build RESTful APIs with FastAPI",
                "target_date": target_date,
                "priority": 4,
                "category": "Programming"
            }
        ]
    }

    # Mock the database operations
    with patch('routers.learning_path.db', mock_db), \
         patch('routers.learning_path.ObjectId', return_value=mock_object_id), \
         patch('routers.learning_path.datetime') as mock_datetime:

        # Mock datetime to return a fixed value
        mock_now = datetime(2024, 3, 1, 12, 0, 0)
        mock_datetime.now.return_value = mock_now
        mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)

        response = client.post("/api/learning-path/goals/batch", json=batch_goals, headers=auth_headers)

        # Verify the response
        assert response.status_code == 201
        data = response.json()

        assert "success" in data
        assert "errors" in data
        assert len(data["success"]) == 2

        # Verify first goal
        assert data["success"][0]["title"] == "Learn Python"
        assert data["success"][0]["priority"] == 5

        # Verify second goal
        assert data["success"][1]["title"] == "Learn FastAPI"
        assert data["success"][1]["priority"] == 4

        # Verify no errors
        assert len(data["errors"]) == 0

def test_get_goal_by_id(client, auth_headers):
    """Test getting a goal by ID."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create a test goal
    goal_id = "goal1"
    goal = {
        "id": goal_id,
        "title": "Learn Python",
        "description": "Master Python programming",
        "target_date": str(datetime.now() + timedelta(days=30)),
        "priority": 5,
        "category": "Programming",
        "completed": False,
        "completion_date": None,
        "notes": ""
    }

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "goals": [goal]
    }

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.learning_path.db', mock_db):
        response = client.get(f"/api/learning-path/goals/{goal_id}", headers=auth_headers)

        assert response.status_code == 200
        goal_data = response.json()
        assert goal_data["id"] == goal_id
        assert goal_data["title"] == "Learn Python"
        assert goal_data["description"] == "Master Python programming"

def test_update_goal(client, auth_headers):
    """Test updating a goal."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Updated goal data
    updated_goal = {
        "title": "Updated Goal",
        "description": "Updated Description",
        "target_date": datetime.now().strftime("%Y-%m-%d"),
        "priority": 6,
        "category": "Updated Category"
    }

    # Create a test goal
    goal_id = "goal1"
    goal = {
        "id": goal_id,
        "title": "Learn Python",
        "description": "Master Python programming",
        "target_date": str(datetime.now() + timedelta(days=30)),
        "priority": 5,
        "category": "Programming",
        "completed": False,
        "completion_date": None,
        "notes": ""
    }

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "goals": [goal]
    }

    # Create a mock for the update_one method
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.learning_path.db', mock_db):
        response = client.put(f"/api/learning-path/goals/{goal_id}", json=updated_goal, headers=auth_headers)

        assert response.status_code == 200
        updated_goal_response = response.json()
        assert updated_goal_response["title"] == "Updated Goal"
        assert updated_goal_response["description"] == "Updated Description"
        assert updated_goal_response["priority"] == 6
        assert updated_goal_response["category"] == "Updated Category"

def test_delete_goal(client, auth_headers):
    """Test deleting a goal."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create a test goal
    goal_id = "goal1"
    goal = {
        "id": goal_id,
        "title": "Learn Python",
        "description": "Master Python programming",
        "target_date": str(datetime.now() + timedelta(days=30)),
        "priority": 5,
        "category": "Programming",
        "completed": False,
        "completion_date": None,
        "notes": ""
    }

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "goals": [goal]
    }

    # Create a mock for the update_one method
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.learning_path.db', mock_db):
        response = client.delete(f"/api/learning-path/goals/{goal_id}", headers=auth_headers)

        assert response.status_code == 204

def test_get_milestones(client, auth_headers):
    """Test getting all milestones."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create test milestones
    milestones = [
        {
            "id": "milestone1",
            "title": "Learn Basic Syntax",
            "description": "Master Python basic syntax",
            "target_date": str(datetime.now() + timedelta(days=10)),
            "verification_method": "Quiz",
            "resources": ["resource1", "resource2"],
            "completed": True,
            "completion_date": str(datetime.now() - timedelta(days=1)),
            "notes": "Completed successfully"
        },
        {
            "id": "milestone2",
            "title": "Learn OOP",
            "description": "Master Python OOP concepts",
            "target_date": str(datetime.now() + timedelta(days=20)),
            "verification_method": "Project",
            "resources": ["resource3"],
            "completed": False,
            "completion_date": None,
            "notes": ""
        }
    ]

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "milestones": milestones
    }

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.learning_path.db', mock_db):
        response = client.get("/api/learning-path/milestones", headers=auth_headers)

        assert response.status_code == 200
        milestones_data = response.json()
        assert len(milestones_data) == 2

        # Check that both expected milestones are in the response, regardless of order
        milestone_titles = [m["title"] for m in milestones_data]
        assert "Learn Basic Syntax" in milestone_titles
        assert "Learn OOP" in milestone_titles

def test_create_milestone(client, auth_headers):
    """Test creating a new milestone."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # New milestone data
    new_milestone = {
        "title": "New Milestone",
        "description": "New Milestone Description",
        "target_date": datetime.now().strftime("%Y-%m-%d"),
        "verification_method": "Quiz",
        "resources": ["resource1", "resource2"]
    }

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "milestones": []
    }

    # Create a mock for the update_one method
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.learning_path.db', mock_db):
        response = client.post("/api/learning-path/milestones", json=new_milestone, headers=auth_headers)

        assert response.status_code == 201
        created_milestone = response.json()
        assert created_milestone["title"] == "New Milestone"
        assert created_milestone["description"] == "New Milestone Description"
        assert "id" in created_milestone

def test_update_milestone(client, auth_headers):
    """Test updating a milestone."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Updated milestone data
    updated_milestone = {
        "title": "Updated Milestone",
        "description": "Updated Description",
        "target_date": datetime.now().strftime("%Y-%m-%d"),
        "verification_method": "Project",
        "resources": ["resource1", "resource2", "resource3"],
        "completed": True,
        "notes": "Updated notes"
    }

    # Create a test milestone
    milestone_id = "milestone1"
    milestone = {
        "id": milestone_id,
        "title": "Learn Basic Syntax",
        "description": "Master Python basic syntax",
        "target_date": str(datetime.now() + timedelta(days=10)),
        "verification_method": "Quiz",
        "resources": ["resource1", "resource2"],
        "completed": False,
        "completion_date": None,
        "notes": ""
    }

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "milestones": [milestone]
    }

    # Create a mock for the update_one method
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.learning_path.db', mock_db):
        response = client.put(f"/api/learning-path/milestones/{milestone_id}", json=updated_milestone, headers=auth_headers)

        assert response.status_code == 200
        updated_milestone_response = response.json()
        assert updated_milestone_response["title"] == "Updated Milestone"
        assert updated_milestone_response["description"] == "Updated Description"
        assert updated_milestone_response["verification_method"] == "Project"
        assert len(updated_milestone_response["resources"]) == 3
        assert updated_milestone_response["completed"] == True
        assert updated_milestone_response["notes"] == "Updated notes"

def test_delete_milestone(client, auth_headers):
    """Test deleting a milestone."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create a test milestone
    milestone_id = "milestone1"
    milestone = {
        "id": milestone_id,
        "title": "Learn Basic Syntax",
        "description": "Master Python basic syntax",
        "target_date": str(datetime.now() + timedelta(days=10)),
        "verification_method": "Quiz",
        "resources": ["resource1", "resource2"],
        "completed": False,
        "completion_date": None,
        "notes": ""
    }

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "milestones": [milestone]
    }

    # Create a mock for the update_one method
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.learning_path.db', mock_db):
        response = client.delete(f"/api/learning-path/milestones/{milestone_id}", headers=auth_headers)

        assert response.status_code == 204

def test_get_learning_path_progress(client, auth_headers):
    """Test getting learning path progress."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Create test goals and milestones
    goals = [
        {
            "id": "goal1",
            "title": "Learn Python",
            "description": "Master Python programming",
            "target_date": str(datetime.now() + timedelta(days=30)),
            "priority": 5,
            "category": "Programming",
            "completed": False,
            "completion_date": None,
            "notes": "",
            "progress": 50,
            "progress_history": [
                {
                    "date": str(datetime.now() - timedelta(days=5)),
                    "progress": 25
                },
                {
                    "date": str(datetime.now() - timedelta(days=2)),
                    "progress": 50
                }
            ]
        },
        {
            "id": "goal2",
            "title": "Learn FastAPI",
            "description": "Master FastAPI framework",
            "target_date": str(datetime.now() + timedelta(days=60)),
            "priority": 4,
            "category": "Web Development",
            "completed": False,
            "completion_date": None,
            "notes": "",
            "progress": 0,
            "progress_history": []
        }
    ]

    milestones = [
        {
            "id": "milestone1",
            "title": "Learn Basic Syntax",
            "description": "Master Python basic syntax",
            "target_date": str(datetime.now() + timedelta(days=10)),
            "verification_method": "Quiz",
            "resources": ["resource1", "resource2"],
            "completed": True,
            "completion_date": str(datetime.now() - timedelta(days=1)),
            "notes": "Completed successfully"
        },
        {
            "id": "milestone2",
            "title": "Learn OOP",
            "description": "Master Python OOP concepts",
            "target_date": str(datetime.now() + timedelta(days=20)),
            "verification_method": "Project",
            "resources": ["resource3"],
            "completed": False,
            "completion_date": None,
            "notes": ""
        }
    ]

    # Create a mock for the find_one method
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "goals": goals,
        "milestones": milestones
    }

    # Create a mock for the users collection
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one

    # Create a mock for the db
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Mock the database operations
    with patch('routers.learning_path.db', mock_db):
        response = client.get("/api/learning-path/progress", headers=auth_headers)

        assert response.status_code == 200
        progress = response.json()

        # Check for the expected fields in the response
        assert "overall_progress" in progress
        assert "completed_goals" in progress
        assert "total_goals" in progress
        assert "completed_milestones" in progress
        assert "total_milestones" in progress

        # Verify the counts
        assert progress["total_goals"] == 2
        assert progress["completed_goals"] == 0
        assert progress["total_milestones"] == 2
        assert progress["completed_milestones"] == 1