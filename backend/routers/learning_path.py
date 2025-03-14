from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv
import motor.motor_asyncio

# Load environment variables
load_dotenv()

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.learning_platform_db

# Create router
router = APIRouter()

# Import authentication functions from main
# This will be imported in main.py after the router is created
# to avoid circular imports
from main import get_current_active_user, User

# Models
class MilestoneBase(BaseModel):
    title: str
    description: str
    target_date: str
    verification_method: str
    resources: List[str] = []

class MilestoneCreate(MilestoneBase):
    pass

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
    milestone_dict = milestone.dict()
    milestone_dict["id"] = milestone_id
    milestone_dict["completed"] = False
    milestone_dict["completion_date"] = None
    milestone_dict["notes"] = ""

    # Add to user's milestones
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$push": {"milestones": milestone_dict}}
    )

    if result.modified_count == 0:
        # If the milestones array doesn't exist yet, create it
        result = await db.users.update_one(
            {"username": current_user.username},
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
    """Get all milestones with optional filtering by completion status."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "milestones" not in user:
        return []

    milestones = user["milestones"]

    # Filter by completion status if specified
    if completed is not None:
        milestones = [m for m in milestones if m.get("completed", False) == completed]

    # Sort by target date
    milestones.sort(key=lambda x: x.get("target_date", ""))

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
    # Validate target date if provided
    if milestone_update.target_date:
        try:
            datetime.strptime(milestone_update.target_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target date must be in YYYY-MM-DD format"
            )

    user = await db.users.find_one({"username": current_user.username})
    if not user or "milestones" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Milestones not found"
        )

    # Find the milestone to update
    milestones = user["milestones"]
    milestone_index = None
    for i, m in enumerate(milestones):
        if m.get("id") == milestone_id:
            milestone_index = i
            break

    if milestone_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Milestone with ID {milestone_id} not found"
        )

    # Update milestone fields
    update_data = {k: v for k, v in milestone_update.dict().items() if v is not None}

    # If marking as completed, set completion date
    if "completed" in update_data and update_data["completed"] and not milestones[milestone_index].get("completed", False):
        update_data["completion_date"] = datetime.now().isoformat()

    # If marking as not completed, clear completion date
    if "completed" in update_data and not update_data["completed"]:
        update_data["completion_date"] = None

    for key, value in update_data.items():
        milestones[milestone_index][key] = value

    # Save updated milestones
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$set": {"milestones": milestones}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update milestone"
        )

    return milestones[milestone_index]

@router.delete("/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_milestone(
    milestone_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a milestone."""
    result = await db.users.update_one(
        {"username": current_user.username},
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
    goal_dict = goal.dict()
    goal_dict["id"] = goal_id
    goal_dict["completed"] = False
    goal_dict["completion_date"] = None
    goal_dict["notes"] = ""

    # Add to user's goals
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$push": {"goals": goal_dict}}
    )

    if result.modified_count == 0:
        # If the goals array doesn't exist yet, create it
        result = await db.users.update_one(
            {"username": current_user.username},
            {"$set": {"goals": [goal_dict]}}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create goal"
            )

    return goal_dict

@router.get("/goals", response_model=List[Goal])
async def get_goals(
    completed: Optional[bool] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get all goals with optional filtering."""
    user = await db.users.find_one({"username": current_user.username})
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
    user = await db.users.find_one({"username": current_user.username})
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
    # Validate target date if provided
    if goal_update.target_date:
        try:
            datetime.strptime(goal_update.target_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target date must be in YYYY-MM-DD format"
            )

    # Validate priority if provided
    if goal_update.priority is not None and not (1 <= goal_update.priority <= 10):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Priority must be between 1 and 10"
        )

    user = await db.users.find_one({"username": current_user.username})
    if not user or "goals" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goals not found"
        )

    # Find the goal to update
    goals = user["goals"]
    goal_index = None
    for i, g in enumerate(goals):
        if g.get("id") == goal_id:
            goal_index = i
            break

    if goal_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal with ID {goal_id} not found"
        )

    # Update goal fields
    update_data = {k: v for k, v in goal_update.dict().items() if v is not None}

    # If marking as completed, set completion date
    if "completed" in update_data and update_data["completed"] and not goals[goal_index].get("completed", False):
        update_data["completion_date"] = datetime.now().isoformat()

    # If marking as not completed, clear completion date
    if "completed" in update_data and not update_data["completed"]:
        update_data["completion_date"] = None

    for key, value in update_data.items():
        goals[goal_index][key] = value

    # Save updated goals
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$set": {"goals": goals}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update goal"
        )

    return goals[goal_index]

@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a goal."""
    result = await db.users.update_one(
        {"username": current_user.username},
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
    roadmap_dict = roadmap.dict()
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
    update_data = {k: v for k, v in roadmap_update.dict().items() if v is not None}
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
    """Get progress statistics for the learning path."""
    user = await db.users.find_one({"username": current_user.username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Initialize progress stats
    progress = {
        "goals": {
            "total": 0,
            "completed": 0,
            "completion_percentage": 0,
            "by_category": {}
        },
        "milestones": {
            "total": 0,
            "completed": 0,
            "completion_percentage": 0,
            "upcoming": []
        },
        "roadmap": {
            "has_roadmap": False,
            "phases": []
        }
    }

    # Calculate goals progress
    if "goals" in user:
        goals = user["goals"]
        total_goals = len(goals)
        completed_goals = sum(1 for g in goals if g.get("completed", False))

        progress["goals"]["total"] = total_goals
        progress["goals"]["completed"] = completed_goals

        if total_goals > 0:
            progress["goals"]["completion_percentage"] = (completed_goals / total_goals) * 100

        # Calculate by category
        categories = {}
        for goal in goals:
            category = goal.get("category", "Uncategorized")
            if category not in categories:
                categories[category] = {"total": 0, "completed": 0}

            categories[category]["total"] += 1
            if goal.get("completed", False):
                categories[category]["completed"] += 1

        # Calculate completion percentage for each category
        for category, stats in categories.items():
            if stats["total"] > 0:
                stats["completion_percentage"] = (stats["completed"] / stats["total"]) * 100
            else:
                stats["completion_percentage"] = 0

        progress["goals"]["by_category"] = categories

    # Calculate milestones progress
    if "milestones" in user:
        milestones = user["milestones"]
        total_milestones = len(milestones)
        completed_milestones = sum(1 for m in milestones if m.get("completed", False))

        progress["milestones"]["total"] = total_milestones
        progress["milestones"]["completed"] = completed_milestones

        if total_milestones > 0:
            progress["milestones"]["completion_percentage"] = (completed_milestones / total_milestones) * 100

        # Get upcoming milestones (not completed, sorted by target date)
        upcoming = [
            {
                "id": m.get("id"),
                "title": m.get("title"),
                "target_date": m.get("target_date")
            }
            for m in milestones
            if not m.get("completed", False)
        ]
        upcoming.sort(key=lambda x: x.get("target_date", ""))

        progress["milestones"]["upcoming"] = upcoming[:3]  # Top 3 upcoming milestones

    # Get roadmap progress
    if "roadmap" in user:
        roadmap = user["roadmap"]
        progress["roadmap"]["has_roadmap"] = True

        if "phases" in roadmap:
            phases = []
            for phase in roadmap["phases"]:
                phase_progress = {
                    "title": phase.get("title", "Unnamed Phase"),
                    "total_items": 0,
                    "completed_items": 0,
                    "completion_percentage": 0
                }

                # Count items and completed items in the phase
                if "items" in phase:
                    phase_progress["total_items"] = len(phase["items"])
                    phase_progress["completed_items"] = sum(1 for item in phase["items"] if item.get("completed", False))

                    if phase_progress["total_items"] > 0:
                        phase_progress["completion_percentage"] = (phase_progress["completed_items"] / phase_progress["total_items"]) * 100

                phases.append(phase_progress)

            progress["roadmap"]["phases"] = phases

    return progress

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
    learning_path_dict = learning_path.dict()
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
    update_data = learning_path_update.dict()
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
    learning_paths[lp_index]["resources"].append(resource.dict())

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
    update_data = resource_update.dict()
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