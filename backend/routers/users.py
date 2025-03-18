"""User management endpoints."""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr, constr
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime

from database import db
from auth import get_current_active_user, get_password_hash
from utils.validators import validate_email, validate_password_strength
from utils.rate_limiter import rate_limit_dependency

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class UserBase(BaseModel):
    username: constr(min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None

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

    return user_data

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit_dependency(limit=3, window=3600, key_prefix="user_creation"))])
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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )

        # Check if email already exists
        if await db.users.find_one({"email": user.email}):
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