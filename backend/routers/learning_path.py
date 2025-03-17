from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv
import motor.motor_asyncio
import logging

# Load environment variables
load_dotenv()

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.learning_platform_db

# Create router
router = APIRouter()

# Import authentication functions from auth
from auth import get_current_active_user, User

# Models
class MilestoneBase(BaseModel):
    title: str
    description: str
    target_date: str
    verification_method: str
    resources: List[str] = []

class MilestoneCreate(MilestoneBase):
    notes: Optional[str] = ""

class Milestone(MilestoneBase):
    id: str
    completed: bool = False
    completion_date: Optional[str] = None
    notes: str = ""

class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[str] = None
    verification_method: Optional[str] = None
    resources: Optional[List[str]] = None
    completed: Optional[bool] = None
    notes: Optional[str] = None

class GoalBase(BaseModel):
    title: str
    description: str
    target_date: str
    priority: int
    category: str

class GoalCreate(GoalBase):
    pass

class Goal(GoalBase):
    id: str
    completed: bool = False
    completion_date: Optional[str] = None
    notes: str = ""

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[str] = None
    priority: Optional[int] = None
    category: Optional[str] = None
    completed: Optional[bool] = None
    notes: Optional[str] = None
    progress: Optional[int] = None

class RoadmapBase(BaseModel):
    title: str
    description: str
    phases: List[Dict[str, Any]]

class RoadmapCreate(RoadmapBase):
    pass

class Roadmap(RoadmapBase):
    id: str
    created_at: str
    updated_at: str

class RoadmapUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    phases: Optional[List[Dict[str, Any]]] = None

# Add these models for learning paths
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

# Routes for Milestones
@router.post("/milestones", response_model=Milestone, status_code=status.HTTP_201_CREATED)
async def create_milestone(
    milestone: MilestoneCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new milestone."""
    # Validate date format
    try:
        datetime.strptime(milestone.target_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target date must be in YYYY-MM-DD format"
        )

    # Generate a unique ID for the milestone
    milestone_id = f"milestone_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # Create milestone object
    milestone_dict = milestone.model_dump()
    milestone_dict["id"] = milestone_id
    milestone_dict["completed"] = False
    milestone_dict["completion_date"] = None
    milestone_dict["notes"] = milestone_dict.get("notes", "")

    # Handle both User objects and dictionaries
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    # Add to user's milestones
    result = await db.users.update_one(
        {"username": username},
        {"$push": {"milestones": milestone_dict}}
    )

    if result.modified_count == 0:
        # If the milestones array doesn't exist yet, create it
        result = await db.users.update_one(
            {"username": username},
            {"$set": {"milestones": [milestone_dict]}}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create milestone"
            )

    return milestone_dict

@router.get("/milestones", response_model=List[Milestone])
async def get_milestones(
    completed: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get all milestones with optional filtering."""
    # Handle both User objects and dictionaries
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    user = await db.users.find_one({"username": username})
    if not user or "milestones" not in user:
        return []

    milestones = user["milestones"]

    # Filter by completion status if specified
    if completed is not None:
        milestones = [m for m in milestones if m.get("completed", False) == completed]

    # Sort by target date
    milestones.sort(key=lambda x: (x.get("completed", False), x.get("target_date", "")))

    return milestones

@router.get("/milestones/{milestone_id}", response_model=Milestone)
async def get_milestone(
    milestone_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific milestone by ID."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "milestones" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Milestones not found"
        )

    # Find the milestone
    for milestone in user["milestones"]:
        if milestone.get("id") == milestone_id:
            return milestone

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Milestone with ID {milestone_id} not found"
    )

@router.put("/milestones/{milestone_id}", response_model=Milestone)
async def update_milestone(
    milestone_id: str,
    milestone_update: MilestoneUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update a milestone."""
    # Handle both User objects and dictionaries
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    # Get the current milestone
    user = await db.users.find_one({"username": username})
    if not user or "milestones" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Milestones not found"
        )

    # Find the milestone
    milestone_index = None
    for i, milestone in enumerate(user["milestones"]):
        if milestone.get("id") == milestone_id:
            milestone_index = i
            break

    if milestone_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Milestone with ID {milestone_id} not found"
        )

    # Update the milestone
    milestone = user["milestones"][milestone_index]
    update_data = milestone_update.model_dump(exclude_unset=True)

    # Handle completion status change
    if "completed" in update_data and update_data["completed"] and not milestone.get("completed", False):
        update_data["completion_date"] = datetime.now().isoformat()
    elif "completed" in update_data and not update_data["completed"]:
        update_data["completion_date"] = None

    # Update the milestone
    for key, value in update_data.items():
        milestone[key] = value

    # Save the updated milestone
    result = await db.users.update_one(
        {"username": username},
        {"$set": {f"milestones.{milestone_index}": milestone}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update milestone"
        )

    return milestone

@router.delete("/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_milestone(
    milestone_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a milestone."""
    # Handle both User objects and dictionaries
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    result = await db.users.update_one(
        {"username": username},
        {"$pull": {"milestones": {"id": milestone_id}}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Milestone with ID {milestone_id} not found"
        )

# Routes for Goals
@router.post("/goals", response_model=Goal, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal: GoalCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new learning goal."""
    logger = logging.getLogger(__name__)

    # Validate date format
    try:
        datetime.strptime(goal.target_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target date must be in YYYY-MM-DD format"
        )

    # Validate priority
    if not (1 <= goal.priority <= 10):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Priority must be between 1 and 10"
        )

    # Generate a unique ID for the goal
    goal_id = f"goal_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # Create goal object
    goal_dict = goal.model_dump()
    goal_dict["id"] = goal_id
    goal_dict["completed"] = False
    goal_dict["completion_date"] = None
    goal_dict["notes"] = ""

    # Handle both User objects and dictionaries
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')
    logger.info(f"Creating goal for user: {username}")

    try:
        # Add to user's goals
        result = await db.users.update_one(
            {"username": username},
            {"$push": {"goals": goal_dict}}
        )

        logger.info(f"Update result: matched={result.matched_count}, modified={result.modified_count}")

        if result.modified_count == 0:
            # If the goals array doesn't exist yet, create it
            logger.info(f"Trying to set goals array for user {username}")
            result = await db.users.update_one(
                {"username": username},
                {"$set": {"goals": [goal_dict]}}
            )

            logger.info(f"Set result: matched={result.matched_count}, modified={result.modified_count}")

            if result.modified_count == 0:
                # Check if user exists
                user = await db.users.find_one({"username": username})
                if not user:
                    logger.error(f"User {username} not found in database")
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"User {username} not found"
                    )
                else:
                    logger.error(f"Failed to create goal for user {username}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to create goal"
                    )
    except Exception as e:
        logger.error(f"Exception creating goal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating goal: {str(e)}"
        )

    return goal_dict

@router.get("/goals", response_model=List[Goal])
async def get_goals(
    completed: Optional[bool] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get all goals with optional filtering."""
    # Handle both User objects and dictionaries
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    user = await db.users.find_one({"username": username})
    if not user or "goals" not in user:
        return []

    goals = user["goals"]

    # Filter by completion status if specified
    if completed is not None:
        goals = [g for g in goals if g.get("completed", False) == completed]

    # Filter by category if specified
    if category:
        goals = [g for g in goals if g.get("category", "").lower() == category.lower()]

    # Sort by priority (highest first) and then by target date
    goals.sort(key=lambda x: (x.get("completed", False), -x.get("priority", 0), x.get("target_date", "")))

    return goals

@router.get("/goals/{goal_id}", response_model=Goal)
async def get_goal(
    goal_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific goal by ID."""
    # Handle both User objects and dictionaries
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    user = await db.users.find_one({"username": username})
    if not user or "goals" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goals not found"
        )

    # Find the goal
    for goal in user["goals"]:
        if goal.get("id") == goal_id:
            return goal

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Goal with ID {goal_id} not found"
    )

@router.put("/goals/{goal_id}", response_model=Goal)
async def update_goal(
    goal_id: str,
    goal_update: GoalUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update a goal."""
    # Handle both User objects and dictionaries
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    # Get the current goal
    user = await db.users.find_one({"username": username})
    if not user or "goals" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goals not found"
        )

    # Find the goal
    goal_index = None
    for i, goal in enumerate(user["goals"]):
        if goal.get("id") == goal_id:
            goal_index = i
            break

    if goal_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal with ID {goal_id} not found"
        )

    # Update the goal
    goal = user["goals"][goal_index]
    update_data = goal_update.model_dump(exclude_unset=True)

    # Handle completion status change
    if "completed" in update_data and update_data["completed"] and not goal.get("completed", False):
        update_data["completion_date"] = datetime.now().isoformat()
    elif "completed" in update_data and not update_data["completed"]:
        update_data["completion_date"] = None

    # Update the goal
    for key, value in update_data.items():
        goal[key] = value

    # Save the updated goal
    result = await db.users.update_one(
        {"username": username},
        {"$set": {f"goals.{goal_index}": goal}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update goal"
        )

    return goal

@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a goal."""
    # Handle both User objects and dictionaries
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    result = await db.users.update_one(
        {"username": username},
        {"$pull": {"goals": {"id": goal_id}}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal with ID {goal_id} not found"
        )

# Routes for Roadmap
@router.post("/roadmap", response_model=Roadmap, status_code=status.HTTP_201_CREATED)
async def create_roadmap(
    roadmap: RoadmapCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create or replace the learning roadmap."""
    # Generate a unique ID for the roadmap
    roadmap_id = f"roadmap_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    now = datetime.now().isoformat()

    # Create roadmap object
    roadmap_dict = roadmap.model_dump()
    roadmap_dict["id"] = roadmap_id
    roadmap_dict["created_at"] = now
    roadmap_dict["updated_at"] = now

    # Replace user's roadmap
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$set": {"roadmap": roadmap_dict}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create roadmap"
        )

    return roadmap_dict

@router.get("/roadmap", response_model=Roadmap)
async def get_roadmap(
    current_user: User = Depends(get_current_active_user)
):
    """Get the learning roadmap."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "roadmap" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Roadmap not found"
        )

    return user["roadmap"]

@router.put("/roadmap", response_model=Roadmap)
async def update_roadmap(
    roadmap_update: RoadmapUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update the learning roadmap."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "roadmap" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Roadmap not found"
        )

    # Get current roadmap
    roadmap = user["roadmap"]

    # Update roadmap fields
    update_data = {k: v for k, v in roadmap_update.model_dump().items() if v is not None}
    for key, value in update_data.items():
        roadmap[key] = value

    # Update the updated_at timestamp
    roadmap["updated_at"] = datetime.now().isoformat()

    # Save updated roadmap
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$set": {"roadmap": roadmap}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update roadmap"
        )

    return roadmap

@router.get("/progress", response_model=Dict[str, Any])
async def get_learning_path_progress(
    current_user: User = Depends(get_current_active_user)
):
    """Get learning path progress statistics."""
    # Handle both User objects and dictionaries
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Get goals and milestones
    goals = user.get("goals", [])
    milestones = user.get("milestones", [])

    # Calculate overall progress
    total_goals = len(goals)
    completed_goals = sum(1 for g in goals if g.get("completed", False))

    # Calculate progress percentage for each goal
    goal_progress = [g.get("progress", 0) for g in goals]
    overall_progress = sum(goal_progress) / max(len(goal_progress), 1)

    # Calculate milestone progress
    total_milestones = len(milestones)
    completed_milestones = sum(1 for m in milestones if m.get("completed", False))

    # Calculate progress by category
    categories = {}
    for goal in goals:
        category = goal.get("category", "Uncategorized")
        if category not in categories:
            categories[category] = {"total": 0, "completed": 0, "progress": 0}

        categories[category]["total"] += 1
        if goal.get("completed", False):
            categories[category]["completed"] += 1
        categories[category]["progress"] += goal.get("progress", 0)

    # Calculate average progress for each category
    progress_by_category = []
    for category, data in categories.items():
        progress_by_category.append({
            "name": category,
            "total": data["total"],
            "completed": data["completed"],
            "progress": data["progress"] / data["total"] if data["total"] > 0 else 0
        })

    # Collect progress history from all goals
    progress_history = []
    for goal in goals:
        for entry in goal.get("progress_history", []):
            progress_history.append({
                "date": entry.get("date"),
                "progress": entry.get("progress", 0),
                "goal_id": goal.get("id"),
                "goal_title": goal.get("title")
            })

    # Sort progress history by date
    progress_history.sort(key=lambda x: x.get("date", ""))

    return {
        "overall_progress": overall_progress,
        "completed_goals": completed_goals,
        "total_goals": total_goals,
        "completed_milestones": completed_milestones,
        "total_milestones": total_milestones,
        "progress_by_category": progress_by_category,
        "progress_history": progress_history
    }

# Add these routes for learning paths
@router.get("/", response_model=List[LearningPath])
async def get_learning_paths(
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get all learning paths with optional filtering."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        return []

    learning_paths = user["learning_paths"]

    # Filter by topic if specified
    if topic:
        learning_paths = [
            lp for lp in learning_paths
            if any(t.lower() == topic.lower() for t in lp.get("topics", []))
        ]

    # Filter by difficulty if specified
    if difficulty:
        learning_paths = [
            lp for lp in learning_paths
            if lp.get("difficulty", "").lower() == difficulty.lower()
        ]

    return learning_paths

@router.post("/", response_model=LearningPath, status_code=status.HTTP_201_CREATED)
async def create_learning_path(
    learning_path: LearningPathCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new learning path."""
    # Create learning path object
    now = datetime.now().isoformat()
    learning_path_dict = learning_path.model_dump()
    learning_path_dict["id"] = f"{now}_{learning_path.title.lower().replace(' ', '_')}"
    learning_path_dict["created_at"] = now
    learning_path_dict["updated_at"] = now

    # Add to user's learning paths
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$push": {"learning_paths": learning_path_dict}}
    )

    if result.modified_count == 0:
        # If the learning_paths array doesn't exist yet, create it
        result = await db.users.update_one(
            {"username": current_user.username},
            {"$set": {"learning_paths": [learning_path_dict]}}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create learning path"
            )

    return learning_path_dict

@router.get("/{learning_path_id}", response_model=LearningPath)
async def get_learning_path(
    learning_path_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific learning path by ID."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning paths not found"
        )

    # Find the learning path
    for lp in user["learning_paths"]:
        if lp.get("id") == learning_path_id:
            return lp

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Learning path with ID {learning_path_id} not found"
    )

@router.put("/{learning_path_id}", response_model=LearningPath)
async def update_learning_path(
    learning_path_id: str,
    learning_path_update: LearningPathCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Update a learning path."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning paths not found"
        )

    # Find the learning path to update
    learning_paths = user["learning_paths"]
    lp_index = None
    for i, lp in enumerate(learning_paths):
        if lp.get("id") == learning_path_id:
            lp_index = i
            break

    if lp_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {learning_path_id} not found"
        )

    # Update learning path fields
    update_data = learning_path_update.model_dump()
    for key, value in update_data.items():
        if key != "resources":  # Don't overwrite resources
            learning_paths[lp_index][key] = value

    # Update timestamp
    learning_paths[lp_index]["updated_at"] = datetime.now().isoformat()

    # Save updated learning paths
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$set": {"learning_paths": learning_paths}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update learning path"
        )

    return learning_paths[lp_index]

@router.delete("/{learning_path_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_learning_path(
    learning_path_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a learning path."""
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$pull": {"learning_paths": {"id": learning_path_id}}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {learning_path_id} not found"
        )

@router.post("/{learning_path_id}/resources", response_model=LearningPath)
async def add_resource_to_learning_path(
    learning_path_id: str,
    resource: ResourceInPath,
    current_user: User = Depends(get_current_active_user)
):
    """Add a resource to a learning path."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning paths not found"
        )

    # Find the learning path
    learning_paths = user["learning_paths"]
    lp_index = None
    for i, lp in enumerate(learning_paths):
        if lp.get("id") == learning_path_id:
            lp_index = i
            break

    if lp_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {learning_path_id} not found"
        )

    # Add resource to learning path
    if "resources" not in learning_paths[lp_index]:
        learning_paths[lp_index]["resources"] = []

    # Check if resource already exists
    for existing_resource in learning_paths[lp_index]["resources"]:
        if existing_resource.get("id") == resource.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Resource with ID {resource.id} already exists in this learning path"
            )

    # Add resource
    learning_paths[lp_index]["resources"].append(resource.model_dump())

    # Update timestamp
    learning_paths[lp_index]["updated_at"] = datetime.now().isoformat()

    # Save updated learning paths
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$set": {"learning_paths": learning_paths}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add resource to learning path"
        )

    return learning_paths[lp_index]

@router.put("/{learning_path_id}/resources/{resource_id}", response_model=LearningPath)
async def update_resource_in_learning_path(
    learning_path_id: str,
    resource_id: str,
    resource_update: ResourceInPath,
    current_user: User = Depends(get_current_active_user)
):
    """Update a resource in a learning path."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning paths not found"
        )

    # Find the learning path
    learning_paths = user["learning_paths"]
    lp_index = None
    for i, lp in enumerate(learning_paths):
        if lp.get("id") == learning_path_id:
            lp_index = i
            break

    if lp_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {learning_path_id} not found"
        )

    # Find the resource
    if "resources" not in learning_paths[lp_index]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No resources found in learning path with ID {learning_path_id}"
        )

    resource_index = None
    for i, r in enumerate(learning_paths[lp_index]["resources"]):
        if r.get("id") == resource_id:
            resource_index = i
            break

    if resource_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} not found in learning path"
        )

    # Update resource
    update_data = resource_update.model_dump()
    for key, value in update_data.items():
        learning_paths[lp_index]["resources"][resource_index][key] = value

    # Update timestamp
    learning_paths[lp_index]["updated_at"] = datetime.now().isoformat()

    # Save updated learning paths
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$set": {"learning_paths": learning_paths}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update resource in learning path"
        )

    return learning_paths[lp_index]

@router.post("/{learning_path_id}/resources/{resource_id}/complete", response_model=LearningPath)
async def mark_resource_completed_in_learning_path(
    learning_path_id: str,
    resource_id: str,
    notes: Optional[Dict[str, str]] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Mark a resource as completed in a learning path."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning paths not found"
        )

    # Find the learning path
    learning_paths = user["learning_paths"]
    lp_index = None
    for i, lp in enumerate(learning_paths):
        if lp.get("id") == learning_path_id:
            lp_index = i
            break

    if lp_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {learning_path_id} not found"
        )

    # Find the resource
    if "resources" not in learning_paths[lp_index]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No resources found in learning path with ID {learning_path_id}"
        )

    resource_index = None
    for i, r in enumerate(learning_paths[lp_index]["resources"]):
        if r.get("id") == resource_id:
            resource_index = i
            break

    if resource_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} not found in learning path"
        )

    # Mark as completed
    learning_paths[lp_index]["resources"][resource_index]["completed"] = True
    learning_paths[lp_index]["resources"][resource_index]["completion_date"] = datetime.now().isoformat()

    # Add notes if provided
    if notes and "notes" in notes:
        learning_paths[lp_index]["resources"][resource_index]["notes"] = notes["notes"]

    # Update timestamp
    learning_paths[lp_index]["updated_at"] = datetime.now().isoformat()

    # Save updated learning paths
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$set": {"learning_paths": learning_paths}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark resource as completed"
        )

    return learning_paths[lp_index]

@router.delete("/{learning_path_id}/resources/{resource_id}", response_model=LearningPath)
async def remove_resource_from_learning_path(
    learning_path_id: str,
    resource_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Remove a resource from a learning path."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "learning_paths" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning paths not found"
        )

    # Find the learning path
    learning_paths = user["learning_paths"]
    lp_index = None
    for i, lp in enumerate(learning_paths):
        if lp.get("id") == learning_path_id:
            lp_index = i
            break

    if lp_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {learning_path_id} not found"
        )

    # Find the resource
    if "resources" not in learning_paths[lp_index]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No resources found in learning path with ID {learning_path_id}"
        )

    # Remove resource
    resources = learning_paths[lp_index]["resources"]
    resources_filtered = [r for r in resources if r.get("id") != resource_id]

    if len(resources) == len(resources_filtered):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} not found in learning path"
        )

    learning_paths[lp_index]["resources"] = resources_filtered

    # Update timestamp
    learning_paths[lp_index]["updated_at"] = datetime.now().isoformat()

    # Save updated learning paths
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$set": {"learning_paths": learning_paths}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove resource from learning path"
        )

    return learning_paths[lp_index]