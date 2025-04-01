"""Authentication related routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Optional, Dict, Any
import logging
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
import os
from jose import jwt, JWTError

from auth import (
    User, Token, UserInDB, TokenData,
    authenticate_user, create_access_token, create_refresh_token,
    get_current_active_user, get_current_user, verify_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash,
    SECRET_KEY, ALGORITHM, oauth2_scheme
)
# Use relative import for modules within the same package
from .users import create_user
# Import specific rate limit instances
from utils.rate_limiter import (
    register_rate_limit,
    token_rate_limit,
    refresh_rate_limit,
    reset_rate_limit # Keep reset_rate_limit if used elsewhere, otherwise remove if unused
)
from utils.error_handlers import AuthenticationError, ValidationError
from database import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Helper function to safely extract username from current_user
def get_username_from_user(current_user) -> str:
    """Extract username from current_user object, handling different types."""
    username = current_user.get("username") if isinstance(current_user, dict) else getattr(current_user, "username", None)

    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username could not be determined from user object"
        )

    return username

# --- Input Models ---
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    confirm_password: str
    full_name: str

class LoginRequest(BaseModel):
    username: str
    password: str

class NotificationPreferences(BaseModel):
    """User notification preferences model."""
    email_notifications: bool = True
    learning_reminders: bool = True
    review_reminders: bool = True
    achievement_notifications: bool = True
    newsletter: bool = True

# --- Constants ---
# Determine cookie security based on environment
# Default to True (secure) if ENVIRONMENT is 'production', otherwise False
COOKIE_SECURE = os.getenv("ENVIRONMENT", "development") == "production"
COOKIE_SAMESITE = "lax" # Use 'lax' for better cross-site compatibility if needed, 'strict' is more secure
REFRESH_TOKEN_COOKIE_NAME = "refresh_token"

# --- Helper Functions ---

def set_refresh_token_cookie(response: Response, token: str):
    """Sets the refresh token cookie in the response."""
    refresh_token_expires = timedelta(days=7) # Example expiry for refresh token
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE, # Set based on environment
        samesite=COOKIE_SAMESITE,
        max_age=int(refresh_token_expires.total_seconds()),
        path="/" # Ensure path is appropriate for your app
    )

def clear_refresh_token_cookie(response: Response):
    """Clears the refresh token cookie in the response."""
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/"
    )

# --- Routes ---

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED,
             # Use the specific instance directly
             dependencies=[Depends(register_rate_limit)])
async def register(
    response: Response,
    register_data: RegisterRequest,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Register a new user.
    """
    try:
        # Validate input
        if register_data.password != register_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password and confirmation password do not match"
            )

        # Create user in database
        user = await create_user(register_data, request)

        # Generate tokens
        access_token = create_access_token(data={"sub": user.username})
        refresh_token = create_refresh_token(data={"sub": user.username})

        # Set refresh token cookie
        set_refresh_token_cookie(response, refresh_token)

        # Return access token in body
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

    except HTTPException as http_exc:
        raise
    except Exception as e:
        logger.error(f"Error during registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during registration"
        )

@router.post("/token", response_model=Token,
             # Use the specific instance directly
             dependencies=[Depends(token_rate_limit)])
async def login_for_access_token(
    response: Response,
    request: Request,
    login_data: LoginRequest,
    background_tasks: BackgroundTasks
):
    """
    Login endpoint accepting JSON credentials.
    Returns access token in body and refresh token in HttpOnly cookie.
    """
    try:
        # Authenticate using data from the JSON body model
        user = await authenticate_user(login_data.username, login_data.password)
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
        refresh_token = create_refresh_token(data={"sub": user["username"]})

        # Set the refresh token as an HttpOnly cookie
        set_refresh_token_cookie(response, refresh_token)

        logger.info(f"User {user['username']} logged in successfully. Refresh token set in cookie.")

        # Return access and refresh token in the body to match Token model
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during authentication: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during authentication"
        )

@router.post("/token/refresh", response_model=Token,
             # Use the specific instance directly
             dependencies=[Depends(refresh_rate_limit)])
async def refresh_access_token(
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks
):
    """
    Refresh the access token using a valid refresh token from an HttpOnly cookie.
    Returns a new access token in the body and sets a new refresh token cookie.
    """
    logger.info(f"--- ENTERING /token/refresh ---")
    logger.info(f"Request Headers: {request.headers}")
    logger.info(f"Request Cookies: {request.cookies}")
    try:
        # Get the refresh token from the HttpOnly cookie
        refresh_token = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)
        logger.info(f"Refresh token from cookie: {'Present' if refresh_token else 'MISSING'}")
        if not refresh_token:
            logger.warning("Refresh attempt failed: No refresh token cookie found.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token cookie not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify the refresh token
        payload = verify_refresh_token(refresh_token)
        if not payload:
            logger.warning("Refresh attempt failed: Invalid or expired refresh token from cookie.")
            # Clear potentially invalid cookie on verification failure
            clear_refresh_token_cookie(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        username = payload.get("sub")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create new access and refresh tokens
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": username}, expires_delta=access_token_expires
        )
        new_refresh_token = create_refresh_token(data={"sub": username})

        # Set the new refresh token as an HttpOnly cookie
        set_refresh_token_cookie(response, new_refresh_token)

        logger.info(f"Token refreshed for user {username}. New refresh token set in cookie.")

        # Return the new access and refresh token to match Token model
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }

    except HTTPException as http_exc:
        # If the exception already clears the cookie (e.g., verification failed), don't clear again
        if http_exc.status_code != 401 or "Invalid or expired refresh token" not in http_exc.detail:
            # Clear cookie on other potential auth errors during refresh
            clear_refresh_token_cookie(response)
        raise
    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}")
        # Clear cookie on unexpected errors
        clear_refresh_token_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error refreshing token"
        )

@router.get("/verify", response_model=User)
async def verify_token(current_user: User = Depends(get_current_active_user)):
    """
    Verify the current token and return the user information.
    This endpoint can be used to check if a token is still valid.
    """
    return current_user

@router.get("/debug", response_model=Dict[str, Any])
async def debug_auth_status(request: Request):
    """Debug endpoint to check authentication status.
    This should be disabled in production.
    """
    # Only available in development
    if os.getenv("ENVIRONMENT", "development") != "development":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endpoint not found"
        )

    # Get authentication headers
    auth_header = request.headers.get("Authorization", "")

    # Check cookies
    cookies = request.cookies

    # Basic information
    info = {
        "has_auth_header": bool(auth_header),
        "auth_header_type": auth_header.split(" ")[0] if auth_header else None,
        "cookies": list(cookies.keys()),
        "has_token_cookie": "token" in cookies,
        "request_url": str(request.url),
        "request_method": request.method,
        "client_host": request.client.host if request.client else None,
    }

    # Try to decode token if present
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            info["token_valid"] = True
            info["token_username"] = payload.get("sub")
            info["token_type"] = payload.get("type")
            info["token_expiry"] = datetime.fromtimestamp(payload.get("exp")).isoformat()
            info["token_issued_at"] = datetime.fromtimestamp(payload.get("iat")).isoformat() if "iat" in payload else None
        except Exception as e:
            info["token_valid"] = False
            info["token_error"] = str(e)

    return info

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Logout the user by invalidating their current session and clearing the refresh token cookie."""
    try:
        username = get_username_from_user(current_user)
        session_id = request.headers.get("x-session-id") or request.query_params.get("session_id")

        # Session invalidation (optional, keep if you use server-side sessions)
        if session_id:
            try:
                from routers.sessions import delete_session
                await delete_session(session_id, username)
                logger.info(f"Invalidated session {session_id} for user {username}")
            except ImportError:
                logger.warning("Sessions module not found, skipping session invalidation.")
            except Exception as session_err:
                logger.error(f"Error invalidating session {session_id} for user {username}: {session_err}")

        # Always clear the refresh token cookie on logout
        clear_refresh_token_cookie(response)
        logger.info(f"Cleared refresh token cookie for user {username} during logout.")

        # Return No Content response
        return response

    except Exception as e:
        # Log error but still attempt to clear cookie and return success
        logger.error(f"Error during logout for user potentially {current_user.get('username', 'unknown')}: {str(e)}")
        clear_refresh_token_cookie(response)
        return response

@router.get("/me", response_model=User,
            dependencies=[Depends(get_current_active_user)])
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    Get the current authenticated user's information.
    This endpoint is useful for client applications to retrieve user data after authentication.
    """
    try:
        # Import normalize_user_data function
        from routers.users import normalize_user_data

        # Return the normalized user data
        return normalize_user_data(current_user)
    except Exception as e:
        logger.error(f"Error retrieving current user info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving user information"
        )

@router.get("/statistics", response_model=Dict[str, Any])
async def get_auth_statistics(current_user: dict = Depends(get_current_active_user)):
    """
    Get authentication-related statistics for the current user.
    This includes login history, token refresh counts, and session information.
    """
    try:
        username = get_username_from_user(current_user)

        # Get database connection
        database = await get_db()

        # Get user document
        user = await database.users.find_one({"username": username})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Import sessions module
        try:
            from routers.sessions import get_user_sessions

            # Get active sessions
            active_sessions = await get_user_sessions(username)
        except ImportError as e:
            logger.error(f"Error importing sessions module: {str(e)}")
            # Provide empty active sessions if import fails
            active_sessions = []
        except Exception as e:
            logger.error(f"Error retrieving sessions: {str(e)}")
            active_sessions = []

        # Get metrics from user document
        user_metrics = user.get("metrics", [])

        # Filter auth-related metrics
        auth_metrics = [m for m in user_metrics if m.get("type") in ("login", "token_refresh", "logout")]

        # Calculate statistics
        login_count = sum(1 for m in auth_metrics if m.get("type") == "login")
        token_refresh_count = sum(1 for m in auth_metrics if m.get("type") == "token_refresh")
        logout_count = sum(1 for m in auth_metrics if m.get("type") == "logout")

        # Get last login time
        login_times = [m.get("timestamp") for m in auth_metrics if m.get("type") == "login" and "timestamp" in m]
        last_login = max(login_times) if login_times else None

        # Calculate days since creation
        days_since_creation = (datetime.utcnow() - user.get("created_at")).days if user.get("created_at") else None

        # Compile statistics
        statistics = {
            "login_count": login_count,
            "token_refresh_count": token_refresh_count,
            "logout_count": logout_count,
            "active_sessions_count": len(active_sessions),
            "last_login": last_login,
            "account_creation_date": user.get("created_at"),
            "days_since_creation": days_since_creation
        }

        return statistics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving auth statistics: {str(e)}")
        # Provide default statistics instead of failing with a 500 error
        return {
            "login_count": 0,
            "token_refresh_count": 0,
            "logout_count": 0,
            "active_sessions_count": 0,
            "last_login": None,
            "account_creation_date": None,
            "days_since_creation": 0
        }

@router.get("/notification-preferences", response_model=NotificationPreferences)
async def get_notification_preferences(current_user: dict = Depends(get_current_active_user)):
    """
    Get the user's notification preferences.
    This endpoint returns the user's preferences for various notification types.
    """
    try:
        username = get_username_from_user(current_user)

        # Get database connection
        database = await get_db()

        # Get user document
        user = await database.users.find_one({"username": username})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Extract notification preferences or use defaults
        notification_prefs = user.get("notification_preferences", {})

        # Create response with defaults for missing values
        response = NotificationPreferences(
            email_notifications=notification_prefs.get("email_notifications", True),
            learning_reminders=notification_prefs.get("learning_reminders", True),
            review_reminders=notification_prefs.get("review_reminders", True),
            achievement_notifications=notification_prefs.get("achievement_notifications", True),
            newsletter=notification_prefs.get("newsletter", True)
        )

        return response
    except Exception as e:
        logger.error(f"Error retrieving notification preferences: {str(e)}")
        # Return default preferences instead of throwing a 500 error
        return NotificationPreferences(
            email_notifications=True,
            learning_reminders=True,
            review_reminders=True,
            achievement_notifications=True,
            newsletter=True
        )

@router.put("/notification-preferences", response_model=NotificationPreferences)
async def update_notification_preferences(
    preferences: NotificationPreferences,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update the user's notification preferences.
    This endpoint allows changing settings for various notification types.
    """
    try:
        username = get_username_from_user(current_user)

        # Get database connection
        database = await get_db()

        # Update user document
        result = await database.users.update_one(
            {"username": username},
            {"$set": {"notification_preferences": preferences.model_dump()}}
        )

        if result.modified_count == 0:
            # Check if user exists
            user = await database.users.find_one({"username": username})
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

        return preferences
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating notification preferences: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating notification preferences"
        )