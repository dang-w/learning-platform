"""Authentication related routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Optional, Dict, Any
import logging
from datetime import datetime, timedelta
from pydantic import BaseModel
import os
import jwt

from auth import (
    User, Token, UserInDB, TokenData,
    authenticate_user, create_access_token, create_refresh_token,
    get_current_active_user, get_current_user, verify_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash,
    SECRET_KEY, ALGORITHM
)
from utils.rate_limiter import rate_limit_dependency
from utils.error_handlers import AuthenticationError
from database import get_db

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

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class NotificationPreferences(BaseModel):
    """User notification preferences model."""
    email_notifications: bool = True
    learning_reminders: bool = True
    review_reminders: bool = True
    achievement_notifications: bool = True
    newsletter: bool = True

@router.post("/token", response_model=Token)
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    _: None = Depends(rate_limit_dependency(limit=5, window=300, key_prefix="auth"))
):
    """
    OAuth2 compatible token login endpoint.
    Returns both access and refresh tokens.
    """
    try:
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
        refresh_token = create_refresh_token(data={"sub": user["username"]})

        logger.info(f"User {user['username']} logged in successfully")

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

@router.post("/token/refresh", response_model=Token)
async def refresh_access_token(
    request: Request,
    refresh_data: RefreshTokenRequest,
    _: None = Depends(rate_limit_dependency(limit=5, window=300, key_prefix="auth"))
):
    """
    Refresh the access token using a valid refresh token.
    Returns both new access and refresh tokens.
    """
    try:
        # Verify the refresh token
        payload = verify_refresh_token(refresh_data.refresh_token)
        if not payload:
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

        logger.info(f"Token refreshed for user {username}")

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}")
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
    current_user: dict = Depends(get_current_active_user)
):
    """Logout the user by invalidating their current session"""
    try:
        # Get session ID from header or query param
        session_id = request.headers.get("x-session-id") or request.query_params.get("session_id")

        if session_id:
            # Import sessions module
            from routers.sessions import delete_session

            # Delete the session
            await delete_session(session_id, current_user)
            logger.info(f"Logged out user {current_user['username']} and invalidated session {session_id}")

        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        logger.error(f"Error during logout: {str(e)}")
        return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: dict = Depends(get_current_active_user)):
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