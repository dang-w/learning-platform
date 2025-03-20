from fastapi import FastAPI, Depends, HTTPException, status, Request, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional, Dict, Any, Union, Tuple
import os
import json
from datetime import datetime, timedelta
import logging
from dotenv import load_dotenv
from pymongo.errors import DuplicateKeyError
import jwt
from jwt.exceptions import PyJWTError
import asyncio
import time
import traceback
import re
import uuid

# Import authentication from auth module
from auth import (
    User, Token, TokenData, UserInDB,
    get_current_active_user, get_current_user,
    authenticate_user, create_access_token, get_user,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash,
    SECRET_KEY, ALGORITHM, create_refresh_token, verify_refresh_token
)

# Import database connection
from database import db

# Import utility modules
from utils.error_handlers import APIError, handle_exception
from utils.response_models import ErrorResponse
from utils.validators import validate_email, validate_password_strength
from utils.rate_limiter import rate_limit_dependency, get_client_identifier
from utils.monitoring import (
    track_request_performance,
    log_auth_metrics,
    log_request_metrics,
    log_session_event,
    startup_monitoring,
    shutdown_monitoring,
    get_metrics,
    log_error
)

# Import routers directly
from routers import users, auth
from routers import resources, progress, learning_path, reviews
from routers import sessions, lessons
from routers.users import normalize_user_data

# Import and include URL extractor router
from routers import url_extractor

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Learning Platform API",
    description="API for managing learning resources, tracking progress, and facilitating spaced repetition learning",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "Retry-After"],
)

# Mount routers
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(resources.router, prefix="/api/resources", tags=["resources"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])
app.include_router(learning_path.router, prefix="/api/learning-path", tags=["learning_path"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["reviews"])
app.include_router(lessons.router, prefix="/api/lessons", tags=["lessons"])
app.include_router(sessions.router, tags=["sessions"])

# Import and include URL extractor router
app.include_router(url_extractor.router, prefix="/api/url-extractor", tags=["url_extractor"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

# Startup event to schedule session cleanup
@app.on_event("startup")
async def startup_event():
    logger.info("Starting learning platform API...")

    # Initialize monitoring
    await startup_monitoring()

    # Schedule session cleanup task
    async def cleanup_sessions_periodically():
        try:
            while True:
                # Wait for an hour (3600 seconds)
                await asyncio.sleep(3600)

                # Run the cleanup
                from routers.sessions import cleanup_expired_sessions
                count = await cleanup_expired_sessions()
                if count > 0:
                    logger.info(f"Cleaned up {count} expired sessions")
        except Exception as e:
            logger.error(f"Error in session cleanup task: {str(e)}")

    # Create the background task for session cleanup
    asyncio.create_task(cleanup_sessions_periodically())

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down learning platform API...")
    await shutdown_monitoring()

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
# This endpoint is duplicated in auth.py router, commenting out to avoid conflicts
# @app.post("/token", response_model=Token)
# async def login_for_access_token(
#     form_data: OAuth2PasswordRequestForm = Depends(),
#     _: None = Depends(rate_limit_dependency(limit=5, window=60, key_prefix="auth")),
#     request: Request = None,
# ):
#     """
#     OAuth2 compatible token login, get an access token for future requests.
#     """
#     # Log login attempt
#     await log_auth_metrics("login_attempts")
#
#     user = await authenticate_user(form_data.username, form_data.password)
#     if not user:
#         # Log login failure
#         await log_auth_metrics("login_failure")
#
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect username or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
#
#     # Log login success
#     await log_auth_metrics("login_success")
#
#     access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     access_token = create_access_token(
#         data={"sub": user["username"]}, expires_delta=access_token_expires
#     )
#     refresh_token = create_refresh_token(data={"sub": user["username"]})
#
#     # Create a session for the user
#     try:
#         from routers.sessions import create_login_session
#
#         # Get client info if request is available
#         if request:
#             user_agent = request.headers.get("user-agent", "")
#             ip_address = request.client.host
#
#             # Create session and get session ID
#             session_id = await create_login_session(
#                 user_id=str(user["_id"]),
#                 username=user["username"],
#                 user_agent=user_agent,
#                 ip_address=ip_address
#             )
#
#             # Log session creation
#             await log_session_event("created")
#
#             if not session_id:
#                 logger.warning(f"Failed to create session for user {user['username']}")
#     except Exception as e:
#         logger.error(f"Failed to create session during login: {str(e)}")
#         # Log error
#         await log_error("/token", "SessionCreationError", {"error": str(e), "username": user["username"]})
#
#     return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# This endpoint is duplicated in auth.py router, commenting out to avoid conflicts
# @app.post("/token/refresh", response_model=Token)
# async def refresh_access_token(
#     request: Request,
#     refresh_data: RefreshTokenRequest,
#     _: None = Depends(rate_limit_dependency(limit=5, window=60, key_prefix="auth"))
# ):
#     """
#     Refresh the access token using a valid refresh token.
#     """
#     # Log token refresh attempt
#     await log_auth_metrics("token_refresh")
#
#     # Verify the refresh token
#     payload = verify_refresh_token(refresh_data.refresh_token)
#     if not payload:
#         # Log token refresh failure
#         await log_auth_metrics("token_refresh_failure")
#
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Invalid or expired refresh token",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
#
#     username = payload.get("sub")
#     if not username:
#         # Log token refresh failure
#         await log_auth_metrics("token_refresh_failure")
#
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Invalid token claims",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
#
#     # Get the user to make sure they still exist and are not disabled
#     user = await get_user(username)
#     if not user:
#         # Log token refresh failure
#         await log_auth_metrics("token_refresh_failure")
#
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="User not found",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
#
#     if user.get("disabled", False):
#         # Log token refresh failure
#         await log_auth_metrics("token_refresh_failure")
#
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Inactive user"
#         )
#
#     # Create new access and refresh tokens
#     access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     access_token = create_access_token(
#         data={"sub": username}, expires_delta=access_token_expires
#     )
#     refresh_token = create_refresh_token(data={"sub": username})
#
#     return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

# This endpoint is duplicated in users.py router, commenting out to avoid conflicts
# @app.post("/users/", response_model=User, status_code=status.HTTP_201_CREATED)
# async def create_user(
#     user: UserCreate,
#     request: Request,
#     _: None = Depends(rate_limit_dependency(limit=3, window=3600, key_prefix="user_creation"))
# ):
#     """
#     Create a new user.
#
#     - Check if username already exists
#     - Hash the password
#     - Create user document with empty arrays for resources, etc.
#     - Insert into database
#     """
#     logger.info(f"Attempting to create user: {user.username}, {user.email}")
#
#     # Validate email format
#     try:
#         validate_email(user.email)
#     except APIError as e:
#         logger.warning(f"Email validation failed for {user.email}: {str(e.detail)}")
#         await log_error("/users/", "ValidationError", {"error": str(e.detail), "field": "email"})
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail=str(e.detail)
#         )
#
#     # Validate password strength
#     try:
#         validate_password_strength(user.password)
#     except APIError as e:
#         logger.warning(f"Password validation failed for user {user.username}: {str(e.detail)}")
#         await log_error("/users/", "ValidationError", {"error": str(e.detail), "field": "password"})
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail=str(e.detail)
#         )
#
#     # Check if username already exists
#     existing_user = await db.users.find_one({"username": user.username})
#     if existing_user:
#         logger.warning(f"Username already exists: {user.username}")
#         await log_error("/users/", "DuplicateUser", {"username": user.username})
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Username already registered"
#         )
#
#     # Hash the password
#     hashed_password = get_password_hash(user.password)
#
#     # Create user document with all required fields
#     user_data = {
#         "username": user.username,
#         "email": user.email,
#         "full_name": user.full_name,
#         "hashed_password": hashed_password,
#         "disabled": False,
#         "is_active": True,
#         "created_at": datetime.utcnow(),
#         "resources": {
#             "articles": [],
#             "videos": [],
#             "courses": [],
#             "books": []
#         },
#         "study_sessions": [],
#         "review_sessions": [],
#         "learning_paths": [],
#         "reviews": [],
#         "concepts": [],
#         "goals": [],
#         "metrics": [],
#         "review_log": {},
#         "milestones": []
#     }
#
#     try:
#         # Insert user into database
#         result = await db.users.insert_one(user_data)
#         logger.info(f"User {user.username} created successfully with ID: {result.inserted_id}")
#
#         # Add the ID to the response
#         user_data["id"] = str(result.inserted_id)
#
#         # Remove sensitive data before returning
#         user_data.pop("hashed_password", None)
#
#         return user_data
#
#     except DuplicateKeyError:
#         logger.warning(f"DuplicateKeyError for username: {user.username}")
#         await log_error("/users/", "DuplicateKeyError", {"username": user.username})
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Username already registered"
#         )
#     except Exception as e:
#         logger.error(f"Error creating user {user.username}: {str(e)}", exc_info=True)
#         await log_error("/users/", "ServerError", {"error": str(e), "username": user.username})
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Failed to create user: {str(e)}"
#         )

# This endpoint is duplicated in users.py router, commenting out to avoid conflicts
# @app.get("/users/me/", response_model=User)
# async def read_users_me(current_user: dict = Depends(get_current_active_user)):
#     # Check if current_user is already a User object or MockUser (for tests)
#     if hasattr(current_user, 'model_dump') and callable(current_user.model_dump):
#         user_data = current_user.model_dump()
#     elif hasattr(current_user, 'dict') and callable(current_user.dict):
#         user_data = current_user.dict()
#     else:
#         # Normalize user data to ensure it conforms to the User model
#         user_data = normalize_user_data(current_user)
#     return User(**user_data)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to the Learning Platform API"}

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """
    Health check endpoint to verify API is running and
    database connection is working.
    """
    try:
        # Check database connection
        db_status = await db.command("ping")

        # Count users to further verify database access
        user_count = await db.users.count_documents({})

        return {
            "status": "healthy",
            "database": "connected" if db_status.get("ok") == 1 else "error",
            "user_count": user_count,
            "api_version": "0.1.0",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Add middleware to include rate limit headers in responses
@app.middleware("http")
async def add_rate_limit_headers(request: Request, call_next):
    """Add rate limit headers to responses."""
    response = await call_next(request)

    # Add rate limit headers if they exist
    if hasattr(request.state, "rate_limit_headers"):
        for header, value in request.state.rate_limit_headers.items():
            response.headers[header] = str(value)

    return response

# Add security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)

    # Content Security Policy
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'"

    # XSS Protection
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # Content-Type Options
    response.headers["X-Content-Type-Options"] = "nosniff"

    # Frame Options
    response.headers["X-Frame-Options"] = "DENY"

    # Strict Transport Security (only enable in production)
    if os.getenv("ENVIRONMENT", "development") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return response

# Add performance monitoring middleware
@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    """Monitor request performance and metrics."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time

    # Run metrics logging in the background to avoid impacting response time
    asyncio.create_task(log_request_metrics(request, response, process_time))

    return response

# Metrics endpoint
@app.get("/api/metrics", dependencies=[Depends(get_current_active_user)])
async def metrics_endpoint():
    """Get current metrics (only for authenticated users)."""
    return get_metrics()

# Add this in the API router section
if os.getenv("ENVIRONMENT", "development").lower() == "development":
    @app.post("/api/dev/reset-rate-limit")
    async def reset_rate_limit_endpoint(
        key_prefix: str = "user_creation",
        request: Request = None
    ):
        """
        Reset rate limit counters for development purposes only.
        This endpoint is only available in development mode.
        """
        from utils.rate_limiter import reset_rate_limit

        if request:
            client_id = get_client_identifier(request)
            success = reset_rate_limit(client_id, key_prefix)
            return {"success": success, "message": f"Rate limit reset for {key_prefix}"}
        else:
            return {"success": False, "message": "Request object required"}

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)