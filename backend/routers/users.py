"""User management endpoints."""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr, constr, Field, ConfigDict
from typing import Optional, List, Dict, Any, Union
import logging
from datetime import datetime, timedelta, timezone
import json
from bson import json_util, ObjectId
from fastapi.responses import JSONResponse, FileResponse
import tempfile
import os

from database import db
from auth import get_current_active_user, get_password_hash
from utils.validators import validate_email, validate_password_strength
from utils.rate_limiter import rate_limit_dependency_with_logging, create_user_rate_limit
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError
from loguru import logger

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class UserBase(BaseModel):
    username: constr(min_length=3, max_length=50)
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserCreate(UserBase):
    password: constr(min_length=8)

# Add model for user profile updates (PATCH)
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    firstName: Optional[str] = None  # Use camelCase to match frontend request
    lastName: Optional[str] = None   # Use camelCase to match frontend request

class User(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    username: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    disabled: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_active: bool = True
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

    model_config = ConfigDict(
        populate_by_name=True,
        alias_priority = 2,
        json_encoders={
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }
    )

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
    Normalize user data to ensure all required fields exist with proper types,
    handling MongoDB's _id conversion.

    Args:
        user_dict: The user dictionary to normalize

    Returns:
        A normalized user dictionary that conforms to the User model
    """
    logger.debug(f"Normalizing user data. Input keys: {list(user_dict.keys())}")
    # Create a copy to avoid modifying the original dict if passed by reference elsewhere
    user_data = dict(user_dict)

    # Convert MongoDB _id to id string field and remove original _id
    if "_id" in user_data:
        _id_value = user_data.pop("_id")  # Remove original _id key
        try:
            user_data["id"] = str(_id_value)
            logger.debug(f"Converted _id ({type(_id_value)}) to id (str): {user_data['id']}")
        except Exception as e:
            logger.error(f"Error converting _id to string: {e}. Original _id: {_id_value}", exc_info=True)
            user_data["id"] = None # Set id to None if conversion fails
    elif "id" not in user_data:
        logger.warning("Neither '_id' nor 'id' found in user data. Setting 'id' to None.")
        user_data["id"] = None # Ensure id field exists, even if null

    # Ensure 'username' exists (it's required in the User model)
    if "username" not in user_data:
        # This case should ideally not happen if data comes from DB for existing users,
        # but good for robustness, especially during creation flow if normalization
        # happens before all fields are set.
        logger.warning("Username missing during normalization.")
        user_data["username"] = "" # Provide a default empty string

    # Ensure 'email' exists
    if "email" not in user_data:
         logger.warning("Email missing during normalization.")
         user_data["email"] = "" # Provide a default

    # Handle resources field
    if "resources" not in user_data or not isinstance(user_data.get("resources"), dict):
        user_data["resources"] = {
            "articles": [], "videos": [], "courses": [], "books": []
        }
    else:
        # Ensure all resource types exist and are lists
        default_resource_types = ["articles", "videos", "courses", "books"]
        for res_type in default_resource_types:
            if res_type not in user_data["resources"] or not isinstance(user_data["resources"].get(res_type), list):
                user_data["resources"][res_type] = []

    # Ensure other list fields exist and are lists
    list_fields = ["study_sessions", "review_sessions", "learning_paths", "reviews",
                   "concepts", "goals", "metrics", "milestones"]
    for field in list_fields:
        if field not in user_data or not isinstance(user_data.get(field), list):
            user_data[field] = []

    # Ensure review_log is a dictionary
    if "review_log" not in user_data or not isinstance(user_data.get("review_log"), dict):
        user_data["review_log"] = {}

    # Ensure boolean fields have default values if missing
    if "disabled" not in user_data:
        user_data["disabled"] = False
    if "is_active" not in user_data:
        user_data["is_active"] = True # Default to active

    # Ensure datetime fields exist or set defaults (optional: could leave as None if model allows)
    if "created_at" not in user_data:
         # Check if the model field allows None before setting a default
         user_data["created_at"] = None # Align with Optional[datetime]
    # Do the same for updated_at if needed, depends on model definition

    # Ensure optional string fields exist or set defaults (e.g., empty string or None)
    if "first_name" not in user_data:
        user_data["first_name"] = None # Align with Optional[str]
    if "last_name" not in user_data:
        user_data["last_name"] = None # Align with Optional[str]


    logger.debug(f"Normalization complete. Output keys: {list(user_data.keys())}")
    # <<< Log the final normalized data >>>
    return user_data

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED,
            dependencies=[Depends(create_user_rate_limit)], response_model_by_alias=False)
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

        # Prepare user document for insertion (excluding plain password)
        user_dict = user.model_dump()
        user_dict["created_at"] = datetime.now(timezone.utc)
        user_dict["updated_at"] = user_dict["created_at"] # Set initial updated_at
        user_dict["hashed_password"] = get_password_hash(user.password)
        user_dict["is_active"] = True
        user_dict["disabled"] = False # Ensure default
        # Initialize empty lists/dicts for fields managed elsewhere or optional
        user_dict["resources"] = {"articles": [], "videos": [], "courses": [], "books": []}
        user_dict["study_sessions"] = []
        user_dict["review_sessions"] = []
        user_dict["learning_paths"] = []
        user_dict["reviews"] = []
        user_dict["concepts"] = []
        user_dict["goals"] = []
        user_dict["metrics"] = []
        user_dict["review_log"] = {}
        user_dict["milestones"] = []
        # Remove plain password before saving
        del user_dict["password"]

        # Insert user into database
        result = await db.users.insert_one(user_dict)
        logger.info(f"User {user.username} inserted with ID: {result.inserted_id}")

        # Fetch the complete user document from DB to ensure all fields are present
        created_user_doc = await db.users.find_one({"_id": result.inserted_id})

        if not created_user_doc:
             logger.error(f"Failed to fetch user immediately after creation for username: {user.username}")
             raise HTTPException(status_code=500, detail="Failed to retrieve created user details")

        # Normalize the fetched data (handles _id -> id conversion, default fields etc.)
        normalized_user_data = normalize_user_data(created_user_doc)

        logger.info(f"Returning created user: {user.username}, ID: {normalized_user_data.get('id')}")
        # Create the Pydantic model from the normalized dictionary for the response
        return User(**normalized_user_data)

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

@router.get("/me", response_model=User, response_model_by_alias=False)
async def read_users_me(current_user: dict = Depends(get_current_active_user)):
    """Get current user profile."""
    # Check if current_user is already a User object or MockUser (for tests)
    if hasattr(current_user, 'model_dump') and callable(current_user.model_dump):
        user_data = current_user.model_dump()
    elif hasattr(current_user, 'dict') and callable(current_user.dict):
        user_data = current_user.dict()
    else:
        # Assume it's already a dict-like structure if dependency injection worked
        user_data = dict(current_user) # Ensure it's a mutable dict

    logger.debug(f"[read_users_me] Data before normalization: {user_data}")

    # Normalize the data before creating the response model
    normalized_user_data = normalize_user_data(user_data)
    logger.debug(f"[read_users_me] Data after normalization: {normalized_user_data}")

    try:
        user_model = User(**normalized_user_data)
        logger.debug(f"[read_users_me] Pydantic User model created: {user_model.model_dump(exclude_unset=True)}")
        return user_model
    except Exception as e:
        logger.error(f"[read_users_me] Error creating User model from normalized data: {e}", exc_info=True)
        logger.error(f"[read_users_me] Normalized data that caused error: {normalized_user_data}")
        raise HTTPException(status_code=500, detail="Internal server error processing user data.")

@router.get("/me/", response_model=User, response_model_by_alias=False)
async def read_users_me_with_slash(current_user: dict = Depends(get_current_active_user)):
    """Get current user profile (trailing slash)."""
    # Delegate to the non-slash version to avoid code duplication
    return await read_users_me(current_user)

@router.get("/{username}", response_model=User)
async def read_user(username: str):
    """Get user profile by username."""
    user_dict = await db.users.find_one({"username": username})
    if user_dict:
        normalized_user_data = normalize_user_data(user_dict)
        return User(**normalized_user_data)
    raise HTTPException(status_code=404, detail="User not found")

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
                "first_name": current_user.get("first_name"),
                "last_name": current_user.get("last_name"),
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
            "export_date": datetime.now(timezone.utc)
        }

        # Use ISO format for consistency
        export_data["export_date"] = export_data["export_date"].isoformat()

        # Create a temporary file to store the export
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as tmp:
            json.dump(export_data, tmp, default=json_util.default, indent=2)
            tmp_path = tmp.name

        # Return the file as a download
        return FileResponse(
            tmp_path,
            media_type='application/json',
            filename=f'user_data_export_{current_user["username"]}_{datetime.now(timezone.utc).strftime("%Y%m%d")}.json'
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

@router.patch("/me", response_model=User)
async def update_user_me(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update current user's profile (email, first_name, last_name)."""
    user_id = current_user["_id"]
    update_payload = update_data.model_dump(exclude_unset=True) # Only get fields sent by client

    if not update_payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update."
        )

    # Map frontend camelCase keys to backend snake_case keys for DB update
    db_update_dict = {}
    if "email" in update_payload:
        # Basic validation for the new email
        if not validate_email(update_payload["email"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email format")
        # Check if the new email is already taken by another user
        existing_user = await db.users.find_one({"email": update_payload["email"], "_id": {"$ne": user_id}})
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email address already in use by another account.")
        db_update_dict["email"] = update_payload["email"]

    if "firstName" in update_payload:
        # Add basic validation if needed (e.g., length)
        db_update_dict["first_name"] = update_payload["firstName"]
    if "lastName" in update_payload:
        # Add basic validation if needed (e.g., length)
        db_update_dict["last_name"] = update_payload["lastName"]

    # If password is included, hash it
    if "password" in update_payload:
        hashed_password = get_password_hash(update_payload["password"])
        db_update_dict["hashed_password"] = hashed_password

    # Add updated_at timestamp
    if db_update_dict:
        db_update_dict["updated_at"] = datetime.now(timezone.utc)
        await db.users.update_one({"_id": user_id}, {"$set": db_update_dict})
    else:
         # Should have been caught by the initial check, but as a safeguard:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid fields provided for update.")

    try:
        result = await db.users.update_one(
            {"_id": user_id},
            {"$set": db_update_dict}
        )

        if result.matched_count == 0: # Should not happen if user is authenticated
             logger.error(f"Attempted to update non-existent user: {user_id}")
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Fetch the updated document to return
        updated_user_doc = await db.users.find_one({"_id": user_id})

        if updated_user_doc is None:
            logger.error(f"Failed to fetch user after update: {user_id}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve updated user profile")

        # Normalize and return using the existing User model
        normalized_user = normalize_user_data(updated_user_doc)
        return User(**normalized_user)

    except DuplicateKeyError: # Should be caught by the explicit check above, but good to have
         logger.warning(f"Update failed due to potential duplicate key for user {user_id} with payload {db_update_dict}")
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail="An unexpected conflict occurred. The email might already be in use."
         )
    except Exception as e:
        logger.error(f"Error updating user profile for {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating user profile"
        )