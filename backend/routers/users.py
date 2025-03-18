"""User management endpoints."""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr, constr
from typing import Optional, List
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

    class Config:
        from_attributes = True

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
        user_dict = user.dict()
        user_dict["created_at"] = datetime.utcnow()
        user_dict["hashed_password"] = get_password_hash(user.password)
        user_dict["is_active"] = True

        # Remove plain password before saving
        del user_dict["password"]

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
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user profile."""
    return current_user

@router.get("/{username}", response_model=User)
async def read_user(username: str):
    """Get user by username."""
    user = await db.users.find_one({"username": username})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return User(**user)