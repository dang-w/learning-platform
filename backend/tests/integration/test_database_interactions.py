import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from bson import ObjectId

from database import db, get_database
from main import UserInDB
from auth import User
from routers.reviews import Concept as ConceptInDB
from routers.progress import Metric as MetricInDB
from routers.learning_path import Goal as GoalInDB, Milestone as MilestoneInDB, Roadmap as RoadmapInDB
from routers.resources import Resource as ResourceInDB

# Test database interactions directly

@pytest_asyncio.fixture(scope="session")
async def test_user_id():
    # Create a test user
    user_data = {
        "username": "db_test_user",
        "email": "db_test@example.com",
        "hashed_password": "hashed_test_password",
        "full_name": "Test User",
        "disabled": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    # Check if user already exists and delete if needed
    existing_user = await db.users.find_one({"email": user_data["email"]})
    if existing_user:
        await db.users.delete_one({"_id": existing_user["_id"]})

    # Insert the user
    result = await db.users.insert_one(user_data)
    user_id = result.inserted_id

    yield user_id

    # Clean up after tests
    await db.users.delete_one({"_id": user_id})

@pytest.mark.integration
@pytest.mark.asyncio
async def test_user_crud_operations():
    """
    Test CRUD operations for user data:
    1. Read user
    2. Update user
    3. Verify update
    """
    # Create a test user
    db_conn = await get_database()
    db = db_conn["db"]
    client = db_conn["client"]

    user_data = {
        "username": "db_test_user",
        "email": "db_test@example.com",
        "hashed_password": "hashed_test_password",
        "full_name": "Test User",
        "disabled": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    # Check if user already exists and delete if needed
    existing_user = await db.users.find_one({"email": user_data["email"]})
    if existing_user:
        await db.users.delete_one({"_id": existing_user["_id"]})

    # Insert the user
    result = await db.users.insert_one(user_data)
    test_user_id = result.inserted_id

    try:
        # 1. Read user
        user = await db.users.find_one({"_id": test_user_id})
        assert user is not None
        assert user["email"] == "db_test@example.com"

        # 2. Update user
        update_data = {
            "$set": {
                "full_name": "Updated DB Test User",
                "disabled": True
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # 3. Verify update
        updated_user = await db.users.find_one({"_id": test_user_id})
        assert updated_user["full_name"] == "Updated DB Test User"
        assert updated_user["disabled"] == True
    finally:
        # Clean up after tests
        await db.users.delete_one({"_id": test_user_id})
        # Close the client connection
        client.close()

@pytest.mark.integration
@pytest.mark.asyncio
async def test_resource_operations():
    """
    Test resource operations:
    1. Add a resource to user
    2. Update the resource
    3. Complete the resource
    4. Delete the resource
    """
    # Create a test user
    db_conn = await get_database()
    db = db_conn["db"]
    client = db_conn["client"]

    user_data = {
        "username": "db_test_user",
        "email": "db_test@example.com",
        "hashed_password": "hashed_test_password",
        "full_name": "Test User",
        "disabled": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "resources": {"articles": []}
    }

    # Check if user already exists and delete if needed
    existing_user = await db.users.find_one({"email": user_data["email"]})
    if existing_user:
        await db.users.delete_one({"_id": existing_user["_id"]})

    # Insert the user
    result = await db.users.insert_one(user_data)
    test_user_id = result.inserted_id

    try:
        # 1. Add a resource to user
        resource_id = ObjectId()
        resource_data = {
            "id": str(resource_id),
            "title": "DB Integration Test Resource",
            "url": "https://example.com/test-resource",
            "description": "Test resource for database integration testing",
            "resource_type": "article",
            "tags": ["test", "database", "integration"],
            "added_date": datetime.now().isoformat(),
            "completed": False,
            "completion_date": None,
            "notes": ""
        }

        update_data = {
            "$push": {
                "resources.articles": resource_data
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify resource was added
        user = await db.users.find_one({"_id": test_user_id})
        assert len(user["resources"]["articles"]) > 0
        assert user["resources"]["articles"][-1]["id"] == str(resource_id)

        # 2. Update the resource by pulling and pushing
        # First, get the current resources
        user = await db.users.find_one({"_id": test_user_id})
        resources = user["resources"]["articles"]

        # Find and update the target resource
        for i, resource in enumerate(resources):
            if resource["id"] == str(resource_id):
                resources[i]["title"] = "Updated DB Integration Test Resource"
                resources[i]["tags"].append("updated")
                break

        # Update the entire resources array
        update_data = {
            "$set": {
                "resources.articles": resources
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify resource was updated
        user = await db.users.find_one({"_id": test_user_id})
        updated_resource = next((r for r in user["resources"]["articles"] if r["id"] == str(resource_id)), None)
        assert updated_resource["title"] == "Updated DB Integration Test Resource"
        assert "updated" in updated_resource["tags"]

        # 3. Complete the resource
        # First, get the current resources again
        user = await db.users.find_one({"_id": test_user_id})
        resources = user["resources"]["articles"]

        # Find and update the target resource
        for i, resource in enumerate(resources):
            if resource["id"] == str(resource_id):
                resources[i]["completed"] = True
                resources[i]["completion_date"] = datetime.now().isoformat()
                break

        # Update the entire resources array
        update_data = {
            "$set": {
                "resources.articles": resources
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify resource was completed
        user = await db.users.find_one({"_id": test_user_id})
        completed_resource = next((r for r in user["resources"]["articles"] if r["id"] == str(resource_id)), None)
        assert completed_resource["completed"] == True
        assert completed_resource["completion_date"] is not None

        # 4. Delete the resource
        delete_resource_data = {
            "$pull": {
                "resources.articles": {"id": str(resource_id)}
            }
        }
        await db.users.update_one({"_id": test_user_id}, delete_resource_data)

        # Verify deletion
        user = await db.users.find_one({"_id": test_user_id})
        deleted_resource = next((r for r in user["resources"]["articles"] if r["id"] == str(resource_id)), None)
        assert deleted_resource is None
    finally:
        # Clean up after tests
        await db.users.delete_one({"_id": test_user_id})
        # Close the client connection
        client.close()

@pytest.mark.integration
@pytest.mark.asyncio
async def test_concept_operations():
    """
    Test concept operations:
    1. Add a concept to user
    2. Update the concept
    3. Add a review to the concept
    4. Delete the concept
    """
    # Create a test user
    db_conn = await get_database()
    db = db_conn["db"]
    client = db_conn["client"]

    user_data = {
        "username": "db_test_user",
        "email": "db_test@example.com",
        "hashed_password": "hashed_test_password",
        "full_name": "Test User",
        "disabled": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "concepts": []
    }

    # Check if user already exists and delete if needed
    existing_user = await db.users.find_one({"email": user_data["email"]})
    if existing_user:
        await db.users.delete_one({"_id": existing_user["_id"]})

    # Insert the user
    result = await db.users.insert_one(user_data)
    test_user_id = result.inserted_id

    try:
        # 1. Add a concept to user
        concept_id = ObjectId()
        concept_data = {
            "id": str(concept_id),
            "title": "DB Integration Test Concept",
            "description": "Test concept for database integration testing",
            "tags": ["test", "database", "integration"],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "reviews": [],
            "next_review_date": (datetime.now() + timedelta(days=1)).isoformat(),
            "review_count": 0,
            "mastery_level": 0
        }

        update_data = {
            "$push": {
                "concepts": concept_data
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify concept was added
        user = await db.users.find_one({"_id": test_user_id})
        assert len(user["concepts"]) > 0
        assert user["concepts"][-1]["id"] == str(concept_id)

        # 2. Update the concept
        # First, get the current concepts
        user = await db.users.find_one({"_id": test_user_id})
        concepts = user["concepts"]

        # Find and update the target concept
        for i, concept in enumerate(concepts):
            if concept["id"] == str(concept_id):
                concepts[i]["title"] = "Updated DB Integration Test Concept"
                concepts[i]["description"] = "Updated test concept for database integration testing"
                concepts[i]["updated_at"] = datetime.now().isoformat()
                break

        # Update the entire concepts array
        update_data = {
            "$set": {
                "concepts": concepts
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify concept was updated
        user = await db.users.find_one({"_id": test_user_id})
        updated_concept = next((c for c in user["concepts"] if c["id"] == str(concept_id)), None)
        assert updated_concept["title"] == "Updated DB Integration Test Concept"
        assert updated_concept["description"] == "Updated test concept for database integration testing"

        # 3. Add a review to the concept
        # First, get the current concepts again
        user = await db.users.find_one({"_id": test_user_id})
        concepts = user["concepts"]

        # Find the target concept and add a review
        for i, concept in enumerate(concepts):
            if concept["id"] == str(concept_id):
                review = {
                    "id": str(ObjectId()),
                    "date": datetime.now().isoformat(),
                    "rating": 4,
                    "notes": "Test review for database integration testing"
                }
                concepts[i]["reviews"].append(review)
                concepts[i]["review_count"] += 1
                concepts[i]["mastery_level"] = 1
                concepts[i]["next_review_date"] = (datetime.now() + timedelta(days=3)).isoformat()
                break

        # Update the entire concepts array
        update_data = {
            "$set": {
                "concepts": concepts
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify review was added
        user = await db.users.find_one({"_id": test_user_id})
        updated_concept = next((c for c in user["concepts"] if c["id"] == str(concept_id)), None)
        assert len(updated_concept["reviews"]) > 0
        assert updated_concept["review_count"] == 1
        assert updated_concept["mastery_level"] == 1

        # 4. Delete the concept
        delete_concept_data = {
            "$pull": {
                "concepts": {"id": str(concept_id)}
            }
        }
        await db.users.update_one({"_id": test_user_id}, delete_concept_data)

        # Verify deletion
        user = await db.users.find_one({"_id": test_user_id})
        deleted_concept = next((c for c in user["concepts"] if c["id"] == str(concept_id)), None)
        assert deleted_concept is None
    finally:
        # Clean up after tests
        await db.users.delete_one({"_id": test_user_id})
        # Close the client connection
        client.close()

@pytest.mark.integration
@pytest.mark.asyncio
async def test_metric_operations():
    """
    Test metric operations:
    1. Add a metric to user
    2. Update the metric
    3. Delete the metric
    """
    # Create a test user
    db_conn = await get_database()
    db = db_conn["db"]
    client = db_conn["client"]

    user_data = {
        "username": "db_test_user",
        "email": "db_test@example.com",
        "hashed_password": "hashed_test_password",
        "full_name": "Test User",
        "disabled": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "metrics": []
    }

    # Check if user already exists and delete if needed
    existing_user = await db.users.find_one({"email": user_data["email"]})
    if existing_user:
        await db.users.delete_one({"_id": existing_user["_id"]})

    # Insert the user
    result = await db.users.insert_one(user_data)
    test_user_id = result.inserted_id

    try:
        # 1. Add a metric to user
        metric_id = ObjectId()
        metric_data = {
            "id": str(metric_id),
            "name": "DB Integration Test Metric",
            "description": "Test metric for database integration testing",
            "target": 100,
            "current": 25,
            "unit": "points",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "history": [
                {
                    "date": datetime.now().isoformat(),
                    "value": 25
                }
            ]
        }

        update_data = {
            "$push": {
                "metrics": metric_data
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify metric was added
        user = await db.users.find_one({"_id": test_user_id})
        assert len(user["metrics"]) > 0
        assert user["metrics"][-1]["id"] == str(metric_id)

        # 2. Update the metric
        # First, get the current metrics
        user = await db.users.find_one({"_id": test_user_id})
        metrics = user["metrics"]

        # Find and update the target metric
        for i, metric in enumerate(metrics):
            if metric["id"] == str(metric_id):
                metrics[i]["current"] = 50
                metrics[i]["updated_at"] = datetime.now().isoformat()
                metrics[i]["history"].append({
                    "date": datetime.now().isoformat(),
                    "value": 50
                })
                break

        # Update the entire metrics array
        update_data = {
            "$set": {
                "metrics": metrics
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify metric was updated
        user = await db.users.find_one({"_id": test_user_id})
        updated_metric = next((m for m in user["metrics"] if m["id"] == str(metric_id)), None)
        assert updated_metric["current"] == 50
        assert len(updated_metric["history"]) == 2

        # 3. Delete the metric
        delete_metric_data = {
            "$pull": {
                "metrics": {"id": str(metric_id)}
            }
        }
        await db.users.update_one({"_id": test_user_id}, delete_metric_data)

        # Verify deletion
        user = await db.users.find_one({"_id": test_user_id})
        deleted_metric = next((m for m in user["metrics"] if m["id"] == str(metric_id)), None)
        assert deleted_metric is None
    finally:
        # Clean up after tests
        await db.users.delete_one({"_id": test_user_id})
        # Close the client connection
        client.close()

@pytest.mark.integration
@pytest.mark.asyncio
async def test_learning_path_operations():
    """
    Test learning path operations:
    1. Add a goal to user
    2. Add a milestone to user
    3. Create a roadmap
    4. Update the goal
    5. Update the milestone
    6. Update the roadmap
    7. Delete the goal, milestone, and roadmap
    """
    # Create a test user
    db_conn = await get_database()
    db = db_conn["db"]
    client = db_conn["client"]

    user_data = {
        "username": "db_test_user",
        "email": "db_test@example.com",
        "hashed_password": "hashed_test_password",
        "full_name": "Test User",
        "disabled": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "goals": [],
        "milestones": [],
        "roadmap": {}
    }

    # Check if user already exists and delete if needed
    existing_user = await db.users.find_one({"email": user_data["email"]})
    if existing_user:
        await db.users.delete_one({"_id": existing_user["_id"]})

    # Insert the user
    result = await db.users.insert_one(user_data)
    test_user_id = result.inserted_id

    try:
        # 1. Add a goal to user
        goal_id = ObjectId()
        goal_data = {
            "id": str(goal_id),
            "title": "DB Integration Test Goal",
            "description": "Test goal for database integration testing",
            "target_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "priority": 8,
            "category": "Testing",
            "completed": False,
            "completion_date": None,
            "notes": ""
        }

        update_data = {
            "$push": {
                "goals": goal_data
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify goal was added
        user = await db.users.find_one({"_id": test_user_id})
        assert len(user["goals"]) > 0
        assert user["goals"][-1]["id"] == str(goal_id)

        # 2. Add a milestone to user
        milestone_id = ObjectId()
        milestone_data = {
            "id": str(milestone_id),
            "title": "DB Integration Test Milestone",
            "description": "Test milestone for database integration testing",
            "target_date": (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d"),
            "verification_method": "Test Completion",
            "resources": [],
            "completed": False,
            "completion_date": None,
            "notes": ""
        }

        update_data = {
            "$push": {
                "milestones": milestone_data
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify milestone was added
        user = await db.users.find_one({"_id": test_user_id})
        assert len(user["milestones"]) > 0
        assert user["milestones"][-1]["id"] == str(milestone_id)

        # 3. Create a roadmap
        roadmap_id = ObjectId()
        roadmap_data = {
            "id": str(roadmap_id),
            "title": "DB Integration Test Roadmap",
            "description": "Test roadmap for database integration testing",
            "phases": [
                {
                    "title": "Phase 1",
                    "description": "First phase of testing",
                    "items": [
                        {
                            "title": "Learn Database Integration Testing",
                            "completed": False
                        }
                    ]
                }
            ],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        update_data = {
            "$set": {
                "roadmap": roadmap_data
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify roadmap was created
        user = await db.users.find_one({"_id": test_user_id})
        assert user["roadmap"]["id"] == str(roadmap_id)

        # 4. Update the goal by pulling and pushing
        # First, get the current goals
        user = await db.users.find_one({"_id": test_user_id})
        goals = user["goals"]

        # Find and update the target goal
        for i, goal in enumerate(goals):
            if goal["id"] == str(goal_id):
                goals[i]["title"] = "Updated DB Integration Test Goal"
                goals[i]["priority"] = 9
                break

        # Update the entire goals array
        update_data = {
            "$set": {
                "goals": goals
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify goal was updated
        user = await db.users.find_one({"_id": test_user_id})
        updated_goal = next((g for g in user["goals"] if g["id"] == str(goal_id)), None)
        assert updated_goal["title"] == "Updated DB Integration Test Goal"
        assert updated_goal["priority"] == 9

        # 5. Update the milestone by pulling and pushing
        # First, get the current milestones
        user = await db.users.find_one({"_id": test_user_id})
        milestones = user["milestones"]

        # Find and update the target milestone
        for i, milestone in enumerate(milestones):
            if milestone["id"] == str(milestone_id):
                milestones[i]["title"] = "Updated DB Integration Test Milestone"
                milestones[i]["verification_method"] = "Updated Test Completion"
                break

        # Update the entire milestones array
        update_data = {
            "$set": {
                "milestones": milestones
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify milestone was updated
        user = await db.users.find_one({"_id": test_user_id})
        updated_milestone = next((m for m in user["milestones"] if m["id"] == str(milestone_id)), None)
        assert updated_milestone["title"] == "Updated DB Integration Test Milestone"
        assert updated_milestone["verification_method"] == "Updated Test Completion"

        # 6. Update the roadmap
        # First, get the current roadmap
        user = await db.users.find_one({"_id": test_user_id})
        roadmap = user["roadmap"]

        # Update the roadmap
        roadmap["title"] = "Updated DB Integration Test Roadmap"
        roadmap["phases"][0]["title"] = "Updated Phase 1"
        roadmap["updated_at"] = datetime.now().isoformat()

        # Update the roadmap
        update_data = {
            "$set": {
                "roadmap": roadmap
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify roadmap was updated
        user = await db.users.find_one({"_id": test_user_id})
        assert user["roadmap"]["title"] == "Updated DB Integration Test Roadmap"
        assert user["roadmap"]["phases"][0]["title"] == "Updated Phase 1"

        # 7. Delete the goal, milestone, and roadmap
        delete_goal_data = {
            "$pull": {
                "goals": {"id": str(goal_id)}
            }
        }
        await db.users.update_one({"_id": test_user_id}, delete_goal_data)

        delete_milestone_data = {
            "$pull": {
                "milestones": {"id": str(milestone_id)}
            }
        }
        await db.users.update_one({"_id": test_user_id}, delete_milestone_data)

        delete_roadmap_data = {
            "$set": {
                "roadmap": {}
            }
        }
        await db.users.update_one({"_id": test_user_id}, delete_roadmap_data)

        # Verify deletion
        user = await db.users.find_one({"_id": test_user_id})
        deleted_goal = next((g for g in user["goals"] if g["id"] == str(goal_id)), None)
        deleted_milestone = next((m for m in user["milestones"] if m["id"] == str(milestone_id)), None)
        assert deleted_goal is None
        assert deleted_milestone is None
        assert user["roadmap"] == {}
    finally:
        # Clean up after tests
        await db.users.delete_one({"_id": test_user_id})
        # Close the client connection
        client.close()

@pytest.mark.integration
@pytest.mark.asyncio
async def test_progress_operations():
    """
    Test progress operations:
    1. Add a progress entry to user
    2. Update the progress entry
    3. Delete the progress entry
    """
    # Create a test user
    db_conn = await get_database()
    db = db_conn["db"]
    client = db_conn["client"]

    user_data = {
        "username": "progress_test_user",
        "email": "progress_test@example.com",
        "hashed_password": "hashed_test_password",
        "full_name": "Progress Test User",
        "disabled": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "progress": []
    }

    # Check if user already exists and delete if needed
    existing_user = await db.users.find_one({"email": user_data["email"]})
    if existing_user:
        await db.users.delete_one({"_id": existing_user["_id"]})

    # Insert the user
    result = await db.users.insert_one(user_data)
    test_user_id = result.inserted_id

    try:
        # 1. Add a progress entry to user
        progress_id = str(ObjectId())
        progress_data = {
            "id": progress_id,
            "resource_id": str(ObjectId()),
            "resource_type": "course",
            "title": "Test Course",
            "progress_percentage": 25,
            "last_activity": datetime.utcnow().isoformat(),
            "completed": False,
            "completion_date": None,
            "notes": "Test progress entry"
        }

        update_data = {
            "$push": {
                "progress": progress_data
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify progress was added
        user = await db.users.find_one({"_id": test_user_id})
        assert len(user["progress"]) > 0
        assert user["progress"][-1]["id"] == progress_id

        # 2. Update the progress entry
        # First, get the current progress entries
        user = await db.users.find_one({"_id": test_user_id})
        progress_entries = user["progress"]

        # Find and update the target progress entry
        for i, entry in enumerate(progress_entries):
            if entry["id"] == progress_id:
                progress_entries[i]["progress_percentage"] = 50
                progress_entries[i]["last_activity"] = datetime.utcnow().isoformat()
                progress_entries[i]["notes"] = "Updated test progress entry"
                break

        # Update the entire progress array
        update_data = {
            "$set": {
                "progress": progress_entries
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify progress was updated
        user = await db.users.find_one({"_id": test_user_id})
        updated_progress = next((p for p in user["progress"] if p["id"] == progress_id), None)
        assert updated_progress["progress_percentage"] == 50
        assert updated_progress["notes"] == "Updated test progress entry"

        # 3. Delete the progress entry
        delete_progress_data = {
            "$pull": {
                "progress": {"id": progress_id}
            }
        }
        await db.users.update_one({"_id": test_user_id}, delete_progress_data)

        # Verify deletion
        user = await db.users.find_one({"_id": test_user_id})
        deleted_progress = next((p for p in user["progress"] if p["id"] == progress_id), None)
        assert deleted_progress is None
    finally:
        # Clean up after tests
        await db.users.delete_one({"_id": test_user_id})
        # Close the client connection
        client.close()

@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_test_user():
    """
    Test creating a test user in the database and verifying it exists.
    This test is useful for debugging authentication issues in other tests.
    """
    # Create a test user
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
    result = await db.users.insert_one(user_data)
    user_id = result.inserted_id

    # Verify the user was created
    user = await db.users.find_one({"username": username})
    assert user is not None, f"Failed to create test user {username} in database"
    assert user["email"] == f"{username}@example.com"

    # Clean up after test
    await db.users.delete_one({"_id": user_id})