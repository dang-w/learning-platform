import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime, timedelta
from main import app, User, get_current_user, get_current_active_user, oauth2_scheme

@pytest.fixture
def mock_auth_dependencies():
    """
    Override dependencies for authentication in tests.
    This fixture should be explicitly requested in tests that need authentication mocking.
    """
    # Create a mock user dictionary (not a User object)
    mock_user = {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "disabled": False
    }

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

@pytest.mark.asyncio
async def test_get_goals(client, test_db, auth_headers, mock_auth_dependencies):
    """Test getting all goals."""
    # Create a test user in the database
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
        "disabled": False,
        "goals": []
    }

    # Ensure the user exists
    await test_db.users.delete_many({"username": "testuser"})
    await test_db.users.insert_one(user_data)

    # Insert test goals
    goals = [
        {
            "id": "goal_1",
            "title": "Master Neural Networks",
            "description": "Learn the fundamentals of neural networks",
            "target_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "priority": 8,
            "category": "Deep Learning",
            "completed": False,
            "completion_date": None,
            "notes": ""
        },
        {
            "id": "goal_2",
            "title": "Complete Deep Learning Specialization",
            "description": "Finish all courses in the specialization",
            "target_date": (datetime.now() + timedelta(days=60)).isoformat(),
            "priority": 9,
            "category": "Courses",
            "completed": False,
            "completion_date": None,
            "notes": "",
            "progress": 25,
            "progress_history": [
                {
                    "date": (datetime.now() - timedelta(days=5)).isoformat(),
                    "progress": 25
                }
            ]
        }
    ]

    # Insert goals into the user document
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$set": {"goals": goals}}
    )

    # Verify the user has goals in the database
    user_after_update = await test_db.users.find_one({"username": "testuser"})
    assert user_after_update is not None
    assert "goals" in user_after_update
    assert len(user_after_update["goals"]) == 2

    # Import the get_goals function from the router
    from routers.learning_path import get_goals

    # Patch the router's database with the test database
    import routers.learning_path
    original_db = routers.learning_path.db
    routers.learning_path.db = test_db

    try:
        # Create a mock user for testing
        mock_user = {"username": "testuser"}

        # Call the function directly
        result = await get_goals(None, None, mock_user)

        # Verify the result
        assert len(result) == 2

        # Goals are sorted by priority (highest first), so the goal with priority 9 should be first
        assert result[0]["title"] == "Complete Deep Learning Specialization"
        assert result[0]["priority"] == 9
        assert result[0].get("progress", 0) == 25

        assert result[1]["title"] == "Master Neural Networks"
        assert result[1]["priority"] == 8
    finally:
        # Restore the original database
        routers.learning_path.db = original_db

@pytest.mark.asyncio
async def test_create_goal(client, test_db, auth_headers, mock_auth_dependencies):
    """Test creating a new goal."""
    # Ensure user exists
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$set": {"goals": []}},
        upsert=True
    )

    new_goal = {
        "title": "Learn Reinforcement Learning",
        "description": "Study the basics of RL",
        "target_date": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d"),
        "priority": 7,
        "category": "Machine Learning",
        "completed": False,
        "notes": ""
    }

    # Import the create_goal function from the router
    from routers.learning_path import create_goal

    # Import GoalCreate model
    from routers.learning_path import GoalCreate

    # Patch the router's database with the test database
    import routers.learning_path
    original_db = routers.learning_path.db
    routers.learning_path.db = test_db

    try:
        # Create a mock user for testing
        mock_user = {"username": "testuser"}

        # Create a GoalCreate object
        goal_create = GoalCreate(**new_goal)

        # Call the function directly
        result = await create_goal(goal_create, mock_user)

        # Verify the result
        assert result["title"] == "Learn Reinforcement Learning"
        assert result["description"] == "Study the basics of RL"
        assert result["priority"] == 7
        assert result["category"] == "Machine Learning"
        assert result["completed"] is False
        assert "id" in result

        # Verify it was saved to the database
        user = await test_db.users.find_one({"username": "testuser"})
        assert user is not None
        assert "goals" in user

        # Find the goal in the user's goals array
        created_goal = next((g for g in user["goals"] if g["id"] == result["id"]), None)
        assert created_goal is not None
        assert created_goal["title"] == "Learn Reinforcement Learning"
    finally:
        # Restore the original database
        routers.learning_path.db = original_db

@pytest.mark.asyncio
async def test_get_goal_by_id(client, test_db, auth_headers, mock_auth_dependencies):
    """Test getting a specific goal by ID."""
    # Create a test goal ID
    goal_id = "goal_test_123"

    # Ensure user exists with an empty goals array
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$set": {"goals": []}},
        upsert=True
    )

    # Insert a test goal into the user document
    goal = {
        "id": goal_id,
        "title": "Build a Recommendation System",
        "description": "Create a movie recommendation system",
        "target_date": (datetime.now() + timedelta(days=90)).isoformat(),
        "priority": 6,
        "category": "Projects",
        "completed": False,
        "completion_date": None,
        "notes": "Use collaborative filtering"
    }

    # Insert the goal into the user document
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$push": {"goals": goal}}
    )

    # Verify the user has the goal in the database
    user_after_update = await test_db.users.find_one({"username": "testuser"})
    assert user_after_update is not None
    assert "goals" in user_after_update
    assert len(user_after_update["goals"]) == 1
    assert user_after_update["goals"][0]["id"] == goal_id

    # Import the get_goal function from the router
    from routers.learning_path import get_goal

    # Patch the router's database with the test database
    import routers.learning_path
    original_db = routers.learning_path.db
    routers.learning_path.db = test_db

    try:
        # Create a mock user for testing
        mock_user = {"username": "testuser"}

        # Call the function directly
        result = await get_goal(goal_id, mock_user)

        # Verify the result
        assert result["id"] == goal_id
        assert result["title"] == "Build a Recommendation System"
        assert result["description"] == "Create a movie recommendation system"
        assert result["category"] == "Projects"
        assert result["notes"] == "Use collaborative filtering"
    finally:
        # Restore the original database
        routers.learning_path.db = original_db

@pytest.mark.asyncio
async def test_update_goal(client, test_db, auth_headers, mock_auth_dependencies):
    """Test updating a goal."""
    # Create a test goal ID
    goal_id = "goal_test_456"

    # Ensure user exists with an empty goals array
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$set": {"goals": []}},
        upsert=True
    )

    # Insert a test goal into the user document
    goal = {
        "id": goal_id,
        "title": "Learn PyTorch",
        "description": "Master PyTorch fundamentals",
        "target_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "priority": 7,
        "category": "Tools",
        "completed": False,
        "completion_date": None,
        "notes": ""
    }

    # Insert the goal into the user document
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$push": {"goals": goal}}
    )

    # Verify the user has the goal in the database
    user_after_update = await test_db.users.find_one({"username": "testuser"})
    assert user_after_update is not None
    assert "goals" in user_after_update
    assert len(user_after_update["goals"]) == 1
    assert user_after_update["goals"][0]["id"] == goal_id

    # Import the update_goal function from the router
    from routers.learning_path import update_goal, GoalUpdate

    # Patch the router's database with the test database
    import routers.learning_path
    original_db = routers.learning_path.db
    routers.learning_path.db = test_db

    try:
        # Create a mock user for testing
        mock_user = {"username": "testuser"}

        # Create the update data
        update_data = GoalUpdate(
            title="Master PyTorch",
            description="Learn PyTorch and implement models",
            priority=8,
            progress=30
        )

        # Call the function directly
        result = await update_goal(goal_id, update_data, mock_user)

        # Verify the result
        assert result["title"] == "Master PyTorch"
        assert result["description"] == "Learn PyTorch and implement models"
        assert result["priority"] == 8
        assert result.get("progress", 0) == 30

        # Verify it was updated in the database
        user = await test_db.users.find_one({"username": "testuser"})
        updated_goal = next((g for g in user["goals"] if g["id"] == goal_id), None)
        assert updated_goal is not None
        assert updated_goal["title"] == "Master PyTorch"
    finally:
        # Restore the original database
        routers.learning_path.db = original_db

@pytest.mark.asyncio
async def test_delete_goal(client, test_db, auth_headers, mock_auth_dependencies):
    """Test deleting a goal."""
    # Create a test goal ID
    goal_id = "goal_test_789"

    # Ensure user exists with an empty goals array
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$set": {"goals": []}},
        upsert=True
    )

    # Insert a test goal into the user document
    goal = {
        "id": goal_id,
        "title": "Learn TensorFlow",
        "description": "Master TensorFlow basics",
        "target_date": (datetime.now() + timedelta(days=45)).isoformat(),
        "priority": 6,
        "category": "Tools",
        "completed": False,
        "completion_date": None,
        "notes": ""
    }

    # Insert the goal into the user document
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$push": {"goals": goal}}
    )

    # Verify the user has the goal in the database
    user_after_update = await test_db.users.find_one({"username": "testuser"})
    assert user_after_update is not None
    assert "goals" in user_after_update
    assert len(user_after_update["goals"]) == 1
    assert user_after_update["goals"][0]["id"] == goal_id

    # Import the delete_goal function from the router
    from routers.learning_path import delete_goal

    # Patch the router's database with the test database
    import routers.learning_path
    original_db = routers.learning_path.db
    routers.learning_path.db = test_db

    try:
        # Create a mock user for testing
        mock_user = {"username": "testuser"}

        # Call the function directly
        await delete_goal(goal_id, mock_user)

        # Verify it was deleted from the database
        user = await test_db.users.find_one({"username": "testuser"})
        deleted_goal = next((g for g in user["goals"] if g["id"] == goal_id), None)
        assert deleted_goal is None
    finally:
        # Restore the original database
        routers.learning_path.db = original_db

@pytest.mark.asyncio
async def test_get_milestones(client, test_db, auth_headers, mock_auth_dependencies):
    """Test getting all milestones."""
    # Ensure user exists with an empty milestones array
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$set": {"milestones": []}},
        upsert=True
    )

    # Insert test milestones
    milestones = [
        {
            "id": "milestone_1",
            "title": "Complete Neural Networks Course",
            "description": "Finish the course on Coursera",
            "target_date": (datetime.now() + timedelta(days=15)).isoformat(),
            "verification_method": "Certificate",
            "resources": ["course_1"],
            "completed": False,
            "completion_date": None,
            "notes": ""
        },
        {
            "id": "milestone_2",
            "title": "Implement CNN Project",
            "description": "Build an image classifier",
            "target_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "verification_method": "GitHub Repository",
            "resources": ["article_1", "video_2"],
            "completed": False,
            "completion_date": None,
            "notes": "Use PyTorch"
        }
    ]

    # Insert milestones into the user document
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$set": {"milestones": milestones}}
    )

    # Verify the user has milestones in the database
    user_after_update = await test_db.users.find_one({"username": "testuser"})
    assert user_after_update is not None
    assert "milestones" in user_after_update
    assert len(user_after_update["milestones"]) == 2

    # Import the get_milestones function from the router
    from routers.learning_path import get_milestones

    # Patch the router's database with the test database
    import routers.learning_path
    original_db = routers.learning_path.db
    routers.learning_path.db = test_db

    try:
        # Create a mock user for testing
        mock_user = {"username": "testuser"}

        # Call the function directly
        result = await get_milestones(None, mock_user)

        # Verify the result
        assert len(result) == 2
        assert result[0]["title"] == "Complete Neural Networks Course"
        assert result[1]["title"] == "Implement CNN Project"
        assert result[1]["verification_method"] == "GitHub Repository"
    finally:
        # Restore the original database
        routers.learning_path.db = original_db

@pytest.mark.asyncio
async def test_create_milestone(client, test_db, auth_headers, mock_auth_dependencies):
    """Test creating a new milestone."""
    # Ensure user exists with empty milestones array
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$set": {"milestones": []}},
        upsert=True
    )

    new_milestone = {
        "title": "Complete Deep Learning Book",
        "description": "Read and take notes on the Deep Learning book",
        "target_date": (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d"),
        "verification_method": "Book Summary",
        "resources": ["book_1"],
        "completed": False,
        "notes": "Focus on chapters 1-5 first"
    }

    # Import the create_milestone function from the router
    from routers.learning_path import create_milestone

    # Import MilestoneCreate model
    from routers.learning_path import MilestoneCreate

    # Patch the router's database with the test database
    import routers.learning_path
    original_db = routers.learning_path.db
    routers.learning_path.db = test_db

    try:
        # Create a mock user for testing
        mock_user = {"username": "testuser"}

        # Create a MilestoneCreate object
        milestone_create = MilestoneCreate(**new_milestone)

        # Call the function directly
        result = await create_milestone(milestone_create, mock_user)

        # Verify the result
        assert result["title"] == "Complete Deep Learning Book"
        assert result["description"] == "Read and take notes on the Deep Learning book"
        assert result["verification_method"] == "Book Summary"
        assert result["resources"] == ["book_1"]
        assert result["completed"] is False
        assert result["notes"] == "Focus on chapters 1-5 first"
        assert "id" in result

        # Verify it was saved to the database
        user = await test_db.users.find_one({"username": "testuser"})
        assert user is not None
        assert "milestones" in user

        # Find the milestone in the user's milestones array
        created_milestone = next((m for m in user["milestones"] if m["id"] == result["id"]), None)
        assert created_milestone is not None
        assert created_milestone["title"] == "Complete Deep Learning Book"
    finally:
        # Restore the original database
        routers.learning_path.db = original_db

@pytest.mark.asyncio
async def test_update_milestone(client, test_db, auth_headers, mock_auth_dependencies):
    """Test updating a milestone."""
    # Create a test milestone ID
    milestone_id = "milestone_test_123"

    # Ensure user exists with an empty milestones array
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$set": {"milestones": []}},
        upsert=True
    )

    # Insert a test milestone into the user document
    milestone = {
        "id": milestone_id,
        "title": "Complete ML Course",
        "description": "Finish the ML course",
        "target_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "verification_method": "Certificate",
        "resources": ["course_2"],
        "completed": False,
        "completion_date": None,
        "notes": ""
    }

    # Insert the milestone into the user document
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$push": {"milestones": milestone}}
    )

    # Verify the user has the milestone in the database
    user_after_update = await test_db.users.find_one({"username": "testuser"})
    assert user_after_update is not None
    assert "milestones" in user_after_update
    assert len(user_after_update["milestones"]) == 1
    assert user_after_update["milestones"][0]["id"] == milestone_id

    # Import the update_milestone function from the router
    from routers.learning_path import update_milestone, MilestoneUpdate

    # Patch the router's database with the test database
    import routers.learning_path
    original_db = routers.learning_path.db
    routers.learning_path.db = test_db

    try:
        # Create a mock user for testing
        mock_user = {"username": "testuser"}

        # Create the update data
        update_data = MilestoneUpdate(
            title="Complete Advanced ML Course",
            completed=True,
            notes="Completed with distinction"
        )

        # Call the function directly
        result = await update_milestone(milestone_id, update_data, mock_user)

        # Verify the result
        assert result["title"] == "Complete Advanced ML Course"
        assert result["completed"] is True
        assert result["notes"] == "Completed with distinction"
        assert result["completion_date"] is not None

        # Verify it was updated in the database
        user = await test_db.users.find_one({"username": "testuser"})
        updated_milestone = next((m for m in user["milestones"] if m["id"] == milestone_id), None)
        assert updated_milestone is not None
        assert updated_milestone["title"] == "Complete Advanced ML Course"
        assert updated_milestone["completed"] is True
        assert updated_milestone["completion_date"] is not None
    finally:
        # Restore the original database
        routers.learning_path.db = original_db

@pytest.mark.asyncio
async def test_delete_milestone(client, test_db, auth_headers, mock_auth_dependencies):
    """Test deleting a milestone."""
    # Create a test milestone ID
    milestone_id = "milestone_test_456"

    # Ensure user exists with an empty milestones array
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$set": {"milestones": []}},
        upsert=True
    )

    # Insert a test milestone into the user document
    milestone = {
        "id": milestone_id,
        "title": "Implement NLP Project",
        "description": "Build a text classifier",
        "target_date": (datetime.now() + timedelta(days=45)).isoformat(),
        "verification_method": "GitHub Repository",
        "resources": ["article_3", "video_4"],
        "completed": False,
        "completion_date": None,
        "notes": ""
    }

    # Insert the milestone into the user document
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$push": {"milestones": milestone}}
    )

    # Verify the user has the milestone in the database
    user_after_update = await test_db.users.find_one({"username": "testuser"})
    assert user_after_update is not None
    assert "milestones" in user_after_update
    assert len(user_after_update["milestones"]) == 1
    assert user_after_update["milestones"][0]["id"] == milestone_id

    # Import the delete_milestone function from the router
    from routers.learning_path import delete_milestone

    # Patch the router's database with the test database
    import routers.learning_path
    original_db = routers.learning_path.db
    routers.learning_path.db = test_db

    try:
        # Create a mock user for testing
        mock_user = {"username": "testuser"}

        # Call the function directly
        await delete_milestone(milestone_id, mock_user)

        # Verify it was deleted from the database
        user = await test_db.users.find_one({"username": "testuser"})
        deleted_milestone = next((m for m in user["milestones"] if m["id"] == milestone_id), None)
        assert deleted_milestone is None
    finally:
        # Restore the original database
        routers.learning_path.db = original_db

@pytest.mark.asyncio
async def test_get_learning_path_progress(client, test_db, auth_headers, mock_auth_dependencies):
    """Test getting learning path progress."""
    # Ensure user exists with empty goals and milestones arrays
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$set": {"goals": [], "milestones": []}},
        upsert=True
    )

    # Insert test goals with different progress levels
    goals = [
        {
            "id": "goal_progress_1",
            "title": "Goal 1",
            "description": "Description 1",
            "target_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "priority": 8,
            "category": "Category 1",
            "completed": True,
            "completion_date": (datetime.now() - timedelta(days=5)).isoformat(),
            "notes": "",
            "progress": 100,
            "progress_history": [
                {
                    "date": (datetime.now() - timedelta(days=10)).isoformat(),
                    "progress": 50
                },
                {
                    "date": (datetime.now() - timedelta(days=5)).isoformat(),
                    "progress": 100
                }
            ]
        },
        {
            "id": "goal_progress_2",
            "title": "Goal 2",
            "description": "Description 2",
            "target_date": (datetime.now() + timedelta(days=60)).isoformat(),
            "priority": 7,
            "category": "Category 2",
            "completed": False,
            "completion_date": None,
            "notes": "",
            "progress": 50,
            "progress_history": [
                {
                    "date": (datetime.now() - timedelta(days=15)).isoformat(),
                    "progress": 25
                },
                {
                    "date": (datetime.now() - timedelta(days=7)).isoformat(),
                    "progress": 50
                }
            ]
        },
        {
            "id": "goal_progress_3",
            "title": "Goal 3",
            "description": "Description 3",
            "target_date": (datetime.now() + timedelta(days=90)).isoformat(),
            "priority": 6,
            "category": "Category 1",
            "completed": False,
            "completion_date": None,
            "notes": "",
            "progress": 0,
            "progress_history": []
        }
    ]

    # Insert test milestones with different completion status
    milestones = [
        {
            "id": "milestone_progress_1",
            "title": "Milestone 1",
            "description": "Description 1",
            "target_date": (datetime.now() + timedelta(days=15)).isoformat(),
            "verification_method": "Method 1",
            "resources": ["resource_1"],
            "completed": True,
            "completion_date": (datetime.now() - timedelta(days=2)).isoformat(),
            "notes": ""
        },
        {
            "id": "milestone_progress_2",
            "title": "Milestone 2",
            "description": "Description 2",
            "target_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "verification_method": "Method 2",
            "resources": ["resource_2"],
            "completed": False,
            "completion_date": None,
            "notes": ""
        }
    ]

    # Insert goals and milestones into the user document
    await test_db.users.update_one(
        {"username": "testuser"},
        {"$set": {"goals": goals, "milestones": milestones}}
    )

    # Verify the user has goals and milestones in the database
    user_after_update = await test_db.users.find_one({"username": "testuser"})
    assert user_after_update is not None
    assert "goals" in user_after_update
    assert "milestones" in user_after_update
    assert len(user_after_update["goals"]) == 3
    assert len(user_after_update["milestones"]) == 2

    # Import the get_learning_path_progress function from the router
    from routers.learning_path import get_learning_path_progress

    # Patch the router's database with the test database
    import routers.learning_path
    original_db = routers.learning_path.db
    routers.learning_path.db = test_db

    try:
        # Create a mock user for testing
        mock_user = {"username": "testuser"}

        # Call the function directly
        result = await get_learning_path_progress(mock_user)

        # Check the structure of the response
        assert "overall_progress" in result
        assert "completed_goals" in result
        assert "total_goals" in result
        assert "completed_milestones" in result
        assert "total_milestones" in result
        assert "progress_by_category" in result
        assert "progress_history" in result

        # Check the values
        assert result["overall_progress"] == 50  # (100 + 50 + 0) / 3
        assert result["completed_goals"] == 1
        assert result["total_goals"] == 3
        assert result["completed_milestones"] == 1
        assert result["total_milestones"] == 2
        assert len(result["progress_by_category"]) == 2
        assert "Category 1" in [cat["name"] for cat in result["progress_by_category"]]
        assert "Category 2" in [cat["name"] for cat in result["progress_by_category"]]
        assert len(result["progress_history"]) > 0
    finally:
        # Restore the original database
        routers.learning_path.db = original_db