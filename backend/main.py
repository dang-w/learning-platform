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
from jose import jwt, JWTError
import asyncio
import time
import traceback
import re
import uuid
import psutil
import platform
from datetime import timezone
from starlette_csrf import CSRFMiddleware
from contextlib import asynccontextmanager
import redis

# Import authentication from auth module
from auth import (
    User, Token, TokenData, UserInDB,
    get_current_active_user, get_current_user,
    authenticate_user, create_access_token, get_user,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash,
    SECRET_KEY, ALGORITHM, create_refresh_token, verify_refresh_token
)

# Import database connection
from database import db, verify_db_connection

# Import utility modules
from utils.error_handlers import APIError, handle_exception
from utils.response_models import ErrorResponse
from utils.validators import validate_email, validate_password_strength
from utils.rate_limiter import (
    rate_limit_dependency, get_client_identifier,
    get_redis_client,
    reset_rate_limit
)
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
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.resources import router as resources_router
from routers.progress import router as progress_router
from routers.learning_path import router as learning_path_router
from routers.reviews import router as reviews_router
from routers.sessions import router as sessions_router
from routers.lessons import router as lessons_router
from routers.url_extractor import router as url_extractor_router
from routers.notes import router as notes_router
from routers.users import normalize_user_data
from routers.test_utils import router as test_utils_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# CSRF Secret (Load from environment)
CSRF_SECRET_KEY = os.getenv("CSRF_SECRET")
if not CSRF_SECRET_KEY:
    logger.warning("CSRF_SECRET environment variable not set! CSRF protection might not function correctly.")
    # In a real production scenario, you might want to raise an error or exit
    # raise ValueError("CSRF_SECRET environment variable is required")
    CSRF_SECRET_KEY = "fallback_secret_for_dev_only_generate_a_real_one" # Fallback for safety during dev

# Load environment variables based on ENVIRONMENT
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
if ENVIRONMENT == "test":
    print("INFO: Loading .env.test for test environment")
    load_dotenv(dotenv_path=".env.test", override=True)
    logger.info(f"Loaded .env.test. Current ENVIRONMENT: {os.getenv('ENVIRONMENT')}") # Log ENVIRONMENT after potential override
    logger.info(f"ALLOW_DB_RESET value after loading .env.test: {os.getenv('ALLOW_DB_RESET')}") # Log ALLOW_DB_RESET value
else:
    print(f"INFO: Loading default .env for {ENVIRONMENT} environment")
    load_dotenv() # Loads .env by default
    logger.info(f"Loaded default .env. Current ENVIRONMENT: {os.getenv('ENVIRONMENT')}")
    logger.info(f"ALLOW_DB_RESET value after loading .env: {os.getenv('ALLOW_DB_RESET')}")

# --- Lifespan Management ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    logger.info("Starting learning platform API...")

    # Initialize monitoring
    await startup_monitoring()

    # Schedule session cleanup task (if needed, keep it simple)
    # Note: A more robust solution might use APScheduler or similar
    async def cleanup_sessions_periodically():
        try:
            while True:
                await asyncio.sleep(3600) # Wait 1 hour
                from routers.sessions import cleanup_expired_sessions
                count = await cleanup_expired_sessions()
                if count > 0:
                    logger.info(f"Background Task: Cleaned up {count} expired sessions")
        except asyncio.CancelledError:
             logger.info("Session cleanup task cancelled.")
        except Exception as e:
            logger.error(f"Error in periodic session cleanup task: {str(e)}")

    session_cleanup_task = asyncio.create_task(cleanup_sessions_periodically())
    logger.info("Session cleanup background task scheduled.")

    yield # Application runs here

    # Shutdown logic
    logger.info("Shutting down learning platform API...")

    # Cancel background tasks
    session_cleanup_task.cancel()
    try:
        await session_cleanup_task # Wait for task to acknowledge cancellation
    except asyncio.CancelledError:
        logger.info("Session cleanup task successfully cancelled during shutdown.")

    # Shutdown monitoring
    await shutdown_monitoring()
    logger.info("API shutdown complete.")
# --- End Lifespan Management ---

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Learning Platform API",
    description="API for managing learning resources, tracking progress, and facilitating spaced repetition learning",
    version="1.0.0",
    lifespan=lifespan # Add lifespan context manager
)
logger.info("FastAPI app initialized.") # Log app initialization

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "Retry-After"],
)

# Add CSRF Middleware (Place after CORS), but disable for test environment
if ENVIRONMENT != "test":
    app.add_middleware(
        CSRFMiddleware,
        secret=CSRF_SECRET_KEY,
        # Optional: Customize cookie name, header name, safe methods, etc.
        # cookie_name="csrftoken",
        # header_name="X-CSRF-Token",
        # safe_methods={"GET", "HEAD", "OPTIONS", "TRACE"},
        # cookie_secure=(ENVIRONMENT == "production"), # Set Secure flag in production
        # cookie_samesite="lax", # Consider 'lax' or 'strict'
    )
    logger.info(f"CSRF Middleware enabled for {ENVIRONMENT} environment.")
else:
    logger.info("CSRF Middleware disabled for test environment.")

# Mount routers
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(resources_router, prefix="/api/resources", tags=["resources"])
app.include_router(progress_router, prefix="/api/progress", tags=["progress"])
app.include_router(learning_path_router, prefix="/api/learning-path", tags=["learning_path"])
app.include_router(reviews_router, prefix="/api/reviews", tags=["reviews"])
app.include_router(lessons_router, prefix="/api/lessons", tags=["lessons"])
app.include_router(sessions_router, prefix="/api/sessions", tags=["sessions"])
app.include_router(notes_router, prefix="/api/notes", tags=["notes"])
app.include_router(test_utils_router, prefix="/api/test-utils", tags=["test_utils"])
logger.info("Included test_utils_router.") # Log router inclusion

# Import and include URL extractor router
app.include_router(url_extractor_router, prefix="/api/url-extractor", tags=["url_extractor"])
logger.info("Included url_extractor_router.") # Log router inclusion

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# Global exception handler
@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    """Handle API errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            message=exc.detail,
            error_code=exc.error_code
        ).model_dump()
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
        ).model_dump()
    )

# User creation model
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

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
    path = request.url.path

    # Apply strict CSP only to non-doc paths
    if not (path.startswith("/docs") or path.startswith("/redoc") or path == "/openapi.json"):
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'"
    # Note: For a production environment, you might want a more specific,
    # permissive policy for /docs and /redoc if needed, rather than no policy.

    # XSS Protection
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # Content-Type Options
    response.headers["X-Content-Type-Options"] = "nosniff"

    # Frame Options
    response.headers["X-Frame-Options"] = "DENY"

    # Strict Transport Security (only enable in production)
    if ENVIRONMENT == "production":
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
if ENVIRONMENT.lower() == "development":
    @app.post("/api/dev/reset-rate-limit")
    async def reset_rate_limit_endpoint(
        request: Request, # Moved non-default argument first
        key_prefix: str = "user_creation", # Default argument
        redis_client: redis.Redis = Depends(get_redis_client) # Inject redis client
    ):
        """
        Reset rate limit counters for development purposes only.
        This endpoint is only available in development mode.
        """
        from utils.rate_limiter import reset_rate_limit # Import locally or ensure top-level import

        if request and redis_client:
            client_id = get_client_identifier(request)
            # Pass the injected redis_client to the utility function
            success = await reset_rate_limit(redis_client, client_id, key_prefix)
            if success:
                return {"success": True, "message": f"Rate limit reset for {key_prefix}:{client_id}"}
            else:
                # Return failure if reset failed (e.g., key didn't exist)
                return {"success": False, "message": f"Rate limit key {key_prefix}:{client_id} not found or reset failed."}
        elif not redis_client:
             raise HTTPException(status_code=503, detail="Redis client unavailable for reset operation.")
        else:
             # This case should ideally not happen if Request is required
             raise HTTPException(status_code=400, detail="Request object required for client identification.")

# Add request tracking middleware
@app.middleware("http")
async def add_request_tracking(request: Request, call_next):
    """Add request tracking headers and logging."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    # Add timing
    start_time = datetime.now(timezone.utc)

    response = await call_next(request)

    # Add headers
    response.headers["X-Request-ID"] = request_id
    process_time = (datetime.now(timezone.utc) - start_time).total_seconds()
    response.headers["X-Process-Time"] = str(process_time)

    return response

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)