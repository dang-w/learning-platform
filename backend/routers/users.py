"""User management endpoints."""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr, constr
from typing import Optional, List, Dict, Any, Union
import logging
from datetime import datetime, timedelta
import json
from bson import json_util
from fastapi.responses import JSONResponse, FileResponse
import tempfile
import os

from database import db
from auth import get_current_active_user, get_password_hash
from utils.validators import validate_email, validate_password_strength
from utils.rate_limiter import rate_limit_dependency_with_logging, create_user_rate_limit
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class UserBase(BaseModel):
    username: constr(min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None

class UserCreate(UserBase):
    password: constr(min_length=8)

class User(UserBase):
    id: str
    created_at: datetime
    is_active: bool = True
    disabled: bool = False
    resources: Dict[str, List[Any]] = {
        "articles": [],
        "videos": [],
        "courses": [],
        "books": []
    }
    study_sessions: List[Any] = []
    review_sessions: List[Any] = []
    learning_paths: List[Any] = []
    reviews: List[Any] = []
    concepts: List[Any] = []
    goals: List[Any] = []
    metrics: List[Any] = []
    review_log: Dict[str, Any] = {}
    milestones: List[Any] = []

    class Config:
        from_attributes = True

class UserStatistics(BaseModel):
    """User statistics model."""
    total_resources: int = 0
    completed_resources: int = 0
    total_learning_paths: int = 0
    total_concepts: int = 0
    study_time: int = 0  # in minutes
    review_accuracy: float = 0.0
    active_days: int = 0
    completion_rate: float = 0.0

class NotificationPreferences(BaseModel):
    """User notification preferences model."""
    email_notifications: bool = True
    learning_reminders: bool = True
    review_reminders: bool = True
    achievement_notifications: bool = True
    newsletter: bool = True

def normalize_user_data(user_dict: dict) -> dict:
    """
    Normalize user data to ensure all required fields exist with proper types.

    Args:
        user_dict: The user dictionary to normalize

    Returns:
        A normalized user dictionary that conforms to the User model
    """
    # Create a copy of the user dict to avoid modifying the original
    user_data = dict(user_dict)

    # Convert MongoDB _id to id expected by Pydantic
    if "_id" in user_data and "id" not in user_data:
        # Convert ObjectId to string if needed
        if hasattr(user_data["_id"], "__str__"):
            user_data["id"] = str(user_data["_id"])
        else:
            user_data["id"] = user_data["_id"]

    # Handle resources field
    if "resources" not in user_data or not isinstance(user_data["resources"], dict):
        user_data["resources"] = {
            "articles": [],
            "videos": [],
            "courses": [],
            "books": []
        }
    else:
        # Ensure all resource types exist in the dictionary
        for resource_type in ["articles", "videos", "courses", "books"]:
            if resource_type not in user_data["resources"]:
                user_data["resources"][resource_type] = []
            # Ensure each resource list is actually a list
            elif not isinstance(user_data["resources"][resource_type], list):
                user_data["resources"][resource_type] = []

    # Ensure other list fields exist
    for field in ["study_sessions", "review_sessions", "learning_paths", "reviews",
                 "concepts", "goals", "metrics", "milestones"]:
        if field not in user_data or not isinstance(user_data[field], list):
            user_data[field] = []

    # Ensure review_log is a dictionary
    if "review_log" not in user_data or not isinstance(user_data["review_log"], dict):
        user_data["review_log"] = {}

    # Ensure boolean fields have proper values
    if "disabled" not in user_data:
        user_data["disabled"] = False
    if "is_active" not in user_data:
        user_data["is_active"] = True

    # Ensure created_at is present
    if "created_at" not in user_data:
        user_data["created_at"] = datetime.utcnow()

    # Add logic to split full_name into firstName and lastName
    if "full_name" in user_data and isinstance(user_data["full_name"], str):
        parts = user_data["full_name"].strip().split(' ', 1)
        user_data["firstName"] = parts[0]
        user_data["lastName"] = parts[1] if len(parts) > 1 else ""
    else:
        # Ensure firstName and lastName exist even if full_name doesn't
        if "firstName" not in user_data:
            user_data["firstName"] = ""
        if "lastName" not in user_data:
            user_data["lastName"] = ""

    # <<< Log the final normalized data >>>
    logger.info(f"Normalized user data before return: {user_data}")
    return user_data

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED,
            dependencies=[Depends(create_user_rate_limit)])
async def create_user(user: UserCreate, request: Request):
    """Create a new user."""
    try:
        # Validate email format
        if not validate_email(user.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )

        # Validate password strength
        if not validate_password_strength(user.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password too weak. Must be at least 8 characters and include uppercase, lowercase, number, and special character"
            )

        # Check if username already exists
        if await db.users.find_one({"username": user.username}):
            logger.warning(f"Username already exists: {user.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )

        # Check if email already exists
        if await db.users.find_one({"email": user.email}):
            logger.warning(f"Email already exists: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create user document
        user_dict = user.model_dump()
        user_dict["created_at"] = datetime.utcnow()
        user_dict["hashed_password"] = get_password_hash(user.password)
        user_dict["is_active"] = True

        # Remove plain password before saving
        del user_dict["password"]

        # Normalize user data to ensure it conforms to the User model
        user_dict = normalize_user_data(user_dict)

        # Insert user into database
        result = await db.users.insert_one(user_dict)

        # Add the generated ID to the user dict
        user_dict["id"] = str(result.inserted_id)

        logger.info(f"Created new user: {user.username}")
        return User(**user_dict)

    except HTTPException as he:
        # Re-raise HTTP exceptions directly to preserve status code and detail
        logger.warning(f"HTTP error during user creation: {he.status_code}: {he.detail}")
        raise
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user"
        )

@router.get("/me", response_model=User)
async def read_users_me(current_user: dict = Depends(get_current_active_user)):
    """Get current user profile."""
    # Check if current_user is already a User object or MockUser (for tests)
    if hasattr(current_user, 'model_dump') and callable(current_user.model_dump):
        user_data = current_user.model_dump()
    elif hasattr(current_user, 'dict') and callable(current_user.dict):
        user_data = current_user.dict()
    else:
        # Normalize user data to ensure it conforms to the User model
        user_data = normalize_user_data(current_user)
    return User(**user_data)

@router.get("/me/", response_model=User)
async def read_users_me_with_slash(current_user: dict = Depends(get_current_active_user)):
    """Get current user profile (endpoint with trailing slash)."""
    return await read_users_me(current_user)

@router.get("/{username}", response_model=User)
async def read_user(username: str):
    """Get user by username."""
    user = await db.users.find_one({"username": username})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if user is already a User object or MockUser (for tests)
    if hasattr(user, 'model_dump') and callable(user.model_dump):
        user_data = user.model_dump()
    elif hasattr(user, 'dict') and callable(user.dict):
        user_data = user.dict()
    else:
        # Normalize user data to ensure it conforms to the User model
        user_data = normalize_user_data(user)
    return User(**user_data)

@router.get("/me/statistics", response_model=UserStatistics)
async def get_user_statistics(current_user: dict = Depends(get_current_active_user)):
    """Get current user's statistics."""
    try:
        # Calculate statistics from user data
        total_resources = sum(len(resources) for resources in current_user.get("resources", {}).values())
        completed_resources = sum(
            1 for resources in current_user.get("resources", {}).values()
            for resource in resources if resource.get("completed", False)
        )

        # Calculate study time from sessions
        study_time = sum(
            session.get("duration", 0)
            for session in current_user.get("study_sessions", [])
        )

        # Calculate review accuracy
        reviews = current_user.get("review_log", {}).values()
        correct_reviews = sum(1 for review in reviews if review.get("result") == "correct")
        total_reviews = len(reviews)
        review_accuracy = (correct_reviews / total_reviews * 100) if total_reviews > 0 else 0

        # Calculate active days
        session_dates = set(
            session.get("created_at").date()
            for session in current_user.get("study_sessions", [])
            if session.get("created_at")
        )
        active_days = len(session_dates)

        # Calculate completion rate
        total_items = total_resources + len(current_user.get("learning_paths", []))
        completed_items = (
            completed_resources +
            sum(1 for path in current_user.get("learning_paths", []) if path.get("completed", False))
        )
        completion_rate = (completed_items / total_items * 100) if total_items > 0 else 0

        return UserStatistics(
            total_resources=total_resources,
            completed_resources=completed_resources,
            total_learning_paths=len(current_user.get("learning_paths", [])),
            total_concepts=len(current_user.get("concepts", [])),
            study_time=study_time,
            review_accuracy=review_accuracy,
            active_days=active_days,
            completion_rate=completion_rate
        )
    except Exception as e:
        logger.error(f"Error calculating user statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error calculating user statistics"
        )

@router.get("/me/notifications", response_model=NotificationPreferences)
async def get_notification_preferences(current_user: dict = Depends(get_current_active_user)):
    """Get current user's notification preferences."""
    try:
        # Get notification preferences from user data or return defaults
        preferences = current_user.get("notification_preferences", {})
        return NotificationPreferences(**preferences)
    except Exception as e:
        logger.error(f"Error getting notification preferences: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting notification preferences"
        )

@router.put("/me/notifications", response_model=NotificationPreferences)
async def update_notification_preferences(
    preferences: NotificationPreferences,
    current_user: dict = Depends(get_current_active_user)
):
    """Update current user's notification preferences."""
    try:
        # Update user's notification preferences
        result = await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"notification_preferences": preferences.model_dump()}}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not update notification preferences"
            )

        return preferences
    except Exception as e:
        logger.error(f"Error updating notification preferences: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating notification preferences"
        )

@router.post("/me/export", response_model=dict)
async def export_user_data(current_user: dict = Depends(get_current_active_user)):
    """Export current user's data."""
    try:
        # Create a clean copy of user data for export
        export_data = {
            "user_info": {
                "username": current_user["username"],
                "email": current_user["email"],
                "full_name": current_user.get("full_name"),
                "created_at": current_user["created_at"]
            },
            "learning_data": {
                "resources": current_user.get("resources", {}),
                "learning_paths": current_user.get("learning_paths", []),
                "concepts": current_user.get("concepts", []),
                "study_sessions": current_user.get("study_sessions", []),
                "review_sessions": current_user.get("review_sessions", []),
                "goals": current_user.get("goals", []),
                "milestones": current_user.get("milestones", [])
            },
            "statistics": (await get_user_statistics(current_user)).model_dump(),
            "preferences": (await get_notification_preferences(current_user)).model_dump(),
            "export_date": datetime.utcnow()
        }

        # Create a temporary file to store the export
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as tmp:
            json.dump(export_data, tmp, default=json_util.default, indent=2)
            tmp_path = tmp.name

        # Return the file as a download
        return FileResponse(
            tmp_path,
            media_type='application/json',
            filename=f'user_data_export_{current_user["username"]}_{datetime.utcnow().strftime("%Y%m%d")}.json'
        )
    except Exception as e:
        logger.error(f"Error exporting user data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error exporting user data"
        )
    finally:
        # Clean up the temporary file
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(current_user: dict = Depends(get_current_active_user)):
    """Delete current user's account."""
    try:
        # Start a transaction for atomic operations
        async with await db.client.start_session() as session:
            async with session.start_transaction():
                # Delete user's resources
                await db.resources.delete_many({"user_id": str(current_user["_id"])})

                # Delete user's learning paths
                await db.learning_paths.delete_many({"user_id": str(current_user["_id"])})

                # Delete user's study sessions
                await db.study_sessions.delete_many({"user_id": str(current_user["_id"])})

                # Delete user's reviews
                await db.reviews.delete_many({"user_id": str(current_user["_id"])})

                # Finally, delete the user
                result = await db.users.delete_one({"_id": current_user["_id"]})

                if result.deleted_count == 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Could not delete user account"
                    )

        return None
    except Exception as e:
        logger.error(f"Error deleting user account: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting user account"
        )