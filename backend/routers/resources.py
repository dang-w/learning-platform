"""Resources router."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Import database connection from shared module
from database import db

# Import utility functions
from utils.db_utils import get_document_by_id, update_document, delete_document
from utils.validators import validate_resource_type, validate_url, validate_rating
from utils.error_handlers import ValidationError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Import authentication functions from auth
from auth import get_current_active_user, User

# Models
class ResourceBase(BaseModel):
    title: str
    url: str
    topics: List[str]
    difficulty: str
    estimated_time: int

class ResourceCreate(ResourceBase):
    resource_type: str
    notes: Optional[str] = ""
    priority: Optional[str] = "medium"
    source: Optional[str] = "web"

class Resource(ResourceBase):
    id: int
    completed: bool = False
    date_added: str
    completion_date: Optional[str] = None
    notes: str = ""

class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    topics: Optional[List[str]] = None
    difficulty: Optional[str] = None
    estimated_time: Optional[int] = None
    notes: Optional[str] = None

class ResourceComplete(BaseModel):
    notes: Optional[str] = None

# Model for batch creation
class BatchResourceItem(BaseModel):
    title: str
    url: str
    topics: List[str]
    difficulty: str
    estimated_time: int
    resource_type: str
    notes: Optional[str] = ""
    priority: Optional[str] = "medium"
    source: Optional[str] = "web"

class ResourceBatchCreate(BaseModel):
    resources: List[BatchResourceItem]

# Define a direct model for batch POST requests
class ResourceBatchRequest(BaseModel):
    resources: List[Dict[str, Any]]

# We need to add this model to the top of the file with other models
class ResourceBatchCreateTest(BaseModel):
    resources: List[BatchResourceItem]

# Helper functions
async def get_next_resource_id(db, username, resource_type):
    """Get the next available ID for a resource."""
    try:
        # Ensure username is a string
        if not isinstance(username, str):
            if hasattr(username, 'username'):
                username = username.username
            elif isinstance(username, dict) and 'username' in username:
                username = username.get('username')
            else:
                logger.error(f"Invalid username format: {type(username)}")
                return 1

        user = await db.users.find_one({"username": username})
        if not user or "resources" not in user or resource_type not in user["resources"]:
            return 1

        resources = user["resources"][resource_type]
        if not resources:
            return 1

        # Find the highest ID
        max_id = 0
        for resource in resources:
            if "id" in resource and isinstance(resource["id"], int) and resource["id"] > max_id:
                max_id = resource["id"]

        return max_id + 1
    except Exception as e:
        logger.error(f"Error in get_next_resource_id: {str(e)}")
        # Return 1 as default if any error occurs
        return 1

# Routes
@router.get("/", response_model=Dict[str, List[Resource]])
async def get_all_resources(current_user: User = Depends(get_current_active_user)):
    """Get all resources for the current user."""
    try:
        # Try to handle both cases where current_user is a User object or a dictionary
        username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

        if not username:
            logger.error("Username not found in current_user object")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User information is incomplete"
            )

        user = await db.users.find_one({"username": username})
        if not user or "resources" not in user:
            return {"articles": [], "videos": [], "courses": [], "books": []}

        return user["resources"]
    except Exception as e:
        logger.error(f"Error in get_all_resources: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve resources: {str(e)}"
        )

# Statistics endpoint - moved before the resource_type parameter route
@router.get("/statistics", response_model=Dict[str, Any])
async def get_resource_statistics(current_user: User = Depends(get_current_active_user)):
    """Get statistics about the user's resources."""
    try:
        # Ensure current_user is a dict
        if not isinstance(current_user, dict):
            current_user_dict = current_user.dict() if hasattr(current_user, "dict") else current_user
            username = current_user_dict.get("username")
        else:
            username = current_user.get("username")

        if not username:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User information is incomplete"
            )

        # Get user data from database
        user = await db.users.find_one({"username": username})
        if not user or "resources" not in user:
            return {
                "total": 0,
                "completed": 0,
                "completion_percentage": 0,
                "by_type": {},
                "by_difficulty": {"beginner": 0, "intermediate": 0, "advanced": 0},
                "by_topic": {},
                "estimated_time": {"total": 0, "completed": 0, "remaining": 0}
            }

        # Initialize statistics
        stats = {
            "total": 0,
            "completed": 0,
            "by_type": {},
            "by_difficulty": {"beginner": 0, "intermediate": 0, "advanced": 0},
            "by_topic": {},
            "estimated_time": {"total": 0, "completed": 0, "remaining": 0}
        }

        # Calculate statistics
        for resource_type in ["articles", "videos", "courses", "books"]:
            if resource_type not in user["resources"]:
                continue

            resources = user["resources"][resource_type]
            type_count = len(resources)
            type_completed = sum(1 for r in resources if r.get("completed", False))

            stats["total"] += type_count
            stats["completed"] += type_completed

            stats["by_type"][resource_type] = {
                "total": type_count,
                "completed": type_completed
            }

            # Accumulate time statistics and counts by difficulty/topic
            for resource in resources:
                # Add to difficulty stats
                difficulty = resource.get("difficulty", "beginner")
                if difficulty in stats["by_difficulty"]:
                    stats["by_difficulty"][difficulty] += 1
                else:
                    stats["by_difficulty"][difficulty] = 1

                # Add to topic stats
                for topic in resource.get("topics", []):
                    if topic not in stats["by_topic"]:
                        stats["by_topic"][topic] = 0
                    stats["by_topic"][topic] += 1

                # Add to time stats
                time = resource.get("estimated_time", 0)
                stats["estimated_time"]["total"] += time
                if resource.get("completed", False):
                    stats["estimated_time"]["completed"] += time
                else:
                    stats["estimated_time"]["remaining"] += time

        # Calculate completion percentage
        if stats["total"] > 0:
            stats["completion_percentage"] = round((stats["completed"] / stats["total"]) * 100, 1)
        else:
            stats["completion_percentage"] = 0

        return stats
    except Exception as e:
        logger.error(f"Error in resource statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get resource statistics: {str(e)}"
        )

@router.get("/{resource_type}", response_model=List[Resource])
async def get_resources_by_type(
    resource_type: str,
    completed: Optional[bool] = None,
    topic: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get resources of a specific type with optional filtering."""
    try:
        if resource_type not in ["articles", "videos", "courses", "books"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid resource type: {resource_type}"
            )

        # Try to handle both cases where current_user is a User object or a dictionary
        username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

        if not username:
            logger.error("Username not found in current_user object")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User information is incomplete"
            )

        user = await db.users.find_one({"username": username})
        if not user or "resources" not in user or resource_type not in user["resources"]:
            return []

        resources = user["resources"][resource_type]

        # Filter by completion status if specified
        if completed is not None:
            resources = [r for r in resources if r.get("completed", False) == completed]

        # Filter by topic if specified
        if topic:
            resources = [
                r for r in resources
                if any(t.lower() == topic.lower() for t in r.get("topics", []))
            ]

        return resources
    except Exception as e:
        logger.error(f"Error in get_resources_by_type: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve resources by type: {str(e)}"
        )

@router.post("/{resource_type}", response_model=Resource, status_code=status.HTTP_201_CREATED)
async def create_resource(
    resource_type: str,
    resource: ResourceBase,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new resource."""
    # Validate resource type
    try:
        validate_resource_type(resource_type)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Validate URL
    try:
        validate_url(resource.url)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Create resource object
    try:
        # Try to handle both cases where current_user is a User object or a dictionary
        username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

        if not username:
            logger.error("Username not found in current_user object")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User information is incomplete"
            )

        resource_dict = resource.model_dump()
        resource_dict["id"] = await get_next_resource_id(db, username, resource_type)
        resource_dict["date_added"] = datetime.now().isoformat()
        resource_dict["completed"] = False
        resource_dict["completion_date"] = None
        resource_dict["notes"] = resource_dict.get("notes", "")

        # Get user document
        user = await db.users.find_one({"username": username})

        # Initialize resources structure if it doesn't exist
        if not user or "resources" not in user:
            await db.users.update_one(
                {"username": username},
                {"$set": {"resources": {
                    "articles": [],
                    "videos": [],
                    "courses": [],
                    "books": []
                }}},
                upsert=True
            )

        # Add to user's resources
        result = await db.users.update_one(
            {"username": username},
            {"$push": {f"resources.{resource_type}": resource_dict}}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create resource"
            )

        return resource_dict

    except Exception as e:
        logger.error(f"Error creating resource: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create resource: {str(e)}"
        )

@router.put("/{resource_type}/{resource_id}", response_model=Resource)
async def update_resource(
    resource_type: str,
    resource_id: int,
    resource_update: ResourceUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update an existing resource."""
    if resource_type not in ["articles", "videos", "courses", "books"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resource type: {resource_type}"
        )

    # Get user's resources
    user = await db.users.find_one({"username": current_user.username})
    if not user or "resources" not in user or resource_type not in user["resources"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resources not found"
        )

    # Find the resource to update
    resources = user["resources"][resource_type]
    resource_index = None
    for i, r in enumerate(resources):
        if r.get("id") == resource_id:
            resource_index = i
            break

    if resource_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} not found"
        )

    # Update resource fields
    update_data = {k: v for k, v in resource_update.model_dump().items() if v is not None}
    for key, value in update_data.items():
        resources[resource_index][key] = value

    # Save updated resources
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$set": {f"resources.{resource_type}": resources}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update resource"
        )

    return resources[resource_index]

@router.post("/{resource_type}/{resource_id}/complete", response_model=Resource)
async def mark_resource_completed(
    resource_type: str,
    resource_id: int,
    completion_data: ResourceComplete,
    current_user: User = Depends(get_current_active_user)
):
    """Mark a resource as completed or uncompleted."""
    if resource_type not in ["articles", "videos", "courses", "books"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resource type: {resource_type}"
        )

    # Get user's resources
    user = await db.users.find_one({"username": current_user.username})
    if not user or "resources" not in user or resource_type not in user["resources"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resources not found"
        )

    # Find the resource to mark as completed
    resources = user["resources"][resource_type]
    resource_index = None
    for i, r in enumerate(resources):
        if r.get("id") == resource_id:
            resource_index = i
            break

    if resource_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} not found"
        )

    # Toggle completion status
    current_status = resources[resource_index].get("completed", False)
    resources[resource_index]["completed"] = not current_status

    if not current_status:
        # If marking as completed
        resources[resource_index]["completion_date"] = datetime.now().isoformat()
        if completion_data.notes:
            resources[resource_index]["notes"] = completion_data.notes
    else:
        # If marking as uncompleted
        resources[resource_index]["completion_date"] = None

    # Save updated resources
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$set": {f"resources.{resource_type}": resources}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update resource completion status"
        )

    return resources[resource_index]

@router.delete("/{resource_type}/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_type: str,
    resource_id: int,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a resource."""
    # Validate resource type
    if resource_type not in ["articles", "videos", "courses", "books"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resource type: {resource_type}"
        )

    # Get user document
    user = await db.users.find_one({"username": current_user.username})
    if not user or "resources" not in user or resource_type not in user["resources"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {resource_type} found for user"
        )

    # Find the resource
    resources = user["resources"][resource_type]
    resource_index = None
    for i, resource in enumerate(resources):
        if "id" in resource and resource["id"] == resource_id:
            resource_index = i
            break

    if resource_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} not found"
        )

    # Remove the resource
    resources.pop(resource_index)

    # Update user document
    await db.users.update_one(
        {"username": current_user.username},
        {"$set": {f"resources.{resource_type}": resources}}
    )

@router.get("/{resource_type}/{resource_id}", response_model=Resource)
async def get_resource_by_id(
    resource_type: str,
    resource_id: int,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific resource by ID."""
    # Validate resource type
    if resource_type not in ["articles", "videos", "courses", "books"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resource type: {resource_type}"
        )

    # Get user document
    user = await db.users.find_one({"username": current_user.username})
    if not user or "resources" not in user or resource_type not in user["resources"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {resource_type} found for user"
        )

    # Find the resource
    for resource in user["resources"][resource_type]:
        if "id" in resource and resource["id"] == resource_id:
            return resource

    # Resource not found
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Resource with ID {resource_id} not found"
    )

@router.get("/next", response_model=List[Resource])
async def get_next_resources(
    count: int = 5,
    current_user: User = Depends(get_current_active_user)
):
    """Get the next N uncompleted resources."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "resources" not in user:
        return []

    # Collect all uncompleted resources
    uncompleted = []
    for resource_type in ["articles", "videos", "courses", "books"]:
        if resource_type in user["resources"]:
            for resource in user["resources"][resource_type]:
                if not resource.get("completed", False):
                    resource_copy = resource.copy()
                    resource_copy["type"] = resource_type  # Add type for frontend display
                    uncompleted.append(resource_copy)

    # Sort by date added (newest first)
    uncompleted.sort(key=lambda x: x.get("date_added", ""), reverse=True)

    # Return up to 'count' resources
    return uncompleted[:count]

@router.post("/batch-resources", response_model=List[Dict[str, Any]], status_code=status.HTTP_200_OK)
async def create_batch_resources(
    batch_data: ResourceBatchRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Create multiple resources at once using a new endpoint."""
    try:
        # Ensure current_user is a dict and get username
        if not isinstance(current_user, dict):
            current_user_dict = current_user.dict() if hasattr(current_user, "dict") else current_user
            username = current_user_dict.get("username")
        else:
            username = current_user.get("username")

        if not username:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User information is incomplete"
            )

        # Get user from database
        user = await db.users.find_one({"username": username})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Initialize resources structure if it doesn't exist
        if "resources" not in user:
            user["resources"] = {
                "articles": [],
                "videos": [],
                "courses": [],
                "books": []
            }

        created_resources = []

        for resource_data in batch_data.resources:
            resource_type = resource_data.get("resource_type")

            # Validate resource type
            if not resource_type or resource_type not in ["articles", "videos", "courses", "books"]:
                continue

            # Get next ID
            next_id = await get_next_resource_id(db, username, resource_type)

            # Create resource object with all required fields
            new_resource = {
                "id": next_id,
                "title": resource_data.get("title"),
                "url": resource_data.get("url"),
                "topics": resource_data.get("topics", []),
                "difficulty": resource_data.get("difficulty", "beginner"),
                "estimated_time": resource_data.get("estimated_time", 0),
                "notes": resource_data.get("notes", ""),
                "date_added": datetime.now().isoformat(),
                "completed": False,
                "completion_date": None,
                "priority": resource_data.get("priority", "medium"),
                "source": resource_data.get("source", "web")
            }

            # Add resource to appropriate list in user document
            if resource_type not in user["resources"]:
                user["resources"][resource_type] = []

            user["resources"][resource_type].append(new_resource)

            # Add to return list
            created_resource = new_resource.copy()
            created_resource["resource_type"] = resource_type
            created_resources.append(created_resource)

        # Update user document in database
        await db.users.update_one(
            {"username": username},
            {"$set": {"resources": user["resources"]}}
        )

        return created_resources

    except Exception as e:
        logger.error(f"Error in batch resource creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create resources: {str(e)}"
        )