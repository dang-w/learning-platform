import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from unittest.mock import patch, MagicMock

from database import db, get_database
from main import UserInDB
from auth import User
from routers.reviews import Concept as ConceptInDB
from routers.progress import Metric as MetricInDB
from routers.learning_path import Goal as GoalInDB, Milestone as MilestoneInDB, Roadmap as RoadmapInDB
from routers.resources import UserResource as ResourceInDB

# Test database interactions directly

@pytest_asyncio.fixture(scope="session")
async def test_user_id():
    # Create a test user
    user_data = {
        "username": "db_test_user",
        "email": "db_test@example.com",
        "hashed_password": "hashed_test_password",
        "first_name": "Test",
"last_name": "User",
        "disabled": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
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
        "first_name": "Test",
"last_name": "User",
        "disabled": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
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
                "first_name": "Updated",
                "last_name": "DB Test User",
                "disabled": True
            }
        }
        await db.users.update_one({"_id": test_user_id}, update_data)

        # 3. Verify update
        updated_user = await db.users.find_one({"_id": test_user_id})
        assert updated_user["first_name"] == "Updated"
        assert updated_user["last_name"] == "DB Test User"
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
    # Get the SAME mock database instance used throughout
    db_conn = await get_database()
    db = db_conn["db"]
    # client = db_conn["client"] # Not strictly needed if only using db object

    user_data = {
        "username": "db_test_resource_user", # Use a unique username for this test
        "email": "db_resource_test@example.com",
        "hashed_password": "hashed_test_password",
        "first_name": "Test",
"last_name": "Resource",
        "disabled": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "resources": {"articles": []} # Initialize resources field
    }

    # Ensure clean slate for this user
    await db.users.delete_many({"username": user_data["username"]})

    # Insert the user using the db instance obtained earlier
    result = await db.users.insert_one(user_data)
    test_user_id = result.inserted_id

    try:
        # 1. Add a resource to user
        resource_id_int = 1 # Use int ID for user resources
        resource_data = {
            "id": resource_id_int,
            "title": "DB Integration Test Resource",
            "url": "https://example.com/test-resource",
            "topics": ["test", "database", "integration"],
            "difficulty": "intermediate",
            "estimated_time": 15,
            "date_added": datetime.now(timezone.utc).isoformat(),
            "completed": False,
            "completion_date": None,
            "notes": "Initial note"
        }

        update_data = {
            "$push": {
                "resources.articles": resource_data
            }
        }
        # Use the same db instance
        await db.users.update_one({"_id": test_user_id}, update_data)

        # Verify resource was added
        user = await db.users.find_one({"_id": test_user_id})
        assert user is not None, "User not found after insert and resource add"
        assert "resources" in user, "'resources' field missing in user doc"
        assert "articles" in user["resources"], "'articles' missing in resources"
        assert isinstance(user["resources"]["articles"], list), "'articles' is not a list"
        assert len(user["resources"]["articles"]) == 1, "Article not added"
        assert user["resources"]["articles"][0]["id"] == resource_id_int, "Added article ID mismatch"

        # 2. Update the resource (using find/modify/update approach)
        user_before_update = await db.users.find_one({"_id": test_user_id})
        assert user_before_update is not None, "User disappeared before update"
        resource_list = user_before_update.get("resources", {}).get("articles", [])
        updated = False
        for i, res in enumerate(resource_list):
            if res.get("id") == resource_id_int:
                resource_list[i]["title"] = "Updated DB Test Resource"
                resource_list[i]["notes"] = "Updated note"
                updated = True
                break
        assert updated, "Resource to update not found in list"

        # Use the same db instance to save the updated list
        await db.users.update_one(
            {"_id": test_user_id},
            {"$set": {"resources.articles": resource_list}}
        )

        # Verify update
        user_after_update = await db.users.find_one({"_id": test_user_id})
        assert user_after_update is not None, "User disappeared after update"
        updated_res = next((r for r in user_after_update["resources"]["articles"] if r.get("id") == resource_id_int), None)
        assert updated_res is not None, "Updated resource not found after update"
        assert updated_res["title"] == "Updated DB Test Resource", "Title not updated"
        assert updated_res["notes"] == "Updated note", "Notes not updated"

        # 3. Complete the resource (using find/modify/update approach)
        user_before_complete = await db.users.find_one({"_id": test_user_id})
        assert user_before_complete is not None, "User disappeared before complete"
        resource_list_complete = user_before_complete.get("resources", {}).get("articles", [])
        completed_flag = False
        now_iso = datetime.now(timezone.utc).isoformat()
        for i, res in enumerate(resource_list_complete):
            if res.get("id") == resource_id_int:
                resource_list_complete[i]["completed"] = True
                resource_list_complete[i]["completion_date"] = now_iso
                completed_flag = True
                break
        assert completed_flag, "Resource to complete not found in list"

        # Use the same db instance
        await db.users.update_one(
            {"_id": test_user_id},
            {"$set": {"resources.articles": resource_list_complete}}
        )

        # Verify completion
        user_after_complete = await db.users.find_one({"_id": test_user_id})
        assert user_after_complete is not None, "User disappeared after complete"
        completed_res = next((r for r in user_after_complete["resources"]["articles"] if r.get("id") == resource_id_int), None)
        assert completed_res is not None, "Completed resource not found after update"
        assert completed_res["completed"] is True, "Resource not marked completed"
        assert completed_res["completion_date"] == now_iso, "Completion date mismatch"

        # 4. Delete the resource
        # Use the same db instance
        await db.users.update_one(
            {"_id": test_user_id},
            {"$pull": {"resources.articles": {"id": resource_id_int}}}
        )

        # Verify deletion
        user_after_delete = await db.users.find_one({"_id": test_user_id})
        assert user_after_delete is not None, "User disappeared after delete"
        deleted_res = next((r for r in user_after_delete["resources"]["articles"] if r.get("id") == resource_id_int), None)
        assert deleted_res is None, "Resource was not deleted"
        assert len(user_after_delete["resources"]["articles"]) == 0, "Resource list not empty after delete"

    finally:
        # Clean up the test user
        await db.users.delete_one({"_id": test_user_id})

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
    # Get the SAME mock database instance used throughout
    db_conn = await get_database()
    db = db_conn["db"]

    user_data = {
        "username": "db_test_concept_user", # Unique username
        "email": "db_concept_test@example.com",
        "hashed_password": "hashed_test_password",
        "first_name": "Test",
"last_name": "Concept",
        "disabled": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "concepts": [] # Initialize concepts array
    }

    # Ensure clean slate
    await db.users.delete_many({"username": user_data["username"]})

    # Insert the user
    result = await db.users.insert_one(user_data)
    test_user_id = result.inserted_id

    try:
        # 1. Add a concept to user
        concept_id_obj = ObjectId() # Keep ObjectId for potential internal use if needed
        concept_id_str = str(concept_id_obj)
        concept_data = {
            "id": concept_id_str,
            "title": "DB Integration Test Concept",
            "description": "Test concept for database integration testing",
            "tags": ["test", "database", "integration"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "reviews": [],
            "next_review_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "review_count": 0,
            "mastery_level": 0
        }

        await db.users.update_one({"_id": test_user_id}, {"$push": {"concepts": concept_data}})

        # Verify concept was added
        user = await db.users.find_one({"_id": test_user_id})
        assert user is not None, "User not found after insert and concept add"
        assert "concepts" in user, "'concepts' field missing"
        assert isinstance(user["concepts"], list), "'concepts' is not a list"
        assert len(user["concepts"]) == 1, "Concept not added"
        assert user["concepts"][0]["id"] == concept_id_str, "Added concept ID mismatch"

        # 2. Update the concept (using find/modify/update)
        user_before_update = await db.users.find_one({"_id": test_user_id})
        assert user_before_update is not None, "User disappeared before concept update"
        concepts_list = user_before_update.get("concepts", [])
        updated = False
        for i, concept in enumerate(concepts_list):
            if concept.get("id") == concept_id_str:
                concepts_list[i]["title"] = "Updated DB Integration Test Concept"
                concepts_list[i]["description"] = "Updated test concept description"
                concepts_list[i]["updated_at"] = datetime.now(timezone.utc).isoformat()
                updated = True
                break
        assert updated, "Concept to update not found in list"

        await db.users.update_one({"_id": test_user_id}, {"$set": {"concepts": concepts_list}})

        # Verify update
        user_after_update = await db.users.find_one({"_id": test_user_id})
        assert user_after_update is not None, "User disappeared after concept update"
        updated_concept = next((c for c in user_after_update.get("concepts", []) if c.get("id") == concept_id_str), None)
        assert updated_concept is not None, "Updated concept not found after update"
        assert updated_concept["title"] == "Updated DB Integration Test Concept", "Concept title not updated"
        assert updated_concept["description"] == "Updated test concept description", "Concept description not updated"

        # 3. Add a review to the concept (using find/modify/update)
        user_before_review = await db.users.find_one({"_id": test_user_id})
        assert user_before_review is not None, "User disappeared before review add"
        concepts_list_review = user_before_review.get("concepts", [])
        review_added = False
        review_id_obj = ObjectId()
        review_id_str = str(review_id_obj)
        for i, concept in enumerate(concepts_list_review):
            if concept.get("id") == concept_id_str:
                review_data = {
                    "id": review_id_str,
                    "date": datetime.now(timezone.utc).isoformat(),
                    "rating": 4,
                    "notes": "Test review note"
                }
                if "reviews" not in concepts_list_review[i] or not isinstance(concepts_list_review[i]["reviews"], list):
                    concepts_list_review[i]["reviews"] = [] # Ensure reviews list exists
                concepts_list_review[i]["reviews"].append(review_data)
                concepts_list_review[i]["review_count"] = concepts_list_review[i].get("review_count", 0) + 1
                concepts_list_review[i]["mastery_level"] = 1 # Example update
                concepts_list_review[i]["next_review_date"] = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
                review_added = True
                break
        assert review_added, "Concept to add review to not found"

        await db.users.update_one({"_id": test_user_id}, {"$set": {"concepts": concepts_list_review}})

        # Verify review addition
        user_after_review = await db.users.find_one({"_id": test_user_id})
        assert user_after_review is not None, "User disappeared after review add"
        concept_after_review = next((c for c in user_after_review.get("concepts", []) if c.get("id") == concept_id_str), None)
        assert concept_after_review is not None, "Concept not found after review add"
        assert "reviews" in concept_after_review and len(concept_after_review["reviews"]) == 1, "Review not added to concept"
        assert concept_after_review["reviews"][0]["id"] == review_id_str, "Review ID mismatch"
        assert concept_after_review.get("review_count") == 1, "Review count not updated"
        assert concept_after_review.get("mastery_level") == 1, "Mastery level not updated"

        # 4. Delete the concept
        await db.users.update_one({"_id": test_user_id}, {"$pull": {"concepts": {"id": concept_id_str}}})

        # Verify deletion
        user_after_delete = await db.users.find_one({"_id": test_user_id})
        assert user_after_delete is not None, "User disappeared after concept delete"
        deleted_concept = next((c for c in user_after_delete.get("concepts", []) if c.get("id") == concept_id_str), None)
        assert deleted_concept is None, "Concept was not deleted"
        assert len(user_after_delete.get("concepts", [])) == 0, "Concepts list not empty after delete"

    finally:
        # Clean up the test user
        await db.users.delete_one({"_id": test_user_id})

@pytest.mark.integration
@pytest.mark.asyncio
async def test_metric_operations():
    """
    Test metric operations:
    1. Add a metric to user
    2. Update the metric
    3. Delete the metric
    """
    # Get the SAME mock database instance used throughout
    db_conn = await get_database()
    db = db_conn["db"]

    user_data = {
        "username": "db_test_metric_user", # Unique username
        "email": "db_metric_test@example.com",
        "hashed_password": "hashed_test_password",
        "first_name": "Test",
"last_name": "Metric",
        "disabled": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "metrics": [] # Initialize metrics array
    }

    # Ensure clean slate
    await db.users.delete_many({"username": user_data["username"]})

    # Insert the user
    result = await db.users.insert_one(user_data)
    test_user_id = result.inserted_id

    try:
        # 1. Add a metric to user
        metric_id_obj = ObjectId()
        metric_id_str = str(metric_id_obj)
        metric_data = {
            "id": metric_id_str,
            "name": "DB Integration Test Metric",
            "description": "Test metric for database integration testing",
            "target": 100,
            "current": 25,
            "unit": "points",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "history": [
                {
                    "date": datetime.now(timezone.utc).isoformat(),
                    "value": 25
                }
            ]
        }

        await db.users.update_one({"_id": test_user_id}, {"$push": {"metrics": metric_data}})

        # Verify metric was added
        user = await db.users.find_one({"_id": test_user_id})
        assert user is not None, "User not found after insert and metric add"
        assert "metrics" in user, "'metrics' field missing"
        assert isinstance(user["metrics"], list), "'metrics' is not a list"
        assert len(user["metrics"]) == 1, "Metric not added"
        assert user["metrics"][0]["id"] == metric_id_str, "Added metric ID mismatch"

        # 2. Update the metric (using find/modify/update)
        user_before_update = await db.users.find_one({"_id": test_user_id})
        assert user_before_update is not None, "User disappeared before metric update"
        metrics_list = user_before_update.get("metrics", [])
        updated = False
        history_date = datetime.now(timezone.utc).isoformat()
        for i, metric in enumerate(metrics_list):
            if metric.get("id") == metric_id_str:
                metrics_list[i]["current"] = 50
                metrics_list[i]["updated_at"] = history_date # Use same timestamp
                if "history" not in metrics_list[i] or not isinstance(metrics_list[i]["history"], list):
                    metrics_list[i]["history"] = [] # Ensure history list exists
                metrics_list[i]["history"].append({
                    "date": history_date,
                    "value": 50
                })
                updated = True
                break
        assert updated, "Metric to update not found in list"

        await db.users.update_one({"_id": test_user_id}, {"$set": {"metrics": metrics_list}})

        # Verify update
        user_after_update = await db.users.find_one({"_id": test_user_id})
        assert user_after_update is not None, "User disappeared after metric update"
        updated_metric = next((m for m in user_after_update.get("metrics", []) if m.get("id") == metric_id_str), None)
        assert updated_metric is not None, "Updated metric not found after update"
        assert updated_metric["current"] == 50, "Metric current value not updated"
        assert len(updated_metric.get("history", [])) == 2, "Metric history not updated"

        # 3. Delete the metric
        await db.users.update_one({"_id": test_user_id}, {"$pull": {"metrics": {"id": metric_id_str}}})

        # Verify deletion
        user_after_delete = await db.users.find_one({"_id": test_user_id})
        assert user_after_delete is not None, "User disappeared after metric delete"
        deleted_metric = next((m for m in user_after_delete.get("metrics", []) if m.get("id") == metric_id_str), None)
        assert deleted_metric is None, "Metric was not deleted"
        assert len(user_after_delete.get("metrics", [])) == 0, "Metrics list not empty after delete"

    finally:
        # Clean up the test user
        await db.users.delete_one({"_id": test_user_id})

@pytest.mark.integration
@pytest.mark.asyncio
async def test_learning_path_operations():
    """
    Test learning path operations:
    1. Add a goal to user
    2. Add a milestone to user
    3. Create a roadmap (assuming roadmap is a single top-level field)
    4. Update the goal
    5. Update the milestone
    6. Update the roadmap
    7. Delete the goal, milestone, and roadmap
    """
    # Get the SAME mock database instance used throughout
    db_conn = await get_database()
    db = db_conn["db"]

    user_data = {
        "username": "db_test_lp_user", # Unique username
        "email": "db_lp_test@example.com",
        "hashed_password": "hashed_test_password",
        "first_name": "Test",
"last_name": "LearningPath",
        "disabled": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "goals": [], # Initialize relevant arrays
        "milestones": [],
        "roadmap": {} # Initialize roadmap field
    }

    # Ensure clean slate
    await db.users.delete_many({"username": user_data["username"]})

    # Insert the user
    result = await db.users.insert_one(user_data)
    test_user_id = result.inserted_id

    try:
        # 1. Add a goal to user
        goal_id_obj = ObjectId()
        goal_id_str = str(goal_id_obj)
        goal_data = {
            "id": goal_id_str,
            "title": "DB Integration Test Goal",
            "description": "Test goal for database integration testing",
            "target_date": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
            "priority": 8,
            "category": "Testing",
            "completed": False,
            "completion_date": None,
            "notes": ""
        }
        await db.users.update_one({"_id": test_user_id}, {"$push": {"goals": goal_data}})

        # Verify goal was added
        user_g1 = await db.users.find_one({"_id": test_user_id})
        assert user_g1 is not None, "User not found after goal add"
        assert len(user_g1.get("goals", [])) == 1, "Goal not added"
        assert user_g1["goals"][0]["id"] == goal_id_str, "Goal ID mismatch"

        # 2. Add a milestone to user
        milestone_id_obj = ObjectId()
        milestone_id_str = str(milestone_id_obj)
        milestone_data = {
            "id": milestone_id_str,
            "title": "DB Integration Test Milestone",
            "description": "Test milestone for database integration testing",
            "target_date": (datetime.now(timezone.utc) + timedelta(days=15)).strftime("%Y-%m-%d"),
            "verification_method": "Test Completion",
            "resources": [],
            "completed": False,
            "completion_date": None,
            "notes": ""
        }
        await db.users.update_one({"_id": test_user_id}, {"$push": {"milestones": milestone_data}})

        # Verify milestone was added
        user_m1 = await db.users.find_one({"_id": test_user_id})
        assert user_m1 is not None, "User not found after milestone add"
        assert len(user_m1.get("milestones", [])) == 1, "Milestone not added"
        assert user_m1["milestones"][0]["id"] == milestone_id_str, "Milestone ID mismatch"

        # 3. Create a roadmap (assuming it's a single field)
        roadmap_id_obj = ObjectId()
        roadmap_id_str = str(roadmap_id_obj)
        roadmap_data = {
            "id": roadmap_id_str,
            "title": "DB Integration Test Roadmap",
            "description": "Test roadmap description",
            "phases": [{
                "title": "Phase 1",
                "description": "First phase",
                "items": [{"title": "Item 1", "completed": False}]
            }],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.update_one({"_id": test_user_id}, {"$set": {"roadmap": roadmap_data}})

        # Verify roadmap was created
        user_r1 = await db.users.find_one({"_id": test_user_id})
        assert user_r1 is not None, "User not found after roadmap create"
        assert isinstance(user_r1.get("roadmap"), dict), "Roadmap field is not a dict"
        assert user_r1["roadmap"].get("id") == roadmap_id_str, "Roadmap ID mismatch"

        # 4. Update the goal (using find/modify/update)
        user_before_goal_update = await db.users.find_one({"_id": test_user_id})
        assert user_before_goal_update is not None, "User disappeared before goal update"
        goals_list = user_before_goal_update.get("goals", [])
        goal_updated = False
        for i, goal in enumerate(goals_list):
            if goal.get("id") == goal_id_str:
                goals_list[i]["title"] = "Updated DB Test Goal"
                goals_list[i]["priority"] = 9
                goal_updated = True
                break
        assert goal_updated, "Goal to update not found"
        await db.users.update_one({"_id": test_user_id}, {"$set": {"goals": goals_list}})

        # Verify goal update
        user_g2 = await db.users.find_one({"_id": test_user_id})
        assert user_g2 is not None, "User disappeared after goal update"
        updated_goal = next((g for g in user_g2.get("goals", []) if g.get("id") == goal_id_str), None)
        assert updated_goal is not None, "Updated goal not found"
        assert updated_goal["title"] == "Updated DB Test Goal", "Goal title not updated"
        assert updated_goal["priority"] == 9, "Goal priority not updated"

        # 5. Update the milestone (using find/modify/update)
        user_before_ms_update = await db.users.find_one({"_id": test_user_id})
        assert user_before_ms_update is not None, "User disappeared before milestone update"
        milestones_list = user_before_ms_update.get("milestones", [])
        ms_updated = False
        for i, ms in enumerate(milestones_list):
            if ms.get("id") == milestone_id_str:
                milestones_list[i]["description"] = "Updated milestone description"
                ms_updated = True
                break
        assert ms_updated, "Milestone to update not found"
        await db.users.update_one({"_id": test_user_id}, {"$set": {"milestones": milestones_list}})

        # Verify milestone update
        user_m2 = await db.users.find_one({"_id": test_user_id})
        assert user_m2 is not None, "User disappeared after milestone update"
        updated_ms = next((m for m in user_m2.get("milestones", []) if m.get("id") == milestone_id_str), None)
        assert updated_ms is not None, "Updated milestone not found"
        assert updated_ms["description"] == "Updated milestone description", "Milestone description not updated"

        # 6. Update the roadmap
        updated_roadmap_data = roadmap_data.copy()
        updated_roadmap_data["title"] = "Updated DB Test Roadmap"
        updated_roadmap_data["phases"][0]["items"][0]["completed"] = True
        updated_roadmap_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"_id": test_user_id}, {"$set": {"roadmap": updated_roadmap_data}})

        # Verify roadmap update
        user_r2 = await db.users.find_one({"_id": test_user_id})
        assert user_r2 is not None, "User disappeared after roadmap update"
        assert user_r2["roadmap"]["title"] == "Updated DB Test Roadmap", "Roadmap title not updated"
        assert user_r2["roadmap"]["phases"][0]["items"][0]["completed"] is True, "Roadmap item completion not updated"

        # 7. Delete the goal, milestone, and roadmap
        await db.users.update_one({"_id": test_user_id}, {"$pull": {"goals": {"id": goal_id_str}}})
        await db.users.update_one({"_id": test_user_id}, {"$pull": {"milestones": {"id": milestone_id_str}}})
        await db.users.update_one({"_id": test_user_id}, {"$unset": {"roadmap": ""}})

        # Verify deletion
        user_final = await db.users.find_one({"_id": test_user_id})
        assert user_final is not None, "User disappeared after deletions"
        assert len(user_final.get("goals", [])) == 0, "Goal not deleted"
        assert len(user_final.get("milestones", [])) == 0, "Milestone not deleted"
        assert "roadmap" not in user_final or not user_final["roadmap"], "Roadmap not deleted/unset"

    finally:
        # Clean up the test user
        await db.users.delete_one({"_id": test_user_id})

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
        "first_name": "Progress",
        "last_name": "Test User",
        "disabled": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
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
            "last_activity": datetime.now(timezone.utc).isoformat(),
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
                progress_entries[i]["last_activity"] = datetime.now(timezone.utc).isoformat()
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