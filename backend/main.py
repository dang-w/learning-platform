from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
from datetime import datetime, timedelta
import logging
from dotenv import load_dotenv
from pymongo.errors import DuplicateKeyError

# Import authentication from auth module
from auth import (
    User, Token, TokenData, UserInDB,
    get_current_active_user, get_current_user,
    authenticate_user, create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash
)

# Import database connection
from database import db

# Import utility modules
from utils.error_handlers import APIError, handle_exception
from utils.response_models import ErrorResponse
from utils.validators import validate_email, validate_password_strength

# Import routers
from routers import (
    resources,
    progress,
    reviews,
    learning_path,
    url_extractor
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Learning Platform API",
    description="API for the Learning Platform application",
    version="0.1.0",
)

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    """Handle API errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            message=exc.detail,
            error_code=exc.error_code
        ).dict()
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            message="An unexpected error occurred",
            error_code="INTERNAL_ERROR"
        ).dict()
    )

# User creation model
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None

# Authentication routes
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate):
    """
    Create a new user.

    - Check if username already exists
    - Hash the password
    - Create user document with empty arrays for resources, etc.
    - Insert into database
    """
    # Validate email format
    try:
        validate_email(user.email)
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.detail)
        )

    # Validate password strength
    try:
        validate_password_strength(user.password)
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.detail)
        )

    # Check if username already exists
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # Hash the password
    hashed_password = get_password_hash(user.password)

    # Create user document
    user_data = {
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "hashed_password": hashed_password,
        "disabled": False,
        "resources": {
            "articles": [],
            "videos": [],
            "courses": [],
            "books": []
        },
        "study_sessions": [],
        "review_sessions": [],
        "learning_paths": [],
        "reviews": [],
        "concepts": [],
    }

    try:
        # Insert user into database
        await db.users.insert_one(user_data)
    except DuplicateKeyError:
        # This is a fallback in case the first check fails
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

    # Return user without hashed password
    user_data.pop("hashed_password")
    return user_data

@app.get("/users/me/", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to the Learning Platform API"}

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Include routers
app.include_router(
    resources.router,
    prefix="/api/resources",
    tags=["resources"],
)

app.include_router(
    progress.router,
    prefix="/api/progress",
    tags=["progress"],
)

app.include_router(
    reviews.router,
    prefix="/api/reviews",
    tags=["reviews"],
)

app.include_router(
    learning_path.router,
    prefix="/api/learning-path",
    tags=["learning-path"],
)

app.include_router(
    url_extractor.router,
    prefix="/api/url-extractor",
    tags=["url-extractor"],
)

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)