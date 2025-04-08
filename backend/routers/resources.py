"""Resources router."""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Annotated
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
import logging
import httpx # Use httpx for async requests
from bs4 import BeautifulSoup
import math # Add math import for ceiling division
from motor.motor_asyncio import AsyncIOMotorDatabase # Add this import

# Load environment variables
load_dotenv()

# Import database connection from shared module
from database import get_db # Import get_db dependency function

# Import utility functions
from utils.db_utils import get_document_by_id, update_document, delete_document
from utils.validators import validate_resource_type, validate_url, validate_rating
from utils.error_handlers import ValidationError

# --- Import Central Library Data ---
from resources.ai_ml_resources import get_formatted_resources

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Import authentication functions from auth
from auth import get_current_active_user, User

# --- Central Library Data Loading ---
# Load the central library data once when the module is loaded
try:
    CENTRAL_LIBRARY_DATA = get_formatted_resources()
    # Flatten the data for easier lookup and merging
    ALL_CENTRAL_RESOURCES_LIST = []
    for category, resources in CENTRAL_LIBRARY_DATA.items():
        for resource in resources:
            resource_copy = resource.copy()
            resource_copy['type'] = category # Add type for filtering
            ALL_CENTRAL_RESOURCES_LIST.append(resource_copy)
    # Create a dictionary for fast lookup by ID
    CENTRAL_RESOURCES_DICT = {res['id']: res for res in ALL_CENTRAL_RESOURCES_LIST}
    logger.info(f"Successfully loaded {len(ALL_CENTRAL_RESOURCES_LIST)} resources into the central library.")
except Exception as e:
    logger.error(f"Failed to load central library data: {e}")
    CENTRAL_LIBRARY_DATA = {}
    ALL_CENTRAL_RESOURCES_LIST = []
    CENTRAL_RESOURCES_DICT = {}

# Define valid difficulty levels and resource types
DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert']
RESOURCE_TYPES = ['article', 'video', 'course', 'book', 'documentation', 'tool', 'other']

# Models
class ResourceBase(BaseModel):
    title: str
    url: str
    topics: List[str]
    difficulty: str
    estimated_time: int

class ResourceCreate(ResourceBase):
    resource_type: str # Should map to keys in CENTRAL_LIBRARY_DATA ('courses', 'books', etc.)
    notes: Optional[str] = ""
    priority: Optional[str] = "medium"
    source: Optional[str] = "web"

class LibraryResource(ResourceBase):
    id: str # Use string ID from central library
    type: str # courses, books, articles, videos, platforms_guides
    completed: bool = False
    date_added: str
    completion_date: Optional[str] = None
    notes: str = ""

class UserResource(ResourceBase):
    id: int # User-specific integer ID
    type: str # articles, videos, courses, books (maps to user doc structure)
    completed: bool = False
    date_added: str
    completion_date: Optional[str] = None
    notes: str = ""
    # Fields specific to user-added resources if any (e.g., priority, source)
    priority: Optional[str] = "medium"
    source: Optional[str] = "web"

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

# Define request and response models for metadata extraction
class MetadataRequest(BaseModel):
    url: str

class MetadataResponse(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    # Add other fields as needed, e.g., image, type guess

# Model for updating library status
class LibraryStatusUpdate(BaseModel):
    completed: bool
    notes: Optional[str] = None

# We need to add this model to the top of the file with other models
class ResourceBatchCreateTest(BaseModel):
    resources: List[BatchResourceItem]

# Helper functions
async def get_next_resource_id(db: AsyncIOMotorDatabase, username: str, resource_type: str):
    """Get the next available integer ID for a user-added resource."""
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
        # Check path: user['resources'][resource_type]
        resources = []
        if user and 'resources' in user and isinstance(user['resources'], dict) and resource_type in user['resources']:
           resources = user['resources'][resource_type]

        if not resources:
            return 1

        # Find the highest ID
        max_id = 0
        for resource in resources:
            # Ensure the resource is a dict and has an 'id' key
            if isinstance(resource, dict) and "id" in resource and isinstance(resource["id"], int) and resource["id"] > max_id:
                max_id = resource["id"]

        return max_id + 1
    except Exception as e:
        logger.error(f"Error in get_next_resource_id for user {username}, type {resource_type}: {str(e)}")
        # Return 1 as default if any error occurs
        return 1

# Helper function to get username from current_user (which might be dict or User object)
def get_username(current_user):
    """
    Extract username from current_user which could be either a User object or a dict.
    """
    if hasattr(current_user, "username"):
        return current_user.username
    elif isinstance(current_user, dict) and "username" in current_user:
        return current_user.get("username")
    else:
        logger.warning(f"Could not extract username from current_user of type {type(current_user)}")
        # Depending on auth setup, might need to raise an error or return None
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user.")


# Routes

# --- Central Library Endpoints ---

@router.get("/library", response_model=List[LibraryResource])
async def get_central_library_resources(
    # Non-default parameters first
    response: Response, # Inject Response object
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)], # Add db dependency
    current_user: dict = Depends(get_current_active_user),
    # Default parameters after
    topic: List[str] = Query(None), # Changed from Optional[str]
    type: List[str] = Query(None), # Changed from Optional[str]
    difficulty: List[str] = Query(None), # Changed from Optional[str]
    search: Optional[str] = Query(None), # Allow searching
    page: int = Query(1, ge=1, description="Page number starting from 1"),
    limit: int = Query(10, ge=1, le=100, description="Number of items per page")
):
    """
    Get resources from the central library, merging user completion status.
    Supports filtering by topic, type, difficulty, search, and pagination.
    """
    username = get_username(current_user)
    # Make a copy to avoid modifying the original list in memory
    filtered_resources = list(ALL_CENTRAL_RESOURCES_LIST)
    logger.info(f"Initial library resource count: {len(filtered_resources)}") # Log initial count

    # Apply filters first
    if topic:
        # topic is now a list of strings
        logger.info(f"Filtering library by topics: {topic}")
        topics_lower = [t.lower() for t in topic]
        filtered_resources = [
            r for r in filtered_resources
            if any(res_topic.lower() in topics_lower for res_topic in r.get("topics", []))
        ]
        logger.info(f"Resources after topic filter: {len(filtered_resources)}")
    if type:
        # type is now a list of strings
        logger.info(f"Filtering library by types: {type}")
        types_lower = [t.lower() for t in type]
        filtered_resources = [r for r in filtered_resources if r.get("type", "").lower() in types_lower]
        logger.info(f"Resources after type filter: {len(filtered_resources)}")
    if difficulty:
        # difficulty is now a list of strings
        logger.info(f"Filtering library by difficulties: {difficulty}")
        difficulties_lower = [d.lower() for d in difficulty]
        filtered_resources = [r for r in filtered_resources if r.get("difficulty", "").lower() in difficulties_lower]
        logger.info(f"Resources after difficulty filter: {len(filtered_resources)}")
    if search:
        logger.info(f"Filtering library by search: '{search}'")
        search_lower = search.lower()
        filtered_resources = [
            r for r in filtered_resources
            if search_lower in r.get("title", "").lower() or \
               search_lower in r.get("notes", "").lower() or \
               any(search_lower in t.lower() for t in r.get("topics", []))
        ]
        logger.info(f"Resources after search filter: {len(filtered_resources)}")

    # Calculate pagination details AFTER filtering
    total_items = len(filtered_resources)
    total_pages = math.ceil(total_items / limit) if limit > 0 else 0

    # Set response headers
    response.headers["X-Total-Pages"] = str(total_pages)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Pages"

    # Apply pagination slicing
    start_index = (page - 1) * limit
    end_index = start_index + limit
    paginated_metadata = filtered_resources[start_index:end_index]

    # Fetch user's completion status ONLY for the paginated resources
    user_statuses = {}
    resource_ids_to_fetch = [r['id'] for r in paginated_metadata]
    if resource_ids_to_fetch:
        status_cursor = db.user_library_status.find({
            "username": username,
            "resource_id": {"$in": resource_ids_to_fetch}
        })
        async for status_doc in status_cursor:
            user_statuses[status_doc["resource_id"]] = status_doc

    # Merge status into the paginated results
    results_with_status = []
    for resource in paginated_metadata:
        resource_copy = resource.copy()
        status_info = user_statuses.get(resource_copy['id'])
        if status_info:
            resource_copy['completed'] = status_info.get('completed', False)
            resource_copy['completion_date'] = status_info.get('completion_date')
            resource_copy['notes'] = status_info.get('notes', resource_copy.get('notes', '')) # Prioritize user notes
        else:
            # Default status if no user record exists
            resource_copy['completed'] = False
            resource_copy['completion_date'] = None
            # Keep original notes if no user notes
            resource_copy['notes'] = resource_copy.get('notes', '')

        # Ensure all fields match LibraryResource model
        # 'id' is already string from CENTRAL_RESOURCES_DICT key
        # 'type' was added during initial load
        resource_copy.pop('_id', None) # Remove potential mongo id if it crept in

        # Validate against the model before appending (optional but good practice)
        try:
            validated_resource = LibraryResource(**resource_copy)
            results_with_status.append(validated_resource)
        except Exception as model_exc: # Catch Pydantic validation error specifically if needed
             logger.warning(f"Skipping resource due to validation error: {resource_copy.get('id')}, Error: {model_exc}")

    return results_with_status

@router.get("/topics", response_model=List[str])
async def get_central_library_topics():
    """
    Get a list of unique topics available in the central resource library.
    """
    if not ALL_CENTRAL_RESOURCES_LIST:
        logger.warning("Central library data not loaded, cannot fetch topics.")
        return []

    all_topics = set()
    for resource in ALL_CENTRAL_RESOURCES_LIST:
        if isinstance(resource.get("topics"), list):
            for topic in resource["topics"]:
                if isinstance(topic, str):
                     all_topics.add(topic.lower()) # Use lower case for consistency

    return sorted(list(all_topics))

@router.patch("/library/{resource_id}/status", response_model=LibraryResource)
async def update_central_library_resource_status(
    resource_id: str, # Central library uses string IDs
    status_update: LibraryStatusUpdate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)], # Add db dependency
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update the completion status and notes for a specific central library resource
    for the current user. Creates or updates a record in user_library_status.
    """
    username = get_username(current_user)

    # Find the metadata from the central dictionary
    resource_metadata = CENTRAL_RESOURCES_DICT.get(resource_id)
    if not resource_metadata:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found in central library")

    # Prepare the update document for the user_library_status collection
    update_doc = {
        "completed": status_update.completed,
        "notes": status_update.notes if status_update.notes is not None else "",
        "last_updated": datetime.now(timezone.utc) # Use timezone-aware datetime
    }
    if status_update.completed:
        update_doc["completion_date"] = datetime.now(timezone.utc) # Set completion date only when marking complete
    else:
        # Ensure completion_date is unset if marking as not completed
        update_doc["completion_date"] = None

    try:
        # Upsert the status document
        result = await db.user_library_status.update_one( # Use injected db
            {"username": username, "resource_id": resource_id},
            {
                "$set": update_doc,
                "$setOnInsert": {"username": username, "resource_id": resource_id}
            },
            upsert=True
        )

        # Fetch the potentially updated status details
        updated_status = await db.user_library_status.find_one( # Use injected db
            {"username": username, "resource_id": resource_id}
        )

        # Construct the response by merging metadata and status
        response_data = resource_metadata.copy()
        if updated_status:
            response_data["completed"] = updated_status.get("completed", False)
            response_data["notes"] = updated_status.get("notes", "")
            # Ensure completion_date is handled correctly (present if completed, None otherwise)
            response_data["completion_date"] = updated_status.get("completion_date").isoformat() if updated_status.get("completed") and updated_status.get("completion_date") else None
        else:
            # Should not happen with upsert, but handle defensively
            response_data["completed"] = False
            response_data["notes"] = ""
            response_data["completion_date"] = None

        return LibraryResource(**response_data)

    except Exception as e:
        logger.error(f"Error updating central library resource status for user {username}, resource {resource_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update central library resource status"
        )

# --- User-Added Resource Endpoints (Existing, may need clarification comments) ---

# Statistics endpoint - Needs to be defined BEFORE /{resource_type}
@router.get("/statistics", response_model=Dict[str, Any])
async def get_resource_statistics(
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)] # Inject db
):
    """Get statistics about the user-added resources."""
    username = get_username(current_user)
    user = await db.users.find_one({"username": username})

    # Default statistics structure
    default_stats = {
        "total_resources": 0,
        "completed_resources": 0,
        "completion_rate": 0,
        "resources_by_type": {
            "articles": {"total": 0, "completed": 0},
            "videos": {"total": 0, "completed": 0},
            "courses": {"total": 0, "completed": 0},
            "books": {"total": 0, "completed": 0}
        },
        "resources_by_topic": {},
        "resources_by_difficulty": {
            "beginner": 0,
            "intermediate": 0,
            "advanced": 0
        },
        "average_completion_time": 0 # Average estimated_time of completed resources
    }

    if not user or "resources" not in user or not isinstance(user.get("resources"), dict):
        return default_stats

    user_resources = user["resources"]
    stats = default_stats.copy() # Start with defaults
    stats["resources_by_type"] = default_stats["resources_by_type"].copy() # Deep copy nested dicts
    stats["resources_by_topic"] = {}
    stats["resources_by_difficulty"] = default_stats["resources_by_difficulty"].copy()

    total_completion_time = 0
    total_completed_count = 0

    for resource_type, resource_list in user_resources.items():
        # Only process known user-addable types and lists
        if resource_type not in stats["resources_by_type"] or not isinstance(resource_list, list):
            continue

        type_total = 0
        type_completed = 0
        for resource in resource_list:
            if not isinstance(resource, dict): continue # Skip invalid entries

            type_total += 1
            is_completed = resource.get("completed", False)
            if is_completed:
                type_completed += 1
                estimated_time = resource.get("estimated_time", 0)
                if isinstance(estimated_time, (int, float)) and estimated_time > 0:
                     total_completion_time += estimated_time
                     total_completed_count += 1

            # Count difficulty
            difficulty = resource.get("difficulty", "").lower()
            if difficulty in stats["resources_by_difficulty"]:
                stats["resources_by_difficulty"][difficulty] += 1

            # Count topics
            topics = resource.get("topics", [])
            if isinstance(topics, list):
                for topic in topics:
                     if isinstance(topic, str):
                        topic_lower = topic.lower()
                        stats["resources_by_topic"][topic_lower] = stats["resources_by_topic"].get(topic_lower, 0) + 1

        # Update totals for the type
        stats["resources_by_type"][resource_type]["total"] = type_total
        stats["resources_by_type"][resource_type]["completed"] = type_completed
        stats["total_resources"] += type_total
        stats["completed_resources"] += type_completed

    # Calculate overall completion rate
    if stats["total_resources"] > 0:
        stats["completion_rate"] = stats["completed_resources"] / stats["total_resources"]

    # Calculate average completion time
    if total_completed_count > 0:
        stats["average_completion_time"] = total_completion_time / total_completed_count

    return stats

@router.get("/user", response_model=List[UserResource])
async def get_all_user_added_resources(
    # Non-default parameters first
    response: Response, # Inject Response object
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)], # Add db dependency
    current_user: dict = Depends(get_current_active_user),
    # Default parameters after
    topic: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    completed: Optional[bool] = Query(None),
    page: int = Query(1, ge=1, description="Page number starting from 1"),
    limit: int = Query(10, ge=1, le=100, description="Number of items per page")
):
    """
    Get all resources *added by* the current user, supporting filtering and pagination.
    """
    username = get_username(current_user)
    user = await db.users.find_one({"username": username})

    if not user or 'resources' not in user:
        response.headers["X-Total-Pages"] = "0"
        response.headers["Access-Control-Expose-Headers"] = "X-Total-Pages"
        return []

    all_user_resources = []
    # Consolidate all resource types into one list for easier filtering/pagination
    for res_type, resources in user.get('resources', {}).items():
        if isinstance(resources, list):
            for res in resources:
                if isinstance(res, dict):
                    res_copy = res.copy()
                    res_copy['type'] = res_type # Ensure type field is present
                    # Convert date string to datetime for comparison if needed, or ensure consistency
                    # For now, assume date_added is a comparable string or handle conversion
                    all_user_resources.append(res_copy)

    # Apply filtering
    filtered_user_resources = all_user_resources
    if topic:
        filtered_user_resources = [
            r for r in filtered_user_resources
            if any(t.lower() == topic.lower() for t in r.get("topics", []))
        ]
    if type:
        filtered_user_resources = [r for r in filtered_user_resources if r.get("type", "").lower() == type.lower()]
    if difficulty:
        filtered_user_resources = [r for r in filtered_user_resources if r.get("difficulty", "").lower() == difficulty.lower()]
    if completed is not None:
        filtered_user_resources = [r for r in filtered_user_resources if r.get("completed") == completed]

    # Calculate pagination details AFTER filtering
    total_items = len(filtered_user_resources)
    total_pages = math.ceil(total_items / limit) if limit > 0 else 0

    # Set response headers
    response.headers["X-Total-Pages"] = str(total_pages)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Pages"

    # Apply pagination slicing
    start_index = (page - 1) * limit
    end_index = start_index + limit
    paginated_resources = filtered_user_resources[start_index:end_index]

    # Ensure results match the UserResource model
    validated_results = []
    for resource in paginated_resources:
        # Add default values for missing optional fields if necessary
        resource.setdefault('notes', '')
        resource.setdefault('priority', 'medium')
        resource.setdefault('source', 'web')
        resource.setdefault('completion_date', None)
        try:
            validated_results.append(UserResource(**resource))
        except Exception as e:
            logger.error(f"Error validating user resource {resource.get('id')}: {e}")
            # Optionally skip invalid resources or handle differently

    return validated_results

# Note: This endpoint returns data grouped by type, whereas /user returns a flat list.
@router.get("/", response_model=Dict[str, List[UserResource]])
async def get_all_user_resources_grouped(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_active_user)]
):
    """Get all resources *added by* the current user, grouped by type (plural keys)."""
    username = get_username(current_user)
    try:
        user = await db.users.find_one({"username": username})
        if not user:
            logger.warning(f"User {username} not found for grouped resources.")
            # Return structure with plural keys and empty lists
            return {"articles": [], "videos": [], "courses": [], "books": []}

        user_resources_data = user.get("resources", {})
        # Fetch using singular keys, map to plural keys in response
        grouped_resources = {
            "articles": user_resources_data.get("article", []), # Fetch singular, return plural
            "videos": user_resources_data.get("video", []),   # Fetch singular, return plural
            "courses": user_resources_data.get("course", []),  # Fetch singular, return plural
            "books": user_resources_data.get("book", [])      # Fetch singular, return plural
        }

        # Validate resources within each list against UserResource model
        # and add the correct plural type field for response
        validated_grouped_resources = {}
        for plural_type_key, resources_list in grouped_resources.items():
            validated_list = []
            if isinstance(resources_list, list):
                for resource_dict in resources_list:
                    if isinstance(resource_dict, dict):
                        # Add missing optional fields if needed before validation
                        resource_dict.setdefault('notes', '')
                        resource_dict.setdefault('priority', 'medium')
                        resource_dict.setdefault('source', 'web') # Assuming default is 'web' or 'user'?
                        resource_dict.setdefault('completion_date', None)
                        # Add the PLURAL type key for the response model
                        resource_dict['type'] = plural_type_key
                        try:
                            validated_list.append(UserResource(**resource_dict))
                        except Exception as e:
                            logger.error(f"Validation error for resource in {plural_type_key}: {resource_dict.get('id')} - {e}")
            validated_grouped_resources[plural_type_key] = validated_list

        return validated_grouped_resources
    except Exception as e:
        logger.error(f"Error fetching grouped resources for user {username}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching resources")

# Get resources by type (e.g., /api/resources/articles)
@router.get("/{resource_type}", response_model=List[UserResource])
async def get_user_resources_by_type(
    resource_type: str,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    completed: Optional[bool] = None,
    topic: Optional[str] = None
):
    """Get resources of a specific type *added by* the user with optional filtering."""
    try:
        # Validate the type against user-addable types
        if resource_type not in RESOURCE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid resource type for user-added resources: {resource_type}"
            )

        username = get_username(current_user)

        user = await db.users.find_one({"username": username})
        resources = []
        if user and "resources" in user and isinstance(user['resources'], dict) and resource_type in user["resources"]:
            resources = user["resources"][resource_type]

        # Filter by completion status if specified
        if completed is not None:
            resources = [r for r in resources if isinstance(r, dict) and r.get("completed", False) == completed]

        # Filter by topic if specified
        if topic:
            resources = [
                r for r in resources if isinstance(r, dict)
                and any(t.lower() == topic.lower() for t in r.get("topics", []))
            ]

        # Validate and add type before returning
        validated_resources = []
        for r_data in resources:
             if isinstance(r_data, dict):
                r_data_typed = r_data.copy()
                r_data_typed['type'] = resource_type
                try:
                    validated_resources.append(UserResource(**r_data_typed))
                except Exception as model_exc:
                    logger.warning(f"Skipping user resource during fetch due to validation error: Type={resource_type}, ID={r_data.get('id')}, Error: {model_exc}")

        return validated_resources
    except Exception as e:
        logger.error(f"Error in get_user_resources_by_type: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user resources by type: {str(e)}"
        )

# Add comment: Operates on user-added resources stored in db.users
@router.post("/{resource_type}", response_model=UserResource, status_code=status.HTTP_201_CREATED)
async def create_user_resource(
    resource_type: str,
    resource: ResourceBase, # Base model sufficient for creation input
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)], # Non-default first
    current_user: dict = Depends(get_current_active_user) # Default last
):
    """Create a new resource *added by* the user."""
    # Validate resource type (only user-addable types)
    if resource_type not in RESOURCE_TYPES:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resource type for user-added resources: {resource_type}. Cannot add type 'platforms_guides'."
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
        username = get_username(current_user)

        resource_dict = resource.model_dump()
        resource_dict["id"] = await get_next_resource_id(db, username, resource_type)
        resource_dict["date_added"] = datetime.now().isoformat()
        resource_dict["completed"] = False
        resource_dict["completion_date"] = None
        resource_dict["notes"] = resource_dict.get("notes", "") # Ensure notes field exists
        # Add other user-specific fields if needed (priority, source are not in ResourceBase)
        resource_dict["priority"] = "medium" # Default or get from input if model changes
        resource_dict["source"] = "user" # Indicate it's user-added

        # Get user document using injected db
        user = await db.users.find_one({"username": username})

        # Initialize resources structure if it doesn't exist using injected db
        if not user or "resources" not in user or not isinstance(user.get("resources"), dict):
            await db.users.update_one(
                {"username": username},
                {"$set": {"resources": {
                    "articles": [], "videos": [], "courses": [], "books": []
                }}},
                upsert=True
            )
        elif resource_type not in user.get("resources", {}):
             # Ensure the specific resource type list exists using injected db
             await db.users.update_one(
                {"username": username},
                {"$set": {f"resources.{resource_type}": []}},
                upsert=False # Don't upsert here, user must exist
            )


        # Add to user's resources using injected db
        result = await db.users.update_one(
            {"username": username},
            {"$push": {f"resources.{resource_type}": resource_dict}}
        )

        if result.matched_count == 0: # Check matched_count as we ensure the field exists now
             logger.error(f"Failed to find user {username} to add resource.")
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if result.modified_count == 0:
            logger.error(f"Failed to push resource for user {username}, type {resource_type}. Result: {result.raw_result}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create resource (no modification)"
            )

        # Add type for response model validation
        resource_dict['type'] = resource_type
        return UserResource(**resource_dict) # Validate against UserResource model

    except HTTPException as http_exc:
        raise http_exc # Re-raise known HTTP exceptions
    except Exception as e:
        logger.exception(f"Error creating user resource for {username}, type {resource_type}: {str(e)}") # Use logger.exception for stack trace
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create resource: {str(e)}"
        )

# Add comment: Operates on user-added resources stored in db.users
@router.put("/{resource_type}/{resource_id}", response_model=UserResource)
async def update_user_resource(
    resource_type: str,
    resource_id: int, # User resources use integer IDs
    resource_update: ResourceUpdate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)], # Non-default first
    current_user: dict = Depends(get_current_active_user) # Default last
):
    """Update an existing resource *added by* the user."""
    username = get_username(current_user)

    # Validate type
    if resource_type not in RESOURCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resource type for user-added resource: {resource_type}"
        )

    # Get user's resources using injected db
    user = await db.users.find_one({"username": username})
    if not user or resource_type not in user.get("resources", {}):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource type not found for user")

    # Validate URL if provided in the update
    if resource_update.url:
        try:
            validate_url(resource_update.url)
        except ValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    # Construct update payload dynamically
    update_fields = resource_update.model_dump(exclude_unset=True)
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update."
        )

    # Add updated_at timestamp
    # update_fields["updated_at"] = datetime.now().isoformat() # Consider if this should be set automatically

    # Prepare $set payload targeting the specific element in the array
    set_payload = {
        f"resources.{resource_type}.$.{field}": value
        for field, value in update_fields.items()
    }

    # Perform the update using injected db
    update_result = await db.users.update_one(
        {"username": username, f"resources.{resource_type}.id": resource_id},
        {"$set": set_payload}
    )

    if update_result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User-added resource with ID {resource_id} not found in type {resource_type}"
        )

    # Fetch the updated resource data after update
    updated_user = await db.users.find_one({"username": username})
    updated_resource_data = None
    if updated_user and resource_type in updated_user.get("resources", {}):
        for r in updated_user["resources"][resource_type]:
            if isinstance(r, dict) and r.get("id") == resource_id:
                updated_resource_data = r
                break

    if not updated_resource_data:
        # Should theoretically not happen if update matched, but good practice to check
        logger.error(f"Resource {resource_id} of type {resource_type} not found after supposedly successful update for user {username}.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve updated resource")

    # Add type for model validation
    updated_resource_data['type'] = resource_type
    return UserResource(**updated_resource_data)

# Add comment: Operates on user-added resources stored in db.users
@router.patch("/{resource_type}/{resource_id}/complete", response_model=UserResource)
async def mark_user_resource_completed(
    resource_type: str,
    resource_id: int, # User resources use integer IDs
    completion_data: ResourceComplete,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)], # Non-default first
    current_user: dict = Depends(get_current_active_user) # Default last
):
    """
    Mark a user-added resource as completed or not completed, and update notes.
    """
    username = get_username(current_user)

    # Validate type
    if resource_type not in RESOURCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resource type for user-added resource: {resource_type}"
        )

    # Get user's resources using injected db
    user = await db.users.find_one({"username": username})
    if not user or resource_type not in user.get("resources", {}):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource type not found for user")

    # Find the resource to check current status
    current_resource = None
    for r in user["resources"][resource_type]:
        if isinstance(r, dict) and r.get("id") == resource_id:
            current_resource = r
            break

    if not current_resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User-added resource with ID {resource_id} not found in type {resource_type}"
        )

    # Determine new completion status and date
    # new_completed_status = not current_resource.get("completed", False)
    new_completed_status = True # Endpoint now always sets to completed=True
    new_completion_date = datetime.now().isoformat() if new_completed_status else None
    new_notes = completion_data.notes if completion_data.notes is not None else current_resource.get("notes", "")

    # Prepare $set payload
    set_payload = {
        f"resources.{resource_type}.$.completed": new_completed_status,
        f"resources.{resource_type}.$.completion_date": new_completion_date,
        f"resources.{resource_type}.$.notes": new_notes
    }

    # Perform the update using injected db
    update_result = await db.users.update_one(
        {"username": username, f"resources.{resource_type}.id": resource_id},
        {"$set": set_payload}
    )

    if update_result.matched_count == 0:
        # This case should ideally be caught by the find_one check above, but double-check
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User-added resource with ID {resource_id} not found in type {resource_type} (during update)"
        )

    # Fetch the updated resource data after update
    updated_user = await db.users.find_one({"username": username})
    updated_resource_data = None
    if updated_user and resource_type in updated_user.get("resources", {}):
        for r in updated_user["resources"][resource_type]:
            if isinstance(r, dict) and r.get("id") == resource_id:
                updated_resource_data = r
                break

    if not updated_resource_data:
        logger.error(f"Resource {resource_id} of type {resource_type} not found after marking complete for user {username}.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve updated resource")

    # Add type for model validation
    updated_resource_data['type'] = resource_type
    return UserResource(**updated_resource_data)

# Add comment: Operates on user-added resources stored in db.users
@router.delete("/{resource_type}/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_resource(
    resource_type: str,
    resource_id: int, # User resources use integer IDs
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)], # Non-default first
    current_user: dict = Depends(get_current_active_user) # Default last
):
    """Delete a specific resource *added by* the user."""
    username = get_username(current_user)

    # Validate type
    if resource_type not in RESOURCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resource type for user-added resource: {resource_type}"
        )

    # Use $pull to remove the resource from the array using injected db
    update_result = await db.users.update_one(
        {"username": username},
        {"$pull": {f"resources.{resource_type}": {"id": resource_id}}}
    )

    if update_result.modified_count == 0:
        # If modified_count is 0, it means the resource wasn't found (or user didn't exist)
        # We could check matched_count first, but modified_count=0 implies not found/deleted
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User-added resource with ID {resource_id} not found in type {resource_type}"
        )

    # No content to return
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# Add comment: Operates on user-added resources stored in db.users
@router.get("/{resource_type}/{resource_id}", response_model=UserResource)
async def get_user_resource_by_id(
    resource_type: str,
    resource_id: int, # User resources use integer IDs
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)], # Non-default first
    current_user: dict = Depends(get_current_active_user) # Default last
):
    """Get a specific resource *added by* the user by its type and ID."""
    username = get_username(current_user)

    # Validate type
    if resource_type not in RESOURCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resource type for user-added resource: {resource_type}"
        )

    # Get user document using injected db
    user = await db.users.find_one({"username": username})
    if not user or resource_type not in user.get("resources", {}):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource or resource type not found for user")

    # Find the specific resource by ID
    found_resource = None
    for r in user["resources"][resource_type]:
        if isinstance(r, dict) and r.get("id") == resource_id:
            found_resource = r
            break

    if not found_resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User-added resource with ID {resource_id} not found in type {resource_type}"
        )

    # Add type for model validation
    found_resource['type'] = resource_type
    return UserResource(**found_resource)

# Add comment: Operates on user-added resources stored in db.users
@router.get("/next", response_model=List[UserResource])
async def get_next_user_resources(
    # Non-default args first
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    # Default args after
    count: int = 5,
    current_user: dict = Depends(get_current_active_user)
):
    """Get the next 'count' uncompleted resources added by the user, ordered by date added."""
    username = get_username(current_user)

    # Get user document using injected db
    user = await db.users.find_one({"username": username})
    if not user or "resources" not in user:
        return []

    uncompleted_resources = []
    user_resources = user.get("resources", {})

    # Aggregate uncompleted resources across all types
    for res_type, resource_list in user_resources.items():
        if isinstance(resource_list, list):
            for resource in resource_list:
                if isinstance(resource, dict) and not resource.get("completed"):
                    # Add type for model validation
                    resource_copy = resource.copy()
                    resource_copy['type'] = res_type
                    try:
                        # Validate before adding
                        uncompleted_resources.append(UserResource(**resource_copy))
                    except Exception as model_exc:
                        logger.warning(f"Skipping user resource during next fetch due to validation error: Type={res_type}, ID={resource.get('id')}, Error: {model_exc}")


    # Sort by date added (ascending)
    uncompleted_resources.sort(key=lambda r: r.date_added)

    # Return the next 'count' resources
    return uncompleted_resources[:count]

# Add comment: Operates on user-added resources stored in db.users
@router.post("/batch", response_model=List[UserResource], status_code=status.HTTP_201_CREATED)
async def create_batch_user_resources_api(
    # Non-default args first
    batch_data: ResourceBatchRequest,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    # Default args after
    current_user: dict = Depends(get_current_active_user)
):
    """Create multiple resources *added by* the user in a single batch request."""
    username = get_username(current_user)
    created_resources = []
    errors = []

    # Get user document initially using injected db
    user = await db.users.find_one({"username": username})

    # Initialize resources structure if it doesn't exist using injected db
    if not user or "resources" not in user or not isinstance(user.get("resources"), dict):
        await db.users.update_one(
            {"username": username},
            {"$set": {"resources": {"articles": [], "videos": [], "courses": [], "books": []}}},
            upsert=True
        )
        # Fetch the user again after potential upsert
        user = await db.users.find_one({"username": username})

    # Ensure user exists after potential upsert
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Pre-calculate next IDs if possible, or handle within loop carefully
    # For simplicity, getting next ID inside loop (less efficient but safer for concurrency without transactions)

    for index, resource_dict_raw in enumerate(batch_data.resources):
        # Extract resource type first for validation
        resource_type = resource_dict_raw.get("resource_type")

        # 1. Validate resource type
        if not resource_type or resource_type not in RESOURCE_TYPES:
            errors.append({"index": index, "error": f"Invalid or missing resource_type: {resource_type}"}) # Use index
            continue # Skip this resource

        # 2. Validate payload against ResourceBase (or a specific BatchItem model)
        try:
            # Use ResourceBase for initial validation of core fields
            resource_base = ResourceBase(**resource_dict_raw)
        except Exception as pydantic_error:
            errors.append({"index": index, "error": f"Validation Error: {str(pydantic_error)}"}) # Use index
            continue # Skip this resource

        # 3. Validate URL
        try:
            validate_url(resource_base.url)
        except ValidationError as url_error:
            errors.append({"index": index, "error": f"URL Validation Error: {str(url_error)}"}) # Use index
            continue # Skip this resource

        # If validation passes, create the full resource document
        try:
            resource_dict = resource_base.model_dump()
            # Use the injected db for get_next_resource_id
            # Note: This might still have race conditions without transactions. Fetch user state inside get_next_resource_id.
            resource_dict["id"] = await get_next_resource_id(db, username, resource_type)
            resource_dict["date_added"] = datetime.now().isoformat()
            resource_dict["completed"] = False
            resource_dict["completion_date"] = None
            resource_dict["notes"] = resource_dict_raw.get("notes", "")
            resource_dict["priority"] = resource_dict_raw.get("priority", "medium")
            resource_dict["source"] = resource_dict_raw.get("source", "user")

            # Add to user's resources array using injected db
            update_result = await db.users.update_one(
                {"username": username},
                {"$push": {f"resources.{resource_type}": resource_dict}}
            )

            if update_result.modified_count == 0:
                # This indicates a problem, potentially the user doc structure issue or concurrency
                logger.error(f"Batch Create: Failed to push resource at index {index} for user {username}. Update Result: {update_result.raw_result}")
                errors.append({"index": index, "error": "Failed to add resource to database (no modification)"}) # Use index
                continue # Skip this one

            # Add type for response model and add to successful list
            resource_dict['type'] = resource_type
            created_resources.append(UserResource(**resource_dict))

        except Exception as create_exc:
            logger.exception(f"Batch Create: Error processing resource at index {index} for user {username}: {str(create_exc)}") # Use index
            errors.append({"index": index, "error": f"Internal server error during creation: {str(create_exc)}"}) # Use index

    # After processing all items, check for errors
    if errors:
        # Decide on response: partial success (207 Multi-Status) or fail all (400/500)?
        # For now, returning successful ones and error details for failed ones in a custom structure might be best.
        # FastAPI doesn't have a built-in 207, so we might use 200 OK with a complex body
        # Or raise 400 if *any* error occurred, detailing the errors.
        # Choosing 400 for simplicity here if any errors occur.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Batch creation failed for some resources.", "errors": errors, "created": created_resources}
        )

    # If no errors, return the list of created resources with 201
    return created_resources

# --- Metadata Extraction Endpoint ---
@router.post("/metadata", response_model=MetadataResponse)
async def extract_url_metadata(request: MetadataRequest, current_user: dict = Depends(get_current_active_user)):
    """
    Extract metadata (title, description) from a given URL.
    """
    logger.info(f"Metadata extraction requested for URL: {request.url} by user {get_username(current_user)}")
    try:
        # Validate URL format (basic check)
        if not request.url.startswith(("http://", "https://")):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid URL format.")

        # Fetch URL content asynchronously
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            try:
                # Add headers to mimic a browser, some sites block default httpx/python user agents
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                response = await client.get(request.url, headers=headers)
                response.raise_for_status() # Raise exception for bad status codes (4xx, 5xx)
            except httpx.RequestError as exc:
                logger.error(f"HTTP request failed for {request.url}: {exc}")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not fetch URL: {exc}")
            except httpx.HTTPStatusError as exc:
                 logger.error(f"HTTP status error for {request.url}: {exc.response.status_code} {exc.response.reason_phrase}")
                 # Provide more context from the response if possible
                 err_detail = f"URL returned status {exc.response.status_code}"
                 try:
                     # Attempt to include response body if it's text and not too large
                     if "text/" in exc.response.headers.get("content-type", "") and len(exc.response.content) < 1024:
                         err_detail += f": {exc.response.text[:200]}" # Limit error detail length
                 except Exception:
                     pass # Ignore errors decoding response body for error message
                 raise HTTPException(status_code=exc.response.status_code, detail=err_detail)


        # Decode content safely, falling back if needed
        try:
            html_content = response.content.decode(response.encoding or 'utf-8', errors='replace')
        except Exception as decode_err:
            logger.error(f"Failed to decode content for {request.url}: {decode_err}")
            # Attempt fallback to latin-1 if utf-8 fails, or handle as error
            try:
                 html_content = response.content.decode('latin-1', errors='replace')
            except Exception:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to decode URL content.")


        # Parse HTML content
        soup = BeautifulSoup(html_content, 'html.parser')

        # Extract title - try OpenGraph first, then standard title
        og_title = soup.find('meta', property='og:title')
        title = og_title['content'].strip() if og_title and 'content' in og_title.attrs else None
        if not title and soup.title:
            title = soup.title.string.strip() if soup.title.string else None

        # Extract description - try OpenGraph first, then meta description
        og_desc = soup.find('meta', property='og:description')
        description = og_desc['content'].strip() if og_desc and 'content' in og_desc.attrs else None
        if not description:
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and 'content' in meta_desc.attrs:
                description = meta_desc['content'].strip()

        # Log success
        logger.info(f"Metadata extracted for {request.url}: Title='{title}'")

        return MetadataResponse(title=title, description=description)

    except HTTPException as http_exc:
        # Re-raise HTTPExceptions directly
        raise http_exc
    except Exception as e:
        logger.exception(f"Error during metadata extraction for {request.url}: {str(e)}") # Use exception logger
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Metadata extraction failed.")


# --- ENDPOINTS TO BE ADDED ---
# GET /resources/user - Fetch user-added resources (potentially modify GET /)
# GET /resources/topics - Fetch unique topics from central library
# PATCH /resources/library/{resource_id}/status - Update status for central library item

# Note: Need to ensure the database models and logic for 'user_library_status' collection are handled correctly
# when implementing PATCH /resources/library/{resource_id}/status.