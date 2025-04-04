"""Notes management endpoints."""
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timezone
import logging
from bson import ObjectId
import uuid

from database import db
from auth import get_current_active_user
from utils.rate_limiter import (
    notes_read_rate_limit,
    notes_write_rate_limit
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class NoteBase(BaseModel):
    """Base note model."""
    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Title of the note"
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=50000,
        description="Note content"
    )
    tags: List[str] = Field(
        default=[],
        max_length=10,
        description="Tags associated with the note"
    )

    @field_validator('title')
    @classmethod
    def title_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Title must not be empty')
        return v

    @field_validator('tags')
    @classmethod
    def tags_must_be_unique_and_lowercase(cls, v: List[str]) -> List[str]:
        if not v:
            return []
        processed_tags = {tag.lower().strip() for tag in v if tag.strip()}
        processed_tags.discard('')
        if len(processed_tags) > 10:
             raise ValueError('Cannot have more than 10 unique tags')
        return sorted(list(processed_tags))

    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }
    )

class NoteCreate(NoteBase):
    """Note creation model."""
    pass

class NoteUpdate(BaseModel):
    """Note update model."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1, max_length=50000)
    tags: Optional[List[str]] = Field(None, max_length=10)

    model_config = ConfigDict(
        validate_assignment=True,
        extra='ignore'
    )

class NotePagination(BaseModel):
    """Pagination response model."""
    items: List[Dict]
    total: int
    skip: int
    limit: int
    total_pages: int
    current_page: int

class Note(NoteBase):
    """Note response model."""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic config for Note model."""
        from_attributes = True

def get_user_id(current_user) -> str:
    """Safely extract user ID from current_user which can be a dict or an object."""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    if isinstance(current_user, dict) and "_id" in current_user:
        return str(current_user["_id"])
    elif hasattr(current_user, "_id"):
        return str(current_user._id)
    elif hasattr(current_user, "id"):
        return str(current_user.id)
    else:
        try:
            return str(current_user.get("_id") if hasattr(current_user, "get") else current_user["_id"])
        except (KeyError, AttributeError, TypeError):
            logger.error(f"Could not extract user ID from current_user: {current_user}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error identifying user"
            )

@router.get("/", response_model=NotePagination)
async def get_notes(
    request: Request,
    tag: Optional[str] = Query(None, description="Filter notes by tag"),
    skip: int = Query(0, ge=0, description="Number of notes to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of notes to return"),
    current_user: dict = Depends(get_current_active_user),
    _: None = Depends(notes_read_rate_limit)
):
    """Get all notes for the current user with pagination."""
    try:
        user_id = get_user_id(current_user)
        note_filter = {"user_id": user_id}

        if tag:
            note_filter["tags"] = tag

        # Get total count for pagination
        total = await db.notes.count_documents(note_filter)
        total_pages = (total + limit - 1) // limit
        current_page = (skip // limit) + 1

        # Query database with pagination
        notes_cursor = db.notes.find(note_filter)\
            .sort("updated_at", -1)\
            .skip(skip)\
            .limit(limit)

        notes = await notes_cursor.to_list(length=None)

        # Format response
        for note in notes:
            note["id"] = str(note["_id"])

        logger.info(f"Retrieved {len(notes)} notes for user {user_id}")

        return {
            "items": notes,
            "total": total,
            "skip": skip,
            "limit": limit,
            "total_pages": total_pages,
            "current_page": current_page
        }
    except HTTPException as e:
        logger.error(f"Error getting notes: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Error getting notes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving notes"
        )

@router.get("/{note_id}", response_model=Note)
async def get_note(
    note_id: str,
    current_user: dict = Depends(get_current_active_user),
    _: None = Depends(notes_read_rate_limit)
):
    """Get a specific note by ID."""
    try:
        user_id = get_user_id(current_user)

        try:
            object_id = ObjectId(note_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid note ID format"
            )

        note = await db.notes.find_one({"_id": object_id, "user_id": user_id})

        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found"
            )

        note["id"] = str(note["_id"])
        logger.info(f"Retrieved note {note_id} for user {user_id}")
        return note
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting note: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving note"
        )

@router.post("/", response_model=Note, status_code=status.HTTP_201_CREATED)
async def create_note(
    note: NoteCreate,
    current_user: dict = Depends(get_current_active_user),
    _: None = Depends(notes_write_rate_limit)
):
    """Create a new note."""
    try:
        user_id = get_user_id(current_user)

        now = datetime.now(timezone.utc)
        note_dict = note.model_dump()
        note_dict["user_id"] = user_id
        note_dict["created_at"] = now
        note_dict["updated_at"] = now

        result = await db.notes.insert_one(note_dict)
        created_note = await db.notes.find_one({"_id": result.inserted_id})
        created_note["id"] = str(created_note["_id"])

        logger.info(f"Created note {created_note['id']} for user {user_id}")
        return created_note
    except Exception as e:
        logger.error(f"Error creating note: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating note"
        )

@router.put("/{note_id}", response_model=Note)
async def update_note(
    note_id: str,
    note_update: NoteUpdate,
    current_user: dict = Depends(get_current_active_user),
    _: None = Depends(notes_write_rate_limit)
):
    """Update an existing note."""
    try:
        user_id = get_user_id(current_user)

        try:
            object_id = ObjectId(note_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid note ID format"
            )

        existing_note = await db.notes.find_one({"_id": object_id, "user_id": user_id})

        if not existing_note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found"
            )

        update_data = {}
        if note_update.title is not None: update_data["title"] = note_update.title
        if note_update.content is not None: update_data["content"] = note_update.content
        if note_update.tags is not None: update_data["tags"] = note_update.tags
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc)
            update_result = await db.notes.update_one(
                {"_id": object_id, "user_id": user_id},
                {"$set": update_data}
            )

        updated_note = await db.notes.find_one({"_id": object_id})
        updated_note["id"] = str(updated_note["_id"])

        logger.info(f"Updated note {note_id} for user {user_id}")
        return updated_note
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating note: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating note"
        )

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    current_user: dict = Depends(get_current_active_user),
    _: None = Depends(notes_write_rate_limit)
):
    """Delete a note."""
    try:
        user_id = get_user_id(current_user)

        try:
            object_id = ObjectId(note_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid note ID format"
            )

        existing_note = await db.notes.find_one({"_id": object_id, "user_id": user_id})

        if not existing_note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found"
            )

        await db.notes.delete_one({"_id": object_id, "user_id": user_id})
        logger.info(f"Deleted note {note_id} for user {user_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting note: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting note"
        )