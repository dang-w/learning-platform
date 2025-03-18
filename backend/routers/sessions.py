from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from uuid import uuid4
from typing import Any, Dict, List, Optional
import logging

from auth import get_current_active_user  # Corrected import path
from database import db  # Corrected import path

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

# Session expiry duration in minutes (e.g., 24 hours)
SESSION_EXPIRY_MINUTES = 60 * 24

class Session(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None

class SessionCreateResponse(BaseModel):
    session_id: str
    user_id: str
    expires_at: datetime

class SessionList(BaseModel):
    sessions: List[Session]

@router.post("/", response_model=SessionCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    current_user: dict = Depends(get_current_active_user),
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None,
    device_info: Optional[Dict[str, Any]] = None,
    background_tasks: BackgroundTasks = None
) -> Any:
    """Create a new session for the current user."""
    try:
        expires_at = datetime.utcnow() + timedelta(minutes=SESSION_EXPIRY_MINUTES)
        session = Session(
            user_id=str(current_user["_id"]),
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
            device_info=device_info
        )

        # Create session in database
        result = await db.sessions.insert_one(session.dict())
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Could not create session")

        # Cleanup expired sessions in the background
        if background_tasks:
            background_tasks.add_task(cleanup_expired_sessions)

        logger.info(f"Created new session {session.session_id} for user {current_user['username']}")
        return SessionCreateResponse(
            session_id=session.session_id,
            user_id=session.user_id,
            expires_at=session.expires_at
        )
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not create session: {str(e)}")

@router.get("/me", response_model=Session)
async def get_my_session(session_id: str, current_user: dict = Depends(get_current_active_user)) -> Any:
    """Retrieve the current session info based on session_id provided by the client."""
    session = await db.sessions.find_one({"session_id": session_id, "user_id": str(current_user["_id"])})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update last_active time
    await update_session_activity(session_id)

    return session

@router.get("/active", response_model=SessionList)
async def get_active_sessions(current_user: dict = Depends(get_current_active_user)) -> Any:
    """Get all active sessions for the current user."""
    now = datetime.utcnow()
    sessions = await db.sessions.find({
        "user_id": str(current_user["_id"]),
        "expires_at": {"$gt": now}
    }).to_list(None)

    return SessionList(sessions=sessions)

@router.put("/{session_id}/activity")
async def update_session_activity(session_id: str, current_user: dict = Depends(get_current_active_user)) -> Any:
    """Update the last_active timestamp of a session."""
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=SESSION_EXPIRY_MINUTES)

    result = await db.sessions.update_one(
        {"session_id": session_id, "user_id": str(current_user["_id"])},
        {"$set": {"last_active": now, "expires_at": expires_at}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": "Session activity updated"}

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, current_user: dict = Depends(get_current_active_user)) -> None:
    """Invalidate (delete) a session for the current user."""
    try:
        result = await db.sessions.delete_one({"session_id": session_id, "user_id": str(current_user["_id"])})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Session not found or already deleted")

        logger.info(f"Deleted session {session_id} for user {current_user['username']}")
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not delete session: {str(e)}")

@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_sessions(current_user: dict = Depends(get_current_active_user)) -> None:
    """Invalidate (delete) all sessions for the current user except the current one."""
    try:
        result = await db.sessions.delete_many({"user_id": str(current_user["_id"])})
        logger.info(f"Deleted {result.deleted_count} sessions for user {current_user['username']}")
    except Exception as e:
        logger.error(f"Error deleting all sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not delete sessions: {str(e)}")

async def cleanup_expired_sessions() -> int:
    """Delete all sessions that have expired."""
    try:
        now = datetime.utcnow()
        result = await db.sessions.delete_many({"expires_at": {"$lt": now}})
        if result.deleted_count > 0:
            logger.info(f"Cleaned up {result.deleted_count} expired sessions")
        return result.deleted_count
    except Exception as e:
        logger.error(f"Error cleaning up expired sessions: {str(e)}")
        return 0

@router.post("/cleanup", status_code=status.HTTP_200_OK)
async def trigger_cleanup(background_tasks: BackgroundTasks) -> Any:
    """Trigger a background task to clean up expired sessions."""
    background_tasks.add_task(cleanup_expired_sessions)
    return {"message": "Session cleanup triggered"}

async def create_login_session(
    user_id: str,
    username: str,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None
) -> str:
    """Create a session when a user logs in. Returns the session ID."""
    try:
        expires_at = datetime.utcnow() + timedelta(minutes=SESSION_EXPIRY_MINUTES)
        session = Session(
            user_id=user_id,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address
        )

        # Create session in database
        result = await db.sessions.insert_one(session.dict())
        if not result.inserted_id:
            logger.error("Could not create login session")
            return None

        logger.info(f"Created new login session {session.session_id} for user {username}")
        return session.session_id
    except Exception as e:
        logger.error(f"Error creating login session: {str(e)}")
        return None