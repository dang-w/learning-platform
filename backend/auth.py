from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import os
import logging
from dotenv import load_dotenv
from passlib.context import CryptContext
import redis

# Import utility functions
from utils.validators import validate_email, validate_password_strength
from utils.error_handlers import AuthenticationError, ValidationError

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Constants
SECRET_KEY = os.getenv("SECRET_KEY", "test_secret_key_for_testing")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = 30

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_ENABLED = os.getenv("REDIS_ENABLED", "true").lower() == "true"

# Initialize redis client
redis_client = None

# Only attempt Redis connection if enabled
if REDIS_ENABLED:
    try:
        redis_client = redis.Redis.from_url(REDIS_URL, db=REDIS_DB, decode_responses=True, socket_timeout=2.0)
        redis_client.ping()  # Test connection with a short timeout
        logger.info("Successfully connected to Redis")
    except redis.ConnectionError as e:
        logger.warning(f"Failed to connect to Redis: {str(e)}")
        logger.warning("Token reuse prevention will be disabled")
        redis_client = None
    except Exception as e:
        logger.error(f"Unexpected Redis error: {str(e)}")
        redis_client = None
else:
    logger.info("Redis disabled by configuration. Token reuse prevention will be disabled.")

# Database connection - import the get_db function instead of db directly
# This makes it easier to mock the database for testing
from database import db as _db  # Import with alias to avoid conflicts

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Function to get the database instance
def get_db():
    """Get the database instance."""
    return _db

# Models
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    id: Optional[str] = None
    username: str
    email: str
    full_name: Optional[str] = None
    disabled: bool = False
    is_active: bool = True
    created_at: Optional[datetime] = None
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

class UserInDB(User):
    hashed_password: str

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

# Authentication functions
async def get_user(username: str) -> Optional[dict]:
    """Get user from database."""
    try:
        user = await _db.users.find_one({"username": username})
        return user
    except Exception as e:
        logger.error(f"Error getting user {username}: {str(e)}")
        return None

async def authenticate_user(username: str, password: str) -> Optional[dict]:
    """Authenticate a user."""
    user = await get_user(username)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return user

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create an access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create a refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Get current user from token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        logger.debug("Attempting to decode JWT token")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        username: str = payload.get("sub")
        if username is None:
            logger.warning("Token missing 'sub' claim")
            raise credentials_exception

        token_data = TokenData(username=username)
        logger.debug(f"JWT token decoded for user: {username}")
    except JWTError as e:
        logger.error(f"JWT decode error: {str(e)}")
        raise credentials_exception

    try:
        user = await get_user(username=token_data.username)
        if user is None:
            logger.warning(f"User not found: {token_data.username}")
            raise credentials_exception
        return user
    except Exception as e:
        logger.error(f"Failed to get user: {str(e)}")
        raise credentials_exception

async def get_current_active_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Get current active user."""
    if current_user.get("disabled"):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def verify_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify a refresh token and return its payload if valid."""
    try:
        logger.debug(f"Attempting to verify refresh token")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Verify token type
        if payload.get("type") != "refresh":
            logger.debug("Token type is not 'refresh'")
            return None

        # Check if token has been used before
        if redis_client and redis_client.get(f"used_token:{token}"):
            logger.debug("Token has been used before")
            return None

        # Mark token as used in Redis with expiration
        if redis_client:
            # Set expiration to match token expiry
            exp = payload.get("exp")
            if exp:
                ttl = max(0, int(exp - datetime.utcnow().timestamp()))
                redis_client.setex(f"used_token:{token}", ttl, "1")
                logger.debug(f"Token marked as used with TTL: {ttl}")
        else:
            logger.warning("Redis client not available, token reuse prevention disabled")

        return payload
    except JWTError as e:
        logger.debug(f"Failed to verify refresh token: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error verifying refresh token: {str(e)}")
        return None