from fastapi import HTTPException, Request, status
import redis
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import logging
from typing import Optional, Tuple
import time
from functools import wraps
from fastapi import Depends

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables based on ENVIRONMENT
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
if ENVIRONMENT == "test":
    print("INFO [rate_limiter]: Loading .env.test")
    load_dotenv(dotenv_path=".env.test", override=True)
else:
    print(f"INFO [rate_limiter]: Loading default .env for {ENVIRONMENT}")
    load_dotenv()

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
REDIS_DB = int(os.getenv("REDIS_DB", "0"))

# Check if we're in development mode
IS_DEVELOPMENT = ENVIRONMENT.lower() == "development"
# Check if we are in test mode for E2E testing
IS_TEST_ENVIRONMENT = ENVIRONMENT.lower() == "test"

# Rate limit settings
RATE_LIMIT_SETTINGS = {
    "auth": {
        "requests": 20,     # 20 requests
        "window": 300       # per 5 minutes (300 seconds)
    },
    "user_creation": {
        "requests": 3,      # 3 requests
        "window": 3600      # per hour (3600 seconds)
    },
    "default": {
        "requests": 100,    # 100 requests
        "window": 60        # per minute (60 seconds)
    }
}

try:
    redis_client = redis.Redis.from_url(REDIS_URL, db=REDIS_DB, decode_responses=True)
    redis_client.ping()  # Test connection
    logger.info("Successfully connected to Redis")
except redis.ConnectionError as e:
    logger.error(f"Failed to connect to Redis: {str(e)}")
    redis_client = None

class RateLimitExceeded(HTTPException):
    def __init__(self, retry_after: int, limit: int, remaining: int, reset_time: int):
        super().__init__(
            status_code=429,
            detail="Rate limit exceeded",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": str(remaining),
                "X-RateLimit-Reset": str(reset_time)
            }
        )

def get_client_identifier(request: Request) -> str:
    """Generate a unique identifier for the client."""
    # Use X-Forwarded-For if behind a proxy, fallback to client host
    # Handle case where request.client is None (happens during tests)
    if request.client is None:
        client_ip = request.headers.get("X-Forwarded-For", "test-client")
    else:
        client_ip = request.headers.get("X-Forwarded-For", request.client.host)

    # Include User-Agent to differentiate between clients from same IP
    user_agent = request.headers.get("User-Agent", "")
    return f"{client_ip}:{user_agent}"

def check_rate_limit(
    identifier: str,
    limit: int,
    window: int,
    key_prefix: Optional[str] = None
) -> Tuple[bool, int, int, int]:
    """
    Check if the rate limit has been exceeded.

    Args:
        identifier: Unique identifier for the client
        limit: Maximum number of requests allowed in the window
        window: Time window in seconds
        key_prefix: Optional prefix for the rate limit key

    Returns:
        Tuple of (is_allowed, retry_after, remaining, reset_time)
    """
    if not redis_client:
        logger.warning("Redis not available - rate limiting disabled")
        return True, 0, limit, int(time.time() + window)

    current_time = int(time.time())

    # Build the key using prefix if provided
    if key_prefix:
        key = f"rate_limit:{key_prefix}:{identifier}"
    else:
        key = f"rate_limit:default:{identifier}"

    try:
        # Use pipeline for atomic operations
        pipe = redis_client.pipeline()

        # Get current count and timestamp
        pipe.get(key)
        pipe.ttl(key)
        count_str, ttl = pipe.execute()

        if count_str is None:
            # First request
            redis_client.setex(key, window, 1)
            return True, limit - 1, 0, current_time + window

        count = int(count_str)
        if count >= limit:
            # Rate limit exceeded
            return False, 0, ttl, current_time + ttl

        # Increment counter
        redis_client.incr(key)
        return True, limit - count - 1, 0, current_time + ttl

    except redis.RedisError as e:
        logger.error(f"Redis error: {str(e)}")
        # Fail open if Redis is unavailable
        return True, limit, 0, current_time + window

def reset_rate_limit(identifier: str, key_prefix: Optional[str] = None):
    """Reset the rate limit counter for a given identifier and key prefix.
    This should only be used in development and testing environments.

    Args:
        identifier: The client identifier (IP, user ID, etc.)
        key_prefix: Optional prefix for the rate limit key
    """
    if not redis_client:
        logger.warning("Redis is not available, can't reset rate limit")
        return False

    if key_prefix:
        key = f"rate_limit:{key_prefix}:{identifier}"
    else:
        key = f"rate_limit:default:{identifier}"

    result = redis_client.delete(key)
    logger.info(f"Rate limit reset for {key}: {result == 1}")
    return result == 1

def rate_limit_dependency_with_logging(
    limit: int = 60,  # requests
    window: int = 60,  # seconds
    key_prefix: Optional[str] = None
):
    """Create a FastAPI dependency for rate limiting with logging."""

    async def dependency(request: Request):
        # --- Start Debug Logging for Bypass ---
        skip_header = request.headers.get("X-Skip-Rate-Limit")
        client_id = get_client_identifier(request) # Get client_id early for logging
        logger.info(f"[Rate Limiter Log] Path: {request.url.path}, Client: {client_id}")
        logger.info(f"[Rate Limiter Log] Checking Header - X-Skip-Rate-Limit: '{skip_header}' (Type: {type(skip_header).__name__})")
        logger.info(f"[Rate Limiter Log] IS_DEVELOPMENT flag: {IS_DEVELOPMENT}")
        logger.info(f"[Rate Limiter Log] IS_TEST_ENVIRONMENT flag: {IS_TEST_ENVIRONMENT}") # Log test env flag

        # Skip rate limiting in development OR test environment when explicitly requested via header
        if (IS_DEVELOPMENT or IS_TEST_ENVIRONMENT) and request.headers.get("X-Skip-Rate-Limit") == "true":
            logger.info("[Rate Limiter Log] Bypass Active: Skipping rate limit check (DEVELOPMENT/TEST and Header is 'true').")
            return # Skip rate limiting

        # Log reason if bypass didn't happen
        if (IS_DEVELOPMENT or IS_TEST_ENVIRONMENT) and request.headers.get("X-Skip-Rate-Limit") != "true":
             logger.info(f"[Rate Limiter Log] Bypass Inactive: DEVELOPMENT/TEST is True but header is '{skip_header}' (not 'true').")
        elif not (IS_DEVELOPMENT or IS_TEST_ENVIRONMENT):
             logger.info(f"[Rate Limiter Log] Bypass Inactive: Not in DEVELOPMENT or TEST environment.")
        # --- End Debug Logging for Bypass ---

        # Get client identifier (IP address by default)
        identifier = get_client_identifier(request) # Already got this above

        # If Redis is not available, skip rate limiting
        if not redis_client:
            logger.warning("Redis is not available, skipping rate limiting")
            return

        # Check if rate limit is exceeded
        is_allowed, retry_after, remaining, reset_time = check_rate_limit(
            identifier=identifier,
            limit=limit,
            window=window,
            key_prefix=key_prefix
        )

        if not is_allowed:
            # Log the specific limit being enforced
            logger.warning(f"[Rate Limiter Log] Rate limit exceeded for key prefix '{key_prefix}' for client {identifier}. Limit: {limit}/{window}s.")
            raise RateLimitExceeded(
                retry_after=retry_after,
                limit=limit,
                remaining=remaining,
                reset_time=reset_time
            )
        else:
             # Log successful check
             logger.info(f"[Rate Limiter Log] Rate limit check passed for key prefix '{key_prefix}' for client {identifier}. Remaining: {remaining}")


    # Return the dependency function itself for FastAPI's Depends()
    return dependency

# Specific rate limit dependency instances
# Example: 5 requests per minute
rate_limit_dependency = rate_limit_dependency_with_logging(limit=100, window=60) # Default generous limit

# Updated stricter limit for user creation (matching users.py usage)
create_user_rate_limit = rate_limit_dependency_with_logging(limit=10, window=600, key_prefix="user_creation")

# Example: Limit for password reset requests
password_reset_rate_limit = rate_limit_dependency_with_logging(limit=5, window=900)

# Specific limits for auth router
register_rate_limit = rate_limit_dependency_with_logging(limit=5, window=3600, key_prefix="register")
token_rate_limit = rate_limit_dependency_with_logging(limit=10, window=60, key_prefix="token")
refresh_rate_limit = rate_limit_dependency_with_logging(limit=10, window=60, key_prefix="refresh")

# Specific limits for notes router
notes_read_rate_limit = rate_limit_dependency_with_logging(limit=50, window=60, key_prefix="notes_read")
notes_write_rate_limit = rate_limit_dependency_with_logging(limit=20, window=60, key_prefix="notes_write")

# Ensure file ends with a newline