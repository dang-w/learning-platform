import pytest
import pytest_asyncio
from unittest.mock import patch, MagicMock, AsyncMock, ANY
from httpx import AsyncClient, Headers
from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime, timedelta
from main import app
from auth import User, get_current_user, get_current_active_user, oauth2_scheme
from database import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict

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

@pytest_asyncio.fixture
async def mock_auth_dependencies():
    """
    Override dependencies for authentication in tests.
    This fixture should be explicitly requested in tests that need authentication mocking.
    """
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with appropriate async/sync functions
    # Assuming get_current_user and get_current_active_user are async
    async def get_mock_user(): return mock_user
    async def get_mock_active_user(): return mock_user

    app.dependency_overrides[get_current_user] = get_mock_user
    app.dependency_overrides[get_current_active_user] = get_mock_active_user

    yield

    # Clear only the specific dependency overrides set by this fixture
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_active_user, None)

@pytest.mark.asyncio
async def test_get_goals(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test getting all goals."""
    # mock_auth_dependencies fixture handles auth mocking

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

    # --- Corrected Mock Setup ---
    # Create an AsyncMock for the find_one method
    mock_find_one = AsyncMock()
    # Set the return value for the find_one call
    mock_find_one.return_value = {
        "username": "testuser",
        "goals": goals
    }

    # Create a mock for the users collection
    mock_users = MagicMock() # Collection itself can be MagicMock
    # Assign the AsyncMock to the find_one attribute
    mock_users.find_one = mock_find_one

    # Create a mock for the db object
    mock_db = MagicMock()
    mock_db.users = mock_users # Assign the collection mock
    # --- End Corrected Mock Setup ---

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    # Mock the database operations
    response = await async_client.get("/api/learning-path/goals", headers=auth_headers)

    assert response.status_code == 200
    goals_data = response.json()
    assert len(goals_data) == 2
    assert goals_data[0]["title"] == "Learn Python"
    assert goals_data[1]["title"] == "Learn FastAPI"

@pytest.mark.asyncio
async def test_create_goal(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test creating a new goal."""
    # mock_auth_dependencies fixture handles auth mocking

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

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    # Mock the database operations
    response = await async_client.post("/api/learning-path/goals", json=new_goal, headers=auth_headers)

    assert response.status_code == 201
    created_goal = response.json()
    assert created_goal["title"] == "New Goal"
    assert created_goal["description"] == "New Goal Description"
    assert "id" in created_goal

@pytest.mark.asyncio
async def test_create_goals_batch(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test creating multiple goals in a batch."""
    # mock_auth_dependencies fixture handles auth mocking

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

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

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
    with patch('routers.learning_path.ObjectId', return_value=mock_object_id), \
         patch('routers.learning_path.Goal') as MockGoal:

        # Set up the mock Goal class to return a dict from model_dump
        MockGoal.side_effect = lambda **kwargs: MagicMock(**kwargs, model_dump=lambda: kwargs)

        response = await async_client.post("/api/learning-path/goals/batch", json=batch_goals, headers=auth_headers)

        assert response.status_code == 201
        response_data = response.json()
        assert isinstance(response_data, dict)
        assert "success" in response_data
        assert "errors" in response_data
        assert isinstance(response_data["success"], list)
        assert isinstance(response_data["errors"], list)
        assert len(response_data["errors"]) == 0 # Expect no errors
        assert len(response_data["success"]) == 2 # Expect 2 successful creations

        # Check the content of the created goals
        assert response_data["success"][0]["title"] == "Learn Python"
        assert response_data["success"][1]["title"] == "Learn FastAPI"
        # Verify the mock database call
        # Since batch pushes goals in one update operation
        # Update: Endpoint calls update_one for each goal in the batch
        assert mock_update_one.call_count == 2

    # Clean up dependencies
    app.dependency_overrides = {}

@pytest.mark.asyncio
async def test_get_goal_by_id(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test getting a specific goal by ID."""
    # mock_auth_dependencies fixture handles auth mocking

    goal_id_to_get = "goal123"
    specific_goal_data = {
        "id": goal_id_to_get,
        "title": "Specific Goal Title",
        "description": "Details of the specific goal",
        "target_date": datetime.now().strftime("%Y-%m-%d"),
        "priority": 5,
        "category": "Testing",
        "completed": False
    }

    # Mock find_one for the endpoint logic (user already authenticated by fixture)
    # We assume the auth fixture already mocked find_one for auth check if needed.
    # Here we configure the mock DB provided by the override for the *endpoint's* call.
    mock_find_one_for_endpoint = AsyncMock()
    mock_find_one_for_endpoint.return_value = {
        "username": "testuser",
        "goals": [specific_goal_data, {"id": "other_goal"}] # User data for the endpoint
    }

    mock_users_for_endpoint = MagicMock()
    mock_users_for_endpoint.find_one = mock_find_one_for_endpoint
    mock_db_for_endpoint = MagicMock()
    mock_db_for_endpoint.users = mock_users_for_endpoint

    # Define override specifically for this test context
    async def override_get_db_for_test():
        # This mock DB will be used by the endpoint's `db.users.find_one` call
        return mock_db_for_endpoint
    app.dependency_overrides[get_db] = override_get_db_for_test

    response = await async_client.get(f"/api/learning-path/goals/{goal_id_to_get}", headers=auth_headers)

    assert response.status_code == 200
    goal_data = response.json()
    assert goal_data["id"] == goal_id_to_get
    assert goal_data["title"] == specific_goal_data["title"]

    # Verify the endpoint's find_one was called as expected
    mock_find_one_for_endpoint.assert_awaited_once_with({"username": "testuser"})

    # Clean up override
    app.dependency_overrides.pop(get_db, None)

@pytest.mark.asyncio
async def test_get_goal_by_id_not_found(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test getting a goal by ID when it doesn't exist for the user."""
    # mock_auth_dependencies handles auth

    goal_id_nonexistent = "goal_not_here"

    # Mock find_one for the endpoint logic (user exists, but goal doesn't)
    mock_find_one_for_endpoint = AsyncMock()
    mock_find_one_for_endpoint.return_value = {
        "username": "testuser",
        "goals": [{"id": "other_goal"}] # User has goals, but not the one requested
    }

    mock_users_for_endpoint = MagicMock()
    mock_users_for_endpoint.find_one = mock_find_one_for_endpoint
    mock_db_for_endpoint = MagicMock()
    mock_db_for_endpoint.users = mock_users_for_endpoint

    # Define override
    async def override_get_db_for_test():
        return mock_db_for_endpoint
    app.dependency_overrides[get_db] = override_get_db_for_test

    response = await async_client.get(f"/api/learning-path/goals/{goal_id_nonexistent}", headers=auth_headers)

    assert response.status_code == 404
    assert "Goal with ID goal_not_here not found" in response.json()["detail"]

    # Verify the endpoint's find_one was called
    mock_find_one_for_endpoint.assert_awaited_once_with({"username": "testuser"})

    # Clean up override
    app.dependency_overrides.pop(get_db, None)

@pytest.mark.asyncio
async def test_update_goal(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test updating an existing goal."""
    # mock_auth_dependencies fixture handles auth mocking

    goal_id_to_update = "goal_to_update"
    original_goal = {
        "id": goal_id_to_update,
        "title": "Original Goal Title",
        "description": "Original Description",
        "target_date": datetime.now().strftime("%Y-%m-%d"),
        "priority": 3,
        "category": "Original Category",
        "completed": False,
        "completion_date": None,
        "notes": "Original Notes"
    }
    update_payload = {
        "title": "Updated Goal Title",
        "priority": 4,
        "completed": True # Mark as completed
    }

    # Simulate user state *after* the update
    expected_completion_date_str = datetime.now().isoformat()
    updated_goal_state = {
        "id": goal_id_to_update,
        "title": update_payload["title"],
        "description": original_goal["description"], # Preserved
        "target_date": original_goal["target_date"], # Preserved
        "priority": update_payload["priority"],
        "category": original_goal["category"], # Preserved
        "completed": update_payload["completed"],
        "completion_date": expected_completion_date_str, # Updated
        "notes": original_goal["notes"], # Preserved
        "updated_at": ANY # Endpoint should add this
    }
    user_state_after_update = {
        "username": "testuser",
        "goals": [updated_goal_state]
    }

    # Mock find_one to return the correct state *after* update
    mock_find_one = AsyncMock(return_value=user_state_after_update)

    # Mock update_one (as before)
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    response = await async_client.put(f"/api/learning-path/goals/{goal_id_to_update}", json=update_payload, headers=auth_headers)

    assert response.status_code == 200
    updated_goal = response.json()
    assert updated_goal["id"] == goal_id_to_update
    assert updated_goal["title"] == "Updated Goal Title" # Check updated field
    assert updated_goal["priority"] == 4 # Check updated field
    assert updated_goal["description"] == "Original Description" # Check preserved field
    assert updated_goal["completed"] is True # Check updated field
    assert updated_goal["completion_date"] is not None # Completion date should be set
    # Use approx for comparing the completion date string due to potential microsecond differences
    assert datetime.fromisoformat(updated_goal["completion_date"]) == pytest.approx(datetime.fromisoformat(expected_completion_date_str))

    # Verify update_one call structure (important for MongoDB updates)
    mock_update_one.assert_called_once()
    call_args, call_kwargs = mock_update_one.call_args
    # Check filter
    assert call_args[0] == {"username": "testuser", "goals.id": goal_id_to_update}
    # Check update operation ($set)
    update_doc = call_args[1]["$set"]
    # Corrected Assertions for Goal Update:
    # Check fields present in the update payload
    assert "goals.$[goalElem].title" in update_doc
    assert update_doc["goals.$[goalElem].title"] == update_payload["title"]
    assert "goals.$[goalElem].priority" in update_doc
    assert update_doc["goals.$[goalElem].priority"] == update_payload["priority"]
    assert "goals.$[goalElem].completed" in update_doc
    assert update_doc["goals.$[goalElem].completed"] == update_payload["completed"]

    # Check fields that are automatically set when marking goal as completed
    if update_payload.get("completed"):
        assert "goals.$[goalElem].completion_date" in update_doc
        assert "goals.$[goalElem].updated_at" in update_doc # Check for updated_at

    # Check arrayFilters (should only filter by goalElem.id for goal update)
    assert "array_filters" in call_kwargs
    assert call_kwargs["array_filters"] == [{"goalElem.id": goal_id_to_update}] # Corrected filter

    # Verify find_one was called *after* update_one to return the result
    # The endpoint fetches the updated goal using a filter and projection.
    mock_find_one.assert_called_once_with(
        {"username": "testuser", "goals.id": goal_id_to_update},
        {"goals.$": 1}
    )

@pytest.mark.asyncio
async def test_update_goal_not_found(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test updating a goal that does not exist."""
    # mock_auth_dependencies handles auth
    goal_id_not_found = "goal_xyz"
    update_payload = {"title": "Attempted Update"}

    # Mock find_one to return user without the goal
    mock_find_one = AsyncMock(return_value={"username": "testuser", "goals": []})
    # Mock update_one to simulate no match
    mock_update_one = AsyncMock(return_value=MagicMock(modified_count=0))

    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    response = await async_client.put(f"/api/learning-path/goals/{goal_id_not_found}", json=update_payload, headers=auth_headers)
    assert response.status_code == 304

@pytest.mark.asyncio
async def test_delete_goal(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test deleting an existing goal."""
    # mock_auth_dependencies fixture handles auth mocking

    goal_id_to_delete = "goal_to_delete"
    goal_to_delete_data = {
        "id": goal_id_to_delete,
        "title": "Goal To Delete",
        "description": "Description for Delete",
        "target_date": str(datetime.now() + timedelta(days=1)),
        "priority": 1,
        "category": "Deletion",
        "completed": False
    }

    # Mock find_one to return user with the goal
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "goals": [goal_to_delete_data]
    }

    # Mock update_one for the $pull operation
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.update_one = mock_update_one
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    response = await async_client.delete(f"/api/learning-path/goals/{goal_id_to_delete}", headers=auth_headers)

    # Successful deletion should return 204 No Content
    assert response.status_code == 204

    # Verify update_one was called with $pull
    mock_update_one.assert_called_once()
    call_args, _ = mock_update_one.call_args
    assert call_args[0] == {"username": "testuser"}
    assert "$pull" in call_args[1]
    assert call_args[1]["$pull"] == {"goals": {"id": goal_id_to_delete}}

@pytest.mark.asyncio
async def test_delete_goal_not_found(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test deleting a goal that does not exist."""
    # mock_auth_dependencies fixture handles auth mocking

    goal_id_nonexistent = "nonexistent_goal"

    # Mock find_one to simulate user found, but goal not in their list
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {"username": "testuser", "goals": []}

    # Mock update_one to simulate no document being modified
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.modified_count = 0 # Simulate no modification
    mock_update_one.return_value = mock_update_result

    mock_users = MagicMock()
    mock_users.find_one = mock_find_one # Used by get_current_active_user implicitly
    mock_users.update_one = mock_update_one
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    response = await async_client.delete(f"/api/learning-path/goals/{goal_id_nonexistent}", headers=auth_headers)

    # Expect 404 Not Found if the goal doesn't exist for the user
    assert response.status_code == 404
    assert f"Goal with ID {goal_id_nonexistent} not found" in response.json()["detail"]
    # Ensure update_one was still attempted based on username, but $pull matched nothing
    mock_update_one.assert_called_once()
    call_args, _ = mock_update_one.call_args
    assert call_args[0] == {"username": "testuser"}
    assert call_args[1] == {"$pull": {"goals": {"id": goal_id_nonexistent}}}

# --- Milestone Tests --- #

@pytest.mark.asyncio
async def test_get_milestones(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test getting all milestones for a specific goal."""
    # mock_auth_dependencies fixture handles auth mocking

    goal_id_with_milestones = "goal_with_milestones"
    milestone1 = {
        "id": "milestone1",
        "title": "Milestone 1",
        "description": "First step",
        "target_date": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d"),
        "status": "in_progress",
        "verification_method": "Check code",
        "resources": []
    }
    milestone2 = {
        "id": "milestone2",
        "title": "Milestone 2",
        "description": "Second step",
        "target_date": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"),
        "status": "not_started",
        "verification_method": "Demo feature",
        "resources": []
    }
    goal_data_with_milestones = {
        "id": goal_id_with_milestones,
        "title": "Goal With Milestones",
        "description": "A goal that has milestones",
        "target_date": str(datetime.now() + timedelta(days=10)),
        "priority": 5,
        "category": "Testing Milestones",
        "completed": False,
        "milestones": [milestone1, milestone2]
    }

    # Mock find_one to return the user with this goal
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "goals": [goal_data_with_milestones]
    }

    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_users.count_documents = AsyncMock(return_value=1)
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    response = await async_client.get(f"/api/learning-path/goals/{goal_id_with_milestones}/milestones", headers=auth_headers)

    assert response.status_code == 200
    milestones_data = response.json()
    assert isinstance(milestones_data, list)
    assert len(milestones_data) == 2
    assert milestones_data[0]["title"] == "Milestone 1"
    assert milestones_data[1]["title"] == "Milestone 2"
    mock_find_one.assert_called_once_with(
        {"username": "testuser", "goals.id": goal_id_with_milestones},
        {"goals.$": 1}
    )

@pytest.mark.asyncio
async def test_get_milestones_goal_not_found(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test getting milestones when the goal ID does not exist for the user."""
    # mock_auth_dependencies fixture handles auth mocking

    goal_id_nonexistent = "nonexistent_goal"

    # Mock find_one to return None, simulating the goal not being found
    mock_find_one = AsyncMock(return_value=None)
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    # Mock count_documents to simulate the user *does* exist
    mock_users.count_documents = AsyncMock(return_value=1)
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    # Use the new nested URL
    response = await async_client.get(f"/api/learning-path/goals/{goal_id_nonexistent}/milestones", headers=auth_headers)

    # Expect 404 Not Found
    assert response.status_code == 404
    # Check the specific error message from the refactored endpoint
    assert f"Goal with ID '{goal_id_nonexistent}' not found for user 'testuser'." in response.json()["detail"]
    # Verify the find_one call
    mock_find_one.assert_called_once_with(
        {"username": "testuser", "goals.id": goal_id_nonexistent},
        {"goals.$": 1}
    )
    # Verify the count_documents call was made after find_one failed
    mock_users.count_documents.assert_called_once_with({"username": "testuser"})

@pytest.mark.asyncio
async def test_create_milestone(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test creating a new milestone for a goal."""
    # mock_auth_dependencies fixture handles auth mocking

    goal_id_for_new_milestone = "goal_for_new_milestone"
    # This goal data is no longer needed in the mock as the endpoint now only needs to find the goal
    # goal_data = {
    #     "id": goal_id_for_new_milestone,
    #     "title": "Goal For New Milestone",
    #     "description": "Description",
    #     "target_date": str(datetime.now() + timedelta(days=10)),
    #     "milestones": [] # Start with empty milestones
    # }
    new_milestone_payload = {
        "title": "New Milestone Title",
        "description": "New Milestone Description",
        "target_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
        "verification_method": "Test it", # Added missing field
        # "status": "not_started" # Status is not part of create payload
    }

    # Mock update_one for adding the milestone to the nested array
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.matched_count = 1 # Simulate goal was found
    mock_update_result.modified_count = 1 # Simulate milestone was added
    mock_update_one.return_value = mock_update_result

    mock_users = MagicMock()
    # No find_one mock needed directly here anymore, update_one confirms existence
    mock_users.update_one = mock_update_one
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    # Use new nested URL
    response = await async_client.post(f"/api/learning-path/goals/{goal_id_for_new_milestone}/milestones", json=new_milestone_payload, headers=auth_headers)

    assert response.status_code == 201
    created_milestone = response.json()
    assert created_milestone["title"] == "New Milestone Title"
    assert created_milestone["description"] == "New Milestone Description"
    assert "id" in created_milestone # Check if ID was generated
    assert created_milestone["completed"] is False # Default value

    # Verify the update_one call
    mock_update_one.assert_called_once()
    call_args, call_kwargs = mock_update_one.call_args
    # Check the filter
    assert call_args[0] == {"username": "testuser", "goals.id": goal_id_for_new_milestone}
    # Check the update operation ($push)
    assert "$push" in call_args[1]
    assert "goals.$.milestones" in call_args[1]["$push"]
    # Check the content being pushed (match payload + defaults)
    pushed_milestone = call_args[1]["$push"]["goals.$.milestones"]
    assert pushed_milestone["title"] == new_milestone_payload["title"]
    assert pushed_milestone["description"] == new_milestone_payload["description"]
    assert pushed_milestone["target_date"] == new_milestone_payload["target_date"]
    assert pushed_milestone["verification_method"] == new_milestone_payload["verification_method"]
    assert "id" in pushed_milestone # Check ID exists
    assert pushed_milestone["completed"] is False
    assert pushed_milestone["completion_date"] is None

@pytest.mark.asyncio
async def test_create_milestone_goal_not_found(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test creating a milestone for a goal that does not exist."""
    # mock_auth_dependencies handles auth

    goal_id_nonexistent = "nonexistent_goal_id"
    new_milestone_payload = {
        "title": "Milestone for Nonexistent Goal",
        "description": "This should fail",
        "target_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
        "verification_method": "None"
    }

    # Mock update_one to simulate the goal not being found
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.matched_count = 0 # Goal not found
    mock_update_result.modified_count = 0
    mock_update_one.return_value = mock_update_result

    # Mock find_one used for the secondary check after update fails
    mock_find_one = AsyncMock(return_value={"username": "testuser"}) # Simulate user exists

    mock_users = MagicMock()
    mock_users.update_one = mock_update_one
    mock_users.find_one = mock_find_one # Needed for the 404 detail message check
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    # Use new nested URL
    response = await async_client.post(f"/api/learning-path/goals/{goal_id_nonexistent}/milestones", json=new_milestone_payload, headers=auth_headers)

    # Expect 404 Not Found
    assert response.status_code == 404
    assert f"Goal with ID '{goal_id_nonexistent}' not found for user 'testuser'" in response.json()["detail"]

    # Verify update_one was called
    mock_update_one.assert_called_once_with(
        {"username": "testuser", "goals.id": goal_id_nonexistent},
        {"$push": {"goals.$.milestones": ANY}} # Use ANY from unittest.mock
    )
    # Verify find_one was called after update failed
    mock_find_one.assert_called_once_with({"username": "testuser"})

@pytest.mark.asyncio
async def test_update_milestone(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test updating an existing milestone."""
    # mock_auth_dependencies fixture handles auth mocking

    goal_id = "goal_for_update_milestone"
    milestone_id_to_update = "milestone_to_update"
    original_milestone = {
        "id": milestone_id_to_update,
        "title": "Original Milestone Title",
        "description": "Original Description",
        "target_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
        "status": "not_started", # Added missing field
        "verification_method": "Original Method", # Added missing field
        "resources": [], # Added missing field
        "completed": False, # Added missing field
        "completion_date": None, # Added missing field
        "notes": "Original Notes" # Added missing field
    }
    # This initial goal data mock is less critical now, as the endpoint verifies existence
    # via the update query itself, but we need it for the find_one mock *after* the update.
    goal_data = {
        "id": goal_id,
        "title": "Goal for Update Milestone",
        "milestones": [original_milestone]
    }
    update_payload = {
        "title": "Updated Milestone Title",
        "status": "in_progress",
        "completed": True # Lets also mark as completed
    }

    # Mock update_one for modifying the milestone using arrayFilters
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.matched_count = 1
    mock_update_result.modified_count = 1
    mock_update_one.return_value = mock_update_result

    # Mock find_one called *after* update to return the updated milestone
    # Simulate the state *after* the update would have occurred
    updated_milestone_state = original_milestone.copy()
    # Generate the expected completion date string *once*
    expected_completion_date_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    updated_milestone_state.update({
        "title": update_payload["title"],
        "status": update_payload["status"],
        "completed": update_payload["completed"],
        # Use the generated string, not approx
        "completion_date": expected_completion_date_str
    })
    mock_find_one_after_update = AsyncMock()
    mock_find_one_after_update.return_value = {
        "username": "testuser",
        "goals": [{
            "id": goal_id,
            "milestones": [updated_milestone_state]
        }]
    }

    mock_users = MagicMock()
    mock_users.update_one = mock_update_one
    mock_users.find_one = mock_find_one_after_update # This mock is for the find *after* update
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    # Use new nested URL
    response = await async_client.put(f"/api/learning-path/goals/{goal_id}/milestones/{milestone_id_to_update}", json=update_payload, headers=auth_headers)

    assert response.status_code == 200
    updated_milestone = response.json()
    assert updated_milestone["id"] == milestone_id_to_update
    assert updated_milestone["title"] == "Updated Milestone Title"
    assert updated_milestone["status"] == "in_progress"
    assert updated_milestone["completed"] is True
    assert updated_milestone["completion_date"] == expected_completion_date_str
    assert updated_milestone["description"] == "Original Description" # Check preserved

    # Verify update_one call structure
    mock_update_one.assert_called_once()
    call_args, call_kwargs = mock_update_one.call_args
    # Check filter
    assert call_args[0] == {"username": "testuser", "goals.id": goal_id}
    # Check update operation ($set)
    update_doc = call_args[1]["$set"]
    assert "goals.$[goal].milestones.$[milestone].title" in update_doc
    assert update_doc["goals.$[goal].milestones.$[milestone].title"] == update_payload["title"]
    assert "goals.$[goal].milestones.$[milestone].status" in update_doc
    assert update_doc["goals.$[goal].milestones.$[milestone].status"] == update_payload["status"]
    assert "goals.$[goal].milestones.$[milestone].completed" in update_doc
    assert update_doc["goals.$[goal].milestones.$[milestone].completed"] == update_payload["completed"]
    # Check that completion_date is set when completed is True
    assert "goals.$[goal].milestones.$[milestone].completion_date" in update_doc
    # Completion date is approximate, so we don't check the exact value here

    # Verify find_one was called *after* update_one to return the result
    mock_find_one_after_update.assert_called_once_with(
         {"username": "testuser", "goals.id": goal_id},
         {"goals.$": 1}
    )

@pytest.mark.asyncio
async def test_update_milestone_not_found(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test updating a milestone that does not exist within a goal."""
    # mock_auth_dependencies handles auth

    goal_id_exists = "existing_goal_id"
    milestone_id_nonexistent = "nonexistent_milestone_id"
    update_payload = {"title": "Attempted Update"}

    # Mock update_one to simulate the milestone not being matched by arrayFilters
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.matched_count = 0 # Goal might be matched, but not the milestone via array filter
    mock_update_result.modified_count = 0
    mock_update_one.return_value = mock_update_result

    # Mock find_one used for the secondary check after update fails
    # Simulate goal exists, needed for specific 404 message
    mock_find_one_check = AsyncMock(return_value={"_id": "some_user_id"})

    mock_users = MagicMock()
    mock_users.update_one = mock_update_one
    mock_users.find_one = mock_find_one_check # For the secondary check
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    # Use new nested URL
    response = await async_client.put(f"/api/learning-path/goals/{goal_id_exists}/milestones/{milestone_id_nonexistent}", json=update_payload, headers=auth_headers)

    # Expect 404 Not Found
    assert response.status_code == 404
    assert f"Milestone with ID '{milestone_id_nonexistent}' not found within goal '{goal_id_exists}'." in response.json()["detail"]

    # Verify update_one was called
    mock_update_one.assert_called_once()
    # Verify find_one check was called after update failed
    mock_find_one_check.assert_called_once_with(
        {"username": "testuser", "goals.id": goal_id_exists},
        {"_id": 1}
    )

@pytest.mark.asyncio
async def test_delete_milestone(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test deleting an existing milestone."""
    # mock_auth_dependencies fixture handles auth mocking

    goal_id = "goal_for_delete_milestone"
    milestone_id_to_delete = "milestone_to_delete"
    milestone_to_delete_data = {
        "id": milestone_id_to_delete,
        "title": "Milestone To Delete",
        "description": "Desc", # Added missing field
        "target_date": "2025-01-01", # Added missing field
        "verification_method": "Method", # Added missing field
        "resources": [], # Added missing field
        "completed": False, # Added missing field
    }
    # Goal data mock not strictly needed for the delete operation itself
    # goal_data = {
    #     "id": goal_id,
    #     "title": "Goal For Delete Milestone",
    #     "milestones": [milestone_to_delete_data]
    # }

    # Mock update_one for the $pull operation on the sub-array
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.matched_count = 1 # Goal found
    mock_update_result.modified_count = 1 # Milestone pulled
    mock_update_one.return_value = mock_update_result

    mock_users = MagicMock()
    # No find_one needed for the success path
    mock_users.update_one = mock_update_one
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    # Use new nested URL
    response = await async_client.delete(f"/api/learning-path/goals/{goal_id}/milestones/{milestone_id_to_delete}", headers=auth_headers)

    # Expect 204 No Content on successful deletion
    assert response.status_code == 204

    # Verify update_one call structure
    mock_update_one.assert_called_once()
    call_args, call_kwargs = mock_update_one.call_args
    # Check filter
    assert call_args[0] == {"username": "testuser", "goals.id": goal_id}
    # Check update operation ($pull)
    assert call_args[1] == {"$pull": {"goals.$.milestones": {"id": milestone_id_to_delete}}}

@pytest.mark.asyncio
async def test_delete_milestone_not_found(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test deleting a milestone that does not exist within an existing goal."""
    # mock_auth_dependencies handles auth

    goal_id_exists = "existing_goal_for_delete"
    milestone_id_nonexistent = "nonexistent_milestone_to_delete"

    # Mock update_one to simulate the milestone not being found to be pulled
    mock_update_one = AsyncMock()
    mock_update_result = MagicMock()
    mock_update_result.matched_count = 1 # Goal *was* found
    mock_update_result.modified_count = 0 # But milestone wasn't pulled
    mock_update_one.return_value = mock_update_result

    # Mock find_one used for the secondary check (though not strictly needed for 204 path)
    mock_find_one_check = AsyncMock(return_value={"_id": "some_user_id"})

    mock_users = MagicMock()
    mock_users.update_one = mock_update_one
    mock_users.find_one = mock_find_one_check
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    # Use new nested URL
    response = await async_client.delete(f"/api/learning-path/goals/{goal_id_exists}/milestones/{milestone_id_nonexistent}", headers=auth_headers)

    # Expect 204 No Content even if milestone wasn't found (idempotent)
    assert response.status_code == 204

    # Verify update_one was called
    mock_update_one.assert_called_once()
    call_args, call_kwargs = mock_update_one.call_args
    assert call_args[0] == {"username": "testuser", "goals.id": goal_id_exists}
    assert call_args[1] == {"$pull": {"goals.$.milestones": {"id": milestone_id_nonexistent}}}
    # Verify the secondary find_one check was *not* called in this path (because matched_count was 1)
    mock_find_one_check.assert_not_called()

# --- Learning Path Progress Test --- #

@pytest.mark.asyncio
async def test_get_learning_path_progress(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test getting the overall learning path progress."""
    # mock_auth_dependencies fixture handles auth mocking

    goal1 = {
        "id": "goal1", "title": "Goal 1", "completed": True,
        "milestones": [
            {"id": "m1.1", "completed": True},
            {"id": "m1.2", "completed": True}
        ]
    }
    goal2 = {
        "id": "goal2", "title": "Goal 2", "completed": False,
        "milestones": [
            {"id": "m2.1", "completed": True},
            {"id": "m2.2", "completed": False},
            {"id": "m2.3", "completed": False}
        ]
    }
    goal3 = {
        "id": "goal3", "title": "Goal 3", "completed": False,
        "milestones": [] # Goal with no milestones
    }

    # Mock find_one to return user with these goals
    mock_find_one = AsyncMock()
    mock_find_one.return_value = {
        "username": "testuser",
        "goals": [goal1, goal2, goal3]
    }

    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    response = await async_client.get("/api/learning-path/progress", headers=auth_headers)

    assert response.status_code == 200
    progress_data = response.json()

    assert "total_goals" in progress_data
    assert "completed_goals" in progress_data
    assert "total_milestones" in progress_data
    assert "completed_milestones" in progress_data
    assert "overall_progress" in progress_data

    assert progress_data["total_goals"] == 3
    assert progress_data["completed_goals"] == 1
    # Total milestones = 2 (goal1) + 3 (goal2) + 0 (goal3) = 5
    assert progress_data["total_milestones"] == 5
    # Completed milestones = 2 (goal1) + 1 (goal2) = 3
    assert progress_data["completed_milestones"] == 3
    # Overall progress: (3 completed milestones / 5 total milestones) * 100 = 60%
    assert progress_data["overall_progress"] == pytest.approx(60.0)

@pytest.mark.asyncio
async def test_get_learning_path_progress_no_goals(async_client: AsyncClient, auth_headers, mock_auth_dependencies):
    """Test getting progress when the user has no goals."""
    # mock_auth_dependencies handles auth

    # Mock find_one to return user with empty goals list
    mock_find_one = AsyncMock(return_value={"username": "testuser", "goals": []})
    mock_users = MagicMock()
    mock_users.find_one = mock_find_one
    mock_db = MagicMock()
    mock_db.users = mock_users

    # Define override for DB
    async def override_get_db():
        return mock_db
    app.dependency_overrides[get_db] = override_get_db

    response = await async_client.get("/api/learning-path/progress", headers=auth_headers)
    assert response.status_code == 200
    progress_data = response.json()
    assert progress_data["total_goals"] == 0
    assert progress_data["completed_goals"] == 0
    assert progress_data["total_milestones"] == 0
    assert progress_data["completed_milestones"] == 0
    # Check if the key exists, even if calculation is zero
    assert "overall_progress" in progress_data or progress_data.get("overall_progress") == 0.0

# Cleanup overrides after tests in this module
@pytest.fixture(scope="module", autouse=True)
def cleanup_overrides():
    yield
    app.dependency_overrides = {}