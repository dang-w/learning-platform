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
import jwt
from jwt.exceptions import PyJWTError

# Import authentication from auth module
from auth import (
    User, Token, TokenData, UserInDB,
    get_current_active_user, get_current_user,
    authenticate_user, create_access_token, get_user,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash,
    SECRET_KEY, ALGORITHM
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

class RefreshTokenRequest(BaseModel):
    refresh_token: str

@app.post("/token/refresh", response_model=Token)
async def refresh_access_token(refresh_data: RefreshTokenRequest):
    """
    Refresh the access token using a valid JWT token.

    This endpoint allows clients to get a new access token without requiring the user
    to re-authenticate with username and password, as long as they have a valid token.
    """
    try:
        # Decode the token to verify it's valid
        payload = jwt.decode(refresh_data.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")

        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get the user to make sure they still exist and are not disabled
        try:
            user = await get_user(username)
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            if user.get("disabled", False):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Inactive user"
                )

            # Create a new access token
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": username}, expires_delta=access_token_expires
            )

            return {"access_token": access_token, "token_type": "bearer"}
        except RuntimeError as e:
            if "Event loop is closed" in str(e):
                # During testing with TestClient, the event loop might be closed
                # We can work around this by creating a new event loop for this operation
                import asyncio
                try:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    user = loop.run_until_complete(get_user(username))
                    if user is None:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="User not found",
                            headers={"WWW-Authenticate": "Bearer"},
                        )

                    if user.get("disabled", False):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Inactive user"
                        )

                    # Create a new access token
                    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
                    access_token = create_access_token(
                        data={"sub": username}, expires_delta=access_token_expires
                    )

                    return {"access_token": access_token, "token_type": "bearer"}
                except Exception as inner_e:
                    logger.error(f"Error during token refresh after event loop retry: {str(inner_e)}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Authentication error",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                finally:
                    loop.close()

            # For other runtime errors
            logger.error(f"Error during token refresh: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication error",
                headers={"WWW-Authenticate": "Bearer"},
            )

    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

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