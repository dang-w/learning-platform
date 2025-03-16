import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime, timedelta

@pytest.mark.asyncio
async def test_get_goals(client, db, auth_headers):
    """Test getting all goals."""
    # Insert test goals
    goals = [
        {
            "title": "Master Neural Networks",
            "description": "Learn the fundamentals of neural networks",
            "target_date": datetime.now() + timedelta(days=30),
            "priority": 8,
            "category": "Deep Learning",
            "completed": False,
            "completion_date": None,
            "notes": "",
            "progress": 0,
            "progress_history": [],
            "user_id": ObjectId(auth_headers["user_id"])
        },
        {
            "title": "Complete Deep Learning Specialization",
            "description": "Finish all courses in the specialization",
            "target_date": datetime.now() + timedelta(days=60),
            "priority": 9,
            "category": "Courses",
            "completed": False,
            "completion_date": None,
            "notes": "",
            "progress": 25,
            "progress_history": [
                {
                    "date": datetime.now() - timedelta(days=5),
                    "progress": 25
                }
            ],
            "user_id": ObjectId(auth_headers["user_id"])
        }
    ]

    await db.goals.insert_many(goals)

    # Test getting all goals
    response = client.get("/api/learning-path/goals", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "Master Neural Networks"
    assert data[1]["title"] == "Complete Deep Learning Specialization"
    assert data[1]["progress"] == 25

@pytest.mark.asyncio
async def test_create_goal(client, db, auth_headers):
    """Test creating a new goal."""
    new_goal = {
        "title": "Learn Reinforcement Learning",
        "description": "Study the basics of RL",
        "target_date": (datetime.now() + timedelta(days=45)).isoformat(),
        "priority": 7,
        "category": "Machine Learning",
        "completed": False,
        "notes": ""
    }

    response = client.post("/api/learning-path/goals", json=new_goal, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Learn Reinforcement Learning"
    assert data["description"] == "Study the basics of RL"
    assert data["priority"] == 7
    assert data["category"] == "Machine Learning"
    assert data["completed"] is False
    assert data["progress"] == 0
    assert "id" in data

    # Verify it was saved to the database
    db_goal = await db.goals.find_one({"_id": ObjectId(data["id"])})
    assert db_goal is not None
    assert db_goal["title"] == "Learn Reinforcement Learning"
    assert db_goal["user_id"] == ObjectId(auth_headers["user_id"])

@pytest.mark.asyncio
async def test_get_goal_by_id(client, db, auth_headers):
    """Test getting a specific goal by ID."""
    # Insert a test goal
    goal_id = ObjectId()
    goal = {
        "_id": goal_id,
        "title": "Build a Recommendation System",
        "description": "Create a movie recommendation system",
        "target_date": datetime.now() + timedelta(days=90),
        "priority": 6,
        "category": "Projects",
        "completed": False,
        "completion_date": None,
        "notes": "Use collaborative filtering",
        "progress": 0,
        "progress_history": [],
        "user_id": ObjectId(auth_headers["user_id"])
    }

    await db.goals.insert_one(goal)

    # Test getting the goal by ID
    response = client.get(f"/api/learning-path/goals/{str(goal_id)}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(goal_id)
    assert data["title"] == "Build a Recommendation System"
    assert data["description"] == "Create a movie recommendation system"
    assert data["category"] == "Projects"
    assert data["notes"] == "Use collaborative filtering"

@pytest.mark.asyncio
async def test_update_goal(client, db, auth_headers):
    """Test updating a goal."""
    # Insert a test goal
    goal_id = ObjectId()
    goal = {
        "_id": goal_id,
        "title": "Learn PyTorch",
        "description": "Master PyTorch fundamentals",
        "target_date": datetime.now() + timedelta(days=30),
        "priority": 7,
        "category": "Tools",
        "completed": False,
        "completion_date": None,
        "notes": "",
        "progress": 0,
        "progress_history": [],
        "user_id": ObjectId(auth_headers["user_id"])
    }

    await db.goals.insert_one(goal)

    # Update the goal
    update_data = {
        "title": "Master PyTorch",
        "description": "Learn PyTorch and implement models",
        "priority": 8,
        "progress": 30
    }

    response = client.put(f"/api/learning-path/goals/{str(goal_id)}", json=update_data, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Master PyTorch"
    assert data["description"] == "Learn PyTorch and implement models"
    assert data["priority"] == 8
    assert data["progress"] == 30
    assert len(data["progress_history"]) == 1

    # Verify it was updated in the database
    db_goal = await db.goals.find_one({"_id": goal_id})
    assert db_goal["title"] == "Master PyTorch"
    assert db_goal["progress"] == 30
    assert len(db_goal["progress_history"]) == 1

@pytest.mark.asyncio
async def test_delete_goal(client, db, auth_headers):
    """Test deleting a goal."""
    # Insert a test goal
    goal_id = ObjectId()
    goal = {
        "_id": goal_id,
        "title": "Learn TensorFlow",
        "description": "Master TensorFlow basics",
        "target_date": datetime.now() + timedelta(days=45),
        "priority": 6,
        "category": "Tools",
        "completed": False,
        "completion_date": None,
        "notes": "",
        "progress": 0,
        "progress_history": [],
        "user_id": ObjectId(auth_headers["user_id"])
    }

    await db.goals.insert_one(goal)

    # Delete the goal
    response = client.delete(f"/api/learning-path/goals/{str(goal_id)}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify it was deleted from the database
    db_goal = await db.goals.find_one({"_id": goal_id})
    assert db_goal is None

@pytest.mark.asyncio
async def test_get_milestones(client, db, auth_headers):
    """Test getting all milestones."""
    # Insert test milestones
    milestones = [
        {
            "title": "Complete Neural Networks Course",
            "description": "Finish the course on Coursera",
            "target_date": datetime.now() + timedelta(days=15),
            "verification_method": "Certificate",
            "resources": ["course_1"],
            "completed": False,
            "completion_date": None,
            "notes": "",
            "user_id": ObjectId(auth_headers["user_id"])
        },
        {
            "title": "Implement CNN Project",
            "description": "Build an image classifier",
            "target_date": datetime.now() + timedelta(days=30),
            "verification_method": "GitHub Repository",
            "resources": ["article_1", "video_2"],
            "completed": False,
            "completion_date": None,
            "notes": "Use PyTorch",
            "user_id": ObjectId(auth_headers["user_id"])
        }
    ]

    await db.milestones.insert_many(milestones)

    # Test getting all milestones
    response = client.get("/api/learning-path/milestones", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "Complete Neural Networks Course"
    assert data[1]["title"] == "Implement CNN Project"
    assert data[1]["verification_method"] == "GitHub Repository"

@pytest.mark.asyncio
async def test_create_milestone(client, db, auth_headers):
    """Test creating a new milestone."""
    new_milestone = {
        "title": "Complete Deep Learning Book",
        "description": "Read and take notes on the Deep Learning book",
        "target_date": (datetime.now() + timedelta(days=60)).isoformat(),
        "verification_method": "Book Summary",
        "resources": ["book_1"],
        "completed": False,
        "notes": "Focus on chapters 1-5 first"
    }

    response = client.post("/api/learning-path/milestones", json=new_milestone, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Complete Deep Learning Book"
    assert data["description"] == "Read and take notes on the Deep Learning book"
    assert data["verification_method"] == "Book Summary"
    assert data["resources"] == ["book_1"]
    assert data["completed"] is False
    assert data["notes"] == "Focus on chapters 1-5 first"
    assert "id" in data

    # Verify it was saved to the database
    db_milestone = await db.milestones.find_one({"_id": ObjectId(data["id"])})
    assert db_milestone is not None
    assert db_milestone["title"] == "Complete Deep Learning Book"
    assert db_milestone["user_id"] == ObjectId(auth_headers["user_id"])

@pytest.mark.asyncio
async def test_update_milestone(client, db, auth_headers):
    """Test updating a milestone."""
    # Insert a test milestone
    milestone_id = ObjectId()
    milestone = {
        "_id": milestone_id,
        "title": "Complete ML Course",
        "description": "Finish the ML course",
        "target_date": datetime.now() + timedelta(days=30),
        "verification_method": "Certificate",
        "resources": ["course_2"],
        "completed": False,
        "completion_date": None,
        "notes": "",
        "user_id": ObjectId(auth_headers["user_id"])
    }

    await db.milestones.insert_one(milestone)

    # Update the milestone
    update_data = {
        "title": "Complete Advanced ML Course",
        "completed": True,
        "notes": "Completed with distinction"
    }

    response = client.put(f"/api/learning-path/milestones/{str(milestone_id)}", json=update_data, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Complete Advanced ML Course"
    assert data["completed"] is True
    assert data["notes"] == "Completed with distinction"
    assert data["completion_date"] is not None

    # Verify it was updated in the database
    db_milestone = await db.milestones.find_one({"_id": milestone_id})
    assert db_milestone["title"] == "Complete Advanced ML Course"
    assert db_milestone["completed"] is True
    assert db_milestone["completion_date"] is not None

@pytest.mark.asyncio
async def test_delete_milestone(client, db, auth_headers):
    """Test deleting a milestone."""
    # Insert a test milestone
    milestone_id = ObjectId()
    milestone = {
        "_id": milestone_id,
        "title": "Implement NLP Project",
        "description": "Build a text classifier",
        "target_date": datetime.now() + timedelta(days=45),
        "verification_method": "GitHub Repository",
        "resources": ["article_3", "video_4"],
        "completed": False,
        "completion_date": None,
        "notes": "",
        "user_id": ObjectId(auth_headers["user_id"])
    }

    await db.milestones.insert_one(milestone)

    # Delete the milestone
    response = client.delete(f"/api/learning-path/milestones/{str(milestone_id)}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify it was deleted from the database
    db_milestone = await db.milestones.find_one({"_id": milestone_id})
    assert db_milestone is None

@pytest.mark.asyncio
async def test_get_learning_path_progress(client, db, auth_headers):
    """Test getting learning path progress."""
    # Insert test goals with different progress levels
    goals = [
        {
            "title": "Goal 1",
            "description": "Description 1",
            "target_date": datetime.now() + timedelta(days=30),
            "priority": 8,
            "category": "Category 1",
            "completed": True,
            "completion_date": datetime.now() - timedelta(days=5),
            "notes": "",
            "progress": 100,
            "progress_history": [
                {
                    "date": datetime.now() - timedelta(days=10),
                    "progress": 50
                },
                {
                    "date": datetime.now() - timedelta(days=5),
                    "progress": 100
                }
            ],
            "user_id": ObjectId(auth_headers["user_id"])
        },
        {
            "title": "Goal 2",
            "description": "Description 2",
            "target_date": datetime.now() + timedelta(days=60),
            "priority": 7,
            "category": "Category 2",
            "completed": False,
            "completion_date": None,
            "notes": "",
            "progress": 50,
            "progress_history": [
                {
                    "date": datetime.now() - timedelta(days=15),
                    "progress": 25
                },
                {
                    "date": datetime.now() - timedelta(days=7),
                    "progress": 50
                }
            ],
            "user_id": ObjectId(auth_headers["user_id"])
        },
        {
            "title": "Goal 3",
            "description": "Description 3",
            "target_date": datetime.now() + timedelta(days=90),
            "priority": 6,
            "category": "Category 1",
            "completed": False,
            "completion_date": None,
            "notes": "",
            "progress": 0,
            "progress_history": [],
            "user_id": ObjectId(auth_headers["user_id"])
        }
    ]

    await db.goals.insert_many(goals)

    # Insert test milestones with different completion status
    milestones = [
        {
            "title": "Milestone 1",
            "description": "Description 1",
            "target_date": datetime.now() + timedelta(days=15),
            "verification_method": "Method 1",
            "resources": ["resource_1"],
            "completed": True,
            "completion_date": datetime.now() - timedelta(days=2),
            "notes": "",
            "user_id": ObjectId(auth_headers["user_id"])
        },
        {
            "title": "Milestone 2",
            "description": "Description 2",
            "target_date": datetime.now() + timedelta(days=30),
            "verification_method": "Method 2",
            "resources": ["resource_2"],
            "completed": False,
            "completion_date": None,
            "notes": "",
            "user_id": ObjectId(auth_headers["user_id"])
        }
    ]

    await db.milestones.insert_many(milestones)

    # Test getting learning path progress
    response = client.get("/api/learning-path/progress", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["overall_progress"] == 50  # (100 + 50 + 0) / 3
    assert data["completed_goals"] == 1
    assert data["total_goals"] == 3
    assert data["completed_milestones"] == 1
    assert data["total_milestones"] == 2
    assert len(data["progress_by_category"]) == 2
    assert "Category 1" in data["progress_by_category"]
    assert "Category 2" in data["progress_by_category"]
    assert len(data["progress_history"]) > 0