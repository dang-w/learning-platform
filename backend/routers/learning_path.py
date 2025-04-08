"""Learning path router."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv
import logging
from bson.objectid import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

# Load environment variables
load_dotenv()

# Import database dependency function
from database import get_db

# Import utility functions
from utils.db_utils import get_document_by_id, update_document, delete_document
from utils.validators import validate_date_format, validate_rating, validate_required_fields
from utils.error_handlers import ValidationError, ResourceNotFoundError
from utils.response_models import StandardResponse, ResponseMessages

# Create router
router = APIRouter()

# Import authentication functions from auth
from auth import get_current_active_user, User

# Helper function to safely extract username from current_user
def get_username_from_user(current_user) -> str:
    """Extract username from current_user object, handling different types."""
    username = current_user.get("username") if isinstance(current_user, dict) else getattr(current_user, "username", None)

    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username could not be determined from user object"
        )

    return username

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
    status: str = "not_started"

class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[str] = None
    status: Optional[str] = None
    verification_method: Optional[str] = None
    resources: Optional[List["ResourceInPath"]] = None
    completed: Optional[bool] = None
    notes: Optional[str] = None

class GoalBase(BaseModel):
    title: str
    description: str
    target_date: str
    priority: int
    category: str
    milestones: List[Milestone] = []

class GoalCreate(GoalBase):
    pass

class GoalBatchCreate(BaseModel):
    goals: List[GoalCreate]

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
@router.post("/goals/{goal_id}/milestones", response_model=Milestone, status_code=status.HTTP_201_CREATED)
async def create_milestone(
    goal_id: str,
    milestone: MilestoneCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new milestone for a specific goal."""
    username = get_username_from_user(current_user)

    # Validate date format
    try:
        datetime.strptime(milestone.target_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target date must be in YYYY-MM-DD format"
        )

    # Generate a unique ID for the milestone (consider using ObjectId or UUID)
    milestone_id = f"m_{datetime.now().strftime('%Y%m%d%H%M%S%f')}" # Added prefix and microseconds

    # Create milestone object
    milestone_dict = milestone.model_dump()
    milestone_dict["id"] = milestone_id
    milestone_dict["completed"] = False
    milestone_dict["completion_date"] = None
    milestone_dict["notes"] = milestone_dict.get("notes", "")

    # Add milestone to the specific goal's milestones array
    result = await db.users.update_one(
        {"username": username, "goals.id": goal_id},
        {"$push": {"goals.$.milestones": milestone_dict}}
    )

    if result.matched_count == 0:
        # Check if the user exists first
        user = await db.users.find_one({"username": username})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User '{username}' not found."
            )
        # If user exists, but goal doesn't
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal with ID '{goal_id}' not found for user '{username}'."
        )

    if result.modified_count == 0:
        # This might happen if the goal was found but the update didn't succeed
        # Potentially a concurrent modification or schema issue
        logging.error(f"Failed to add milestone {milestone_id} to goal {goal_id} for user {username}. Matched={result.matched_count}, Modified={result.modified_count}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create milestone for goal ID '{goal_id}'."
        )

    logging.info(f"Milestone '{milestone.title}' (ID: {milestone_id}) added to goal {goal_id} for user '{username}'.")
    return milestone_dict

@router.get("/goals/{goal_id}/milestones", response_model=List[Milestone])
async def get_milestones(
    goal_id: str,
    completed: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all milestones for a specific goal with optional filtering."""
    username = get_username_from_user(current_user)

    # Find the user and the specific goal
    user = await db.users.find_one(
        {"username": username, "goals.id": goal_id},
        {"goals.$": 1} # Project only the matched goal
    )

    if not user or not user.get("goals"):
        # Check if user exists but goal doesn't
        user_exists = await db.users.count_documents({"username": username})
        if not user_exists:
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User '{username}' not found."
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal with ID '{goal_id}' not found for user '{username}'."
        )

    goal = user["goals"][0] # Get the matched goal
    milestones = goal.get("milestones", [])

    # Filter by completion status if specified
    if completed is not None:
        milestones = [m for m in milestones if m.get("completed", False) == completed]

    # Sort by target date (and completion status)
    milestones.sort(key=lambda x: (x.get("completed", False), x.get("target_date", "")))

    return milestones

@router.get("/goals/{goal_id}/milestones/{milestone_id}", response_model=Milestone)
async def get_milestone(
    goal_id: str,
    milestone_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a specific milestone by ID within a specific goal."""
    username = get_username_from_user(current_user)

    user = await db.users.find_one(
        {"username": username, "goals.id": goal_id},
        {"goals.$": 1}
    )

    if not user or not user.get("goals"):
        user_exists = await db.users.count_documents({"username": username})
        if not user_exists:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"User '{username}' not found.")
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Goal with ID '{goal_id}' not found.")

    goal = user["goals"][0]
    milestones = goal.get("milestones", [])

    # Find the specific milestone
    for milestone in milestones:
        if milestone.get("id") == milestone_id:
            return milestone

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Milestone with ID '{milestone_id}' not found within goal '{goal_id}'."
    )

@router.put("/goals/{goal_id}/milestones/{milestone_id}", response_model=Milestone)
async def update_milestone(
    goal_id: str,
    milestone_id: str,
    milestone_update: MilestoneUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a milestone within a specific goal."""
    username = get_username_from_user(current_user)

    # Prepare fields for $set using arrayFilters
    update_fields = {}
    # Convert Pydantic model to dict, excluding unset fields
    update_data = milestone_update.model_dump(exclude_unset=True)

    # *** ADD LOGGING HERE TO INSPECT ***
    logging.info(f"[update_milestone] update_data received for milestone {milestone_id}: {update_data}")

    # Validate date format if present
    if "target_date" in update_data and update_data["target_date"]:
        try:
            datetime.strptime(update_data["target_date"], "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target date must be in YYYY-MM-DD format"
            )

    # Handle completion logic
    if update_data.get("completed"):
        update_data["completion_date"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    elif "completed" in update_data and not update_data["completed"]: # Explicitly setting to false
        update_data["completion_date"] = None

    # Dynamically build the $set update document
    for key, value in update_data.items():
        update_fields[f"goals.$[goal].milestones.$[milestone].{key}"] = value

    result = await db.users.update_one(
        {"username": username, "goals.id": goal_id},
        {"$set": update_fields},
        array_filters=[
            {"goal.id": goal_id},
            {"milestone.id": milestone_id}
        ]
    )

    if result.matched_count == 0:
        # Check if user/goal exists to give a more specific error
        user = await db.users.find_one(
            {"username": username, "goals.id": goal_id},
            {"_id": 1} # Check existence
        )
        if not user:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Goal with ID '{goal_id}' not found for user '{username}'.")
        else:
             # Goal exists, but milestone doesn't match the filter
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Milestone with ID '{milestone_id}' not found within goal '{goal_id}'.")

    if result.modified_count == 0 and result.matched_count == 1:
        # Found user, goal, and milestone, but nothing changed (e.g., same data sent)
        # Re-fetch the milestone to return current state
        logging.warning(f"Update for milestone {milestone_id} in goal {goal_id} resulted in no changes.")
    elif result.modified_count == 0:
         # This case should ideally be covered by matched_count == 0 check
         logging.error(f"Milestone update failed unexpectedly for {username}, goal {goal_id}, milestone {milestone_id}. Matched: {result.matched_count}, Modified: {result.modified_count}")
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Milestone update failed.")

    # Fetch the updated user document to get the updated milestone
    # Add projection to fetch only the relevant goal
    updated_user = await db.users.find_one(
        {"username": username, "goals.id": goal_id},
        {"goals.$": 1} # Projection added here
    )
    # Check if the user and the specific goal were found after the update
    if not updated_user or not updated_user.get("goals") or len(updated_user["goals"]) != 1:
        # This indicates a problem, potentially the goal was deleted concurrently
        logging.error(f"Failed to find goal {goal_id} for user {username} after update attempt.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Goal {goal_id} not found after update.")

    # The projection ensures updated_user['goals'] contains only the one matched goal
    goal = updated_user["goals"][0]

    # Find and return the specific milestone from the fetched goal
    for updated_milestone in goal.get("milestones", []):
        if updated_milestone.get("id") == milestone_id:
             logging.info(f"Milestone {milestone_id} in goal {goal_id} updated for user {username}.")
             return updated_milestone

    # If the loop completes without finding the milestone, something is wrong
    # (e.g., the milestone_id was valid for the update filter but not found in the fetched goal)
    logging.error(f"Updated milestone {milestone_id} not found in goal {goal_id} for user {username} despite successful update report.")
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Updated milestone {milestone_id} could not be retrieved.")

@router.delete("/goals/{goal_id}/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_milestone(
    goal_id: str,
    milestone_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a milestone within a specific goal."""
    username = get_username_from_user(current_user)

    # Use $pull to remove the milestone from the array
    result = await db.users.update_one(
        {"username": username, "goals.id": goal_id},
        {"$pull": {"goals.$.milestones": {"id": milestone_id}}}
    )

    if result.matched_count == 0:
         # Check if user/goal exists
        user = await db.users.find_one(
            {"username": username, "goals.id": goal_id},
            {"_id": 1}
        )
        if not user:
             raise HTTPException(status.HTTP_404_NOT_FOUND, f"Goal with ID '{goal_id}' not found for user '{username}'.")
        else:
            # Goal found, but likely milestone wasn't present (or already deleted)
            # For DELETE, returning 204 is idempotent, so maybe just log a warning?
            logging.warning(f"Attempted to delete milestone {milestone_id} from goal {goal_id} for user {username}, but it was not found in the array (or goal not found). MatchedCount: {result.matched_count}")
            # We still return 204 as the state matches the desired outcome (milestone is gone)
            # Or raise 404 if we want to be strict:
            # raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Milestone with ID '{milestone_id}' not found within goal '{goal_id}'.")
            return # Return None for 204 status

    if result.modified_count == 0 and result.matched_count == 1:
        # Goal found, but the milestone wasn't in the array to be pulled
        logging.warning(f"Milestone {milestone_id} was not found in goal {goal_id} for user {username} during delete attempt, though goal was matched.")
        # Still return 204 as the state is effectively achieved
        return # Return None for 204 status
    elif result.modified_count > 0:
        logging.info(f"Milestone {milestone_id} deleted from goal {goal_id} for user {username}.")

    # No content to return for 204
    return

# Routes for Goals
@router.post("/goals", response_model=Goal, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal: GoalCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new goal for the user."""
    username = get_username_from_user(current_user)

    # Validate date format if present
    if goal.target_date:
        try:
            datetime.strptime(goal.target_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target date must be in YYYY-MM-DD format"
            )

    # Generate unique ID
    goal_id = f"goal_{datetime.now().strftime('%Y%m%d%H%M%S%f')}" # Added microseconds for more uniqueness

    goal_dict = goal.model_dump()
    goal_dict["id"] = goal_id
    goal_dict["completed"] = False
    goal_dict["completion_date"] = None
    goal_dict["notes"] = goal_dict.get("notes", "")
    goal_dict["milestones"] = [] # Initialize milestones for the new goal

    # Check if user exists
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{username}' not found."
        )

    # Add goal to user's goals array
    result = await db.users.update_one(
        {"username": username},
        {"$push": {"goals": goal_dict}}
    )

    if result.modified_count == 0:
        # Handle case where 'goals' array might not exist (though unlikely if user exists)
        result = await db.users.update_one(
            {"username": username},
            {"$set": {"goals": [goal_dict]}},
            upsert=False # Don't create user if not found, already checked
        )
        if result.modified_count == 0:
             # If still 0, maybe user doc structure issue or concurrent modification?
            logging.error(f"Failed to add goal {goal_id} for user {username}. Update count was 0.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create goal. Could not update user document."
            )

    logging.info(f"Goal '{goal.title}' (ID: {goal_id}) created for user '{username}'.")
    return goal_dict

@router.get("/goals", response_model=List[Goal])
async def get_goals(
    completed: Optional[bool] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all goals with optional filtering."""
    # Handle both User objects and dictionaries
    username = get_username_from_user(current_user)

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
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a specific goal by ID."""
    # Handle both User objects and dictionaries
    username = get_username_from_user(current_user)

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
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a goal."""
    username = get_username_from_user(current_user)

    # Validate date format if present
    if goal_update.target_date:
        try:
            datetime.strptime(goal_update.target_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target date must be in YYYY-MM-DD format"
            )

    update_data = goal_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided"
        )

    # Prepare the $set dictionary for MongoDB
    set_update = {}
    current_time_iso = datetime.now().isoformat()
    set_update["goals.$[goalElem].updated_at"] = current_time_iso

    for key, value in update_data.items():
        set_update[f"goals.$[goalElem].{key}"] = value
        # If marking as completed, set completion_date
        if key == "completed" and value is True:
            set_update["goals.$[goalElem].completion_date"] = current_time_iso
        elif key == "completed" and value is False:
             # If explicitly setting completed to False, clear completion_date
            set_update["goals.$[goalElem].completion_date"] = None

    # Use arrayFilters to target the specific goal within the array
    result = await db.users.update_one(
        {"username": username, "goals.id": goal_id},
        {"$set": set_update},
        array_filters=[{"goalElem.id": goal_id}]
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal with ID {goal_id} not found for user {username}."
        )
    if result.modified_count == 0:
        logging.warning(f"Goal {goal_id} for user {username} was matched but not modified. Update data: {update_data}")
        # Optionally, could return the existing goal state or a 304 Not Modified, but Pydantic model might expect full Goal object
        # Fetching the current goal state to return it
        user_after_attempt = await db.users.find_one({"username": username})
        if user_after_attempt:
            for goal in user_after_attempt.get("goals", []):
                if goal.get("id") == goal_id:
                    return goal
        # Fallback if fetching fails after no modification
        raise HTTPException(
            status_code=status.HTTP_304_NOT_MODIFIED,
            detail="Goal found, but no changes were applied based on the provided data."
        )

    # Fetch the updated user document to return the modified goal
    # Using projection to only get the relevant goal
    updated_user = await db.users.find_one(
        {"username": username, "goals.id": goal_id},
        {"goals.$": 1}
    )

    if updated_user and "goals" in updated_user and len(updated_user["goals"]) == 1:
        logging.info(f"Goal {goal_id} updated successfully for user {username}.")
        return updated_user["goals"][0]
    else:
        # This case should theoretically not happen if modified_count > 0
        logging.error(f"Failed to retrieve updated goal {goal_id} for user {username} after successful update.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve goal {goal_id} after update."
        )

@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a goal."""
    # Handle both User objects and dictionaries
    username = get_username_from_user(current_user)

    result = await db.users.update_one(
        {"username": username},
        {"$pull": {"goals": {"id": goal_id}}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal with ID {goal_id} not found"
        )

@router.post("/goals/batch", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_goals_batch(
    goals_batch: GoalBatchCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create multiple goals in a batch."""
    result = {
        "success": [],
        "errors": []
    }

    for goal_data in goals_batch.goals:
        try:
            # Validate required fields
            try:
                validate_required_fields(goal_data.dict(), ["title", "description", "target_date"])
            except ValidationError as e:
                result["errors"].append({
                    "data": goal_data.dict(),
                    "error": str(e)
                })
                continue

            # Validate date format
            try:
                validate_date_format(goal_data.target_date)
            except ValidationError as e:
                result["errors"].append({
                    "data": goal_data.dict(),
                    "error": str(e)
                })
                continue

            # Create a unique ID for the goal
            goal_id = str(ObjectId())

            # Create goal document
            goal_doc = {
                "id": goal_id,
                "title": goal_data.title,
                "description": goal_data.description,
                "target_date": goal_data.target_date,
                "priority": goal_data.priority,
                "category": goal_data.category,
                "completed": False,
                "completion_date": None,
                "notes": "",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }

            # Update user document
            update_result = await db.users.update_one(
                {"username": get_username_from_user(current_user)},
                {"$push": {"goals": goal_doc}}
            )

            if update_result.modified_count == 0:
                result["errors"].append({
                    "data": goal_data.dict(),
                    "error": "Failed to add goal to user"
                })
                continue

            # Add to success list
            result["success"].append(goal_doc)

        except Exception as e:
            result["errors"].append({
                "data": goal_data.dict(),
                "error": str(e)
            })

    return result

# Routes for Roadmap
@router.post("/roadmap", response_model=Roadmap, status_code=status.HTTP_201_CREATED)
async def create_roadmap(
    roadmap: RoadmapCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
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
        {"username": get_username_from_user(current_user)},
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get the learning roadmap."""
    user = await db.users.find_one({"username": get_username_from_user(current_user)})
    if not user or "roadmap" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Roadmap not found"
        )

    return user["roadmap"]

@router.put("/roadmap", response_model=Roadmap)
async def update_roadmap(
    roadmap_update: RoadmapUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update the learning roadmap."""
    user = await db.users.find_one({"username": get_username_from_user(current_user)})
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
        {"username": get_username_from_user(current_user)},
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get learning path progress statistics."""
    username = get_username_from_user(current_user)

    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    goals = user.get("goals", [])

    total_goals = len(goals)
    completed_goals = sum(1 for g in goals if g.get("completed", False))

    total_milestones = 0
    completed_milestones = 0
    categories = {}
    progress_history = []

    for goal in goals:
        goal_milestones = goal.get("milestones", [])
        total_milestones += len(goal_milestones)
        # Correctly check the 'completed' field for milestones
        completed_milestones += sum(1 for m in goal_milestones if m.get("completed", False)) # Corrected check

        # --- Category aggregation ---
        category = goal.get("category", "Uncategorized")
        if category not in categories:
            # Initialize with milestone counts as well
            categories[category] = {"total": 0, "completed": 0, "milestones_total": 0, "milestones_completed": 0}

        categories[category]["total"] += 1
        categories[category]["milestones_total"] += len(goal_milestones)
        if goal.get("completed", False):
            categories[category]["completed"] += 1
        # Aggregate completed milestones per category
        categories[category]["milestones_completed"] += sum(1 for m in goal_milestones if m.get("completed", False))

        # --- Progress history aggregation ---
        for entry in goal.get("progress_history", []):
             if isinstance(entry, dict): # Ensure entry is a dict
                progress_history.append({
                    "date": entry.get("date"),
                    "progress": entry.get("progress", 0),
                    "goal_id": goal.get("id"),
                    "goal_title": goal.get("title")
                })

    # Calculate overall progress based on milestone completion
    overall_progress = (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0

    # Calculate category progress based on milestone completion
    progress_by_category = []
    for category, data in categories.items():
        # Calculate progress based on milestones within the category
        category_progress = (data["milestones_completed"] / data["milestones_total"] * 100) if data["milestones_total"] > 0 else 0
        progress_by_category.append({
            "name": category,
            "total_goals": data["total"],             # Renamed for clarity
            "completed_goals": data["completed"],       # Renamed for clarity
            "total_milestones": data["milestones_total"], # Added
            "completed_milestones": data["milestones_completed"], # Added
            "progress": category_progress
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all learning paths with optional filtering."""
    # Extract username with proper type checking
    username = get_username_from_user(current_user)

    user = await db.users.find_one({"username": username})
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
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
        {"username": get_username_from_user(current_user)},
        {"$push": {"learning_paths": learning_path_dict}}
    )

    if result.modified_count == 0:
        # If the learning_paths array doesn't exist yet, create it
        result = await db.users.update_one(
            {"username": get_username_from_user(current_user)},
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a specific learning path by ID."""
    user = await db.users.find_one({"username": get_username_from_user(current_user)})
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a learning path."""
    user = await db.users.find_one({"username": get_username_from_user(current_user)})
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
        {"username": get_username_from_user(current_user)},
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a learning path."""
    result = await db.users.update_one(
        {"username": get_username_from_user(current_user)},
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Add a resource to a learning path."""
    user = await db.users.find_one({"username": get_username_from_user(current_user)})
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
        {"username": get_username_from_user(current_user)},
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a resource in a learning path."""
    user = await db.users.find_one({"username": get_username_from_user(current_user)})
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
        {"username": get_username_from_user(current_user)},
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Mark a resource as completed in a learning path."""
    user = await db.users.find_one({"username": get_username_from_user(current_user)})
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
        {"username": get_username_from_user(current_user)},
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Remove a resource from a learning path."""
    user = await db.users.find_one({"username": get_username_from_user(current_user)})
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
        {"username": get_username_from_user(current_user)},
        {"$set": {"learning_paths": learning_paths}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove resource from learning path"
        )

    return learning_paths[lp_index]