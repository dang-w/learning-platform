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
import psutil
import platform
from datetime import timezone

# Import authentication from auth module
from auth import (
    User, Token, TokenData, UserInDB,
    get_current_active_user, get_current_user,
    authenticate_user, create_access_token, get_user,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash,
    SECRET_KEY, ALGORITHM, create_refresh_token, verify_refresh_token
)

# Import RefreshTokenRequest from auth router
from routers.auth import RefreshTokenRequest

# Import database connection
from database import db, verify_db_connection

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
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])

# Create additional auth routes for backward compatibility
@app.post("/auth/token/refresh", response_model=Token)
async def legacy_refresh_token(
    refresh_data: RefreshTokenRequest,
    _: None = Depends(rate_limit_dependency(limit=5, window=300, key_prefix="auth"))
):
    """Backward compatibility endpoint for token refresh"""
    logger.info("Legacy token refresh endpoint accessed, redirecting to API endpoint")
    # Forward to the main refresh endpoint
    return await auth.refresh_access_token(Request, refresh_data, _)

app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(resources.router, prefix="/api/resources", tags=["resources"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])
app.include_router(learning_path.router, prefix="/api/learning-path", tags=["learning_path"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["reviews"])
app.include_router(lessons.router, prefix="/api/lessons", tags=["lessons"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])

# Import and include URL extractor router
app.include_router(url_extractor.router, prefix="/api/url-extractor", tags=["url_extractor"])

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

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

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Welcome to the Learning Platform API"}

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}

@app.get("/api/health")
async def health_check():
    """
    API health check endpoint with detailed system information.
    Used by monitoring systems and Docker health checks.
    """
    # Check database connection
    db_status = await verify_db_connection()

    # Check Redis connection if available
    redis_status = "unavailable"
    try:
        from utils.cache import get_redis_connection
        redis = get_redis_connection()
        if redis and await redis.ping():
            redis_status = "ok"
    except Exception as e:
        redis_status = f"error: {str(e)}"

    # Get memory usage
    process = psutil.Process()
    memory_info = process.memory_info()

    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime": time.time() - process.create_time(),
        "system": {
            "platform": platform.platform(),
            "python_version": platform.python_version(),
        },
        "resources": {
            "memory_usage_mb": memory_info.rss / (1024 * 1024),
            "cpu_percent": process.cpu_percent(interval=0.1),
        },
        "services": {
            "database": db_status,
            "redis": redis_status
        }
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