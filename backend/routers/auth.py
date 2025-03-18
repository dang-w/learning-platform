"""Authentication related routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class RefreshTokenRequest(BaseModel):
    refresh_token: str

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