"""Resources router."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv
import logging
import httpx # Use httpx for async requests
from bs4 import BeautifulSoup

# Load environment variables
load_dotenv()

# Import database connection from shared module
from database import db

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
async def get_next_resource_id(db, username, resource_type):
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
    topic: Optional[str] = None,
    type: Optional[str] = None,
    difficulty: Optional[str] = None,
    # Add pagination later if needed: page: int = 1, page_size: int = 50
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get resources from the central library, merging user completion status.
    Supports filtering by topic, type, and difficulty.
    """
    username = get_username(current_user)
    filtered_resources = list(ALL_CENTRAL_RESOURCES_LIST) # Start with a copy

    # Apply filters
    if topic:
        filtered_resources = [
            r for r in filtered_resources
            if any(t.lower() == topic.lower() for t in r.get("topics", []))
        ]
    if type:
        # Map frontend type (e.g., 'guide') to backend category key if needed
        # For now, assuming type matches keys like 'courses', 'platforms_guides'
        # Make sure 'type' added during load matches expected filter values
        filtered_resources = [r for r in filtered_resources if r.get("type", "").lower() == type.lower()]
    if difficulty:
        filtered_resources = [r for r in filtered_resources if r.get("difficulty", "").lower() == difficulty.lower()]

    # Fetch user's completion status for the filtered resources
    user_statuses = {}
    resource_ids_to_fetch = [r['id'] for r in filtered_resources]
    if resource_ids_to_fetch:
        status_cursor = db.user_library_status.find({
            "username": username,
            "resource_id": {"$in": resource_ids_to_fetch}
        })
        async for status_doc in status_cursor:
            user_statuses[status_doc["resource_id"]] = status_doc

    # Merge status into results
    results_with_status = []
    for resource in filtered_resources:
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


    # Apply pagination here if implemented

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
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update the completion status and notes for a specific central library resource
    for the current user. Creates or updates a record in user_library_status.
    """
    username = get_username(current_user)

    # 1. Validate that the resource_id exists in the central library
    if resource_id not in CENTRAL_RESOURCES_DICT:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} not found in the central library."
        )

    # 2. Prepare the update data for the user_library_status collection
    update_data = {
        "username": username,
        "resource_id": resource_id,
        "completed": status_update.completed,
        "last_updated": datetime.now().isoformat()
    }
    if status_update.completed:
        update_data["completion_date"] = datetime.now().isoformat()
    else:
        update_data["completion_date"] = None # Clear completion date if marking incomplete

    if status_update.notes is not None:
        update_data["notes"] = status_update.notes
    else:
        # If notes are not provided in the PATCH, we keep the existing ones or set to empty if no record exists yet
        # We query first to handle this case, or use $unset conditionally if needed
        pass # Handle notes below after potential query

    # 3. Upsert the status in the user_library_status collection
    # We use upsert=True: create if not exists, update if exists.
    # Filter by username and resource_id
    status_filter = {"username": username, "resource_id": resource_id}

    # Prepare $set and $setOnInsert operations
    set_on_insert_data = {"first_added": datetime.now().isoformat()}
    set_data = update_data.copy()
    set_data.pop('username') # Don't need to $set these fields in the filter
    set_data.pop('resource_id')

    # Handle notes: only set notes if explicitly provided in the request
    if status_update.notes is None:
        set_data.pop('notes', None) # Don't update notes if not provided
        # If inserting, we might want notes to default to empty string
        set_on_insert_data['notes'] = "" # Default notes to empty on insert if not provided


    result = await db.user_library_status.update_one(
        status_filter,
        {
            "$set": set_data,
            "$setOnInsert": set_on_insert_data
        },
        upsert=True
    )

    # Log the operation result (optional)
    if result.upserted_id:
        logger.info(f"Created status record for user {username}, resource {resource_id}")
    elif result.modified_count > 0:
        logger.info(f"Updated status record for user {username}, resource {resource_id}")
    else:
         # This case might occur if the status submitted is identical to the existing status
         logger.info(f"Status record for user {username}, resource {resource_id} was not modified (status likely unchanged).")

    # 4. Construct the response by fetching the updated status and merging with central data
    # Fetch the potentially updated/created status document
    updated_status_doc = await db.user_library_status.find_one(status_filter)

    # Get the base resource data from the central dictionary
    base_resource_data = CENTRAL_RESOURCES_DICT[resource_id].copy()

    # Merge status into the base data
    if updated_status_doc:
        base_resource_data['completed'] = updated_status_doc.get('completed', False)
        base_resource_data['completion_date'] = updated_status_doc.get('completion_date')
        base_resource_data['notes'] = updated_status_doc.get('notes', base_resource_data.get('notes', '')) # Prioritize user notes
    else:
        # Should not happen with upsert=True, but handle defensively
        base_resource_data['completed'] = False
        base_resource_data['completion_date'] = None
        # Keep original notes if no user status found

    # Validate and return using the LibraryResource model
    try:
        return LibraryResource(**base_resource_data)
    except Exception as model_exc:
        logger.error(f"Failed to validate merged resource data for {resource_id} after status update: {model_exc}")
        raise HTTPException(status_code=500, detail="Failed to construct response after status update.")

# --- User-Added Resource Endpoints (Existing, may need clarification comments) ---

# Statistics endpoint - Needs to be defined BEFORE /{resource_type}
@router.get("/statistics", response_model=Dict[str, Any])
async def get_resource_statistics(current_user: dict = Depends(get_current_active_user)):
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
    topic: Optional[str] = None,
    type: Optional[str] = None,
    difficulty: Optional[str] = None,
    completed: Optional[bool] = None,
    # Add pagination later if needed: page: int = 1, page_size: int = 50
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get all resources *added by* the current user, aggregated into a single list.
    Supports filtering by topic, type, difficulty, and completion status.
    """
    username = get_username(current_user)
    user = await db.users.find_one({"username": username})

    all_user_resources = []
    if user and "resources" in user and isinstance(user["resources"], dict):
        # Iterate through allowed user-addable types
        for resource_type in ["articles", "videos", "courses", "books"]:
            if resource_type in user["resources"] and isinstance(user["resources"][resource_type], list):
                for resource_data in user["resources"][resource_type]:
                    if isinstance(resource_data, dict):
                        # Add 'type' field for consistency and potential filtering
                        resource_copy = resource_data.copy()
                        resource_copy['type'] = resource_type
                        all_user_resources.append(resource_copy)

    # --- Apply Filters ---
    filtered_resources = list(all_user_resources) # Start with a copy

    if topic:
        filtered_resources = [
            r for r in filtered_resources
            if any(t.lower() == topic.lower() for t in r.get("topics", []))
        ]
    if type:
        # Filter by the 'type' field we added
        filtered_resources = [r for r in filtered_resources if r.get("type", "").lower() == type.lower()]
    if difficulty:
        filtered_resources = [r for r in filtered_resources if r.get("difficulty", "").lower() == difficulty.lower()]
    if completed is not None:
         filtered_resources = [r for r in filtered_resources if r.get("completed", False) == completed]

    # --- Validate and Return ---
    validated_output = []
    for r_data in filtered_resources:
        try:
            validated_output.append(UserResource(**r_data))
        except Exception as model_exc:
            logger.warning(f"Skipping user resource during GET /user due to validation error: Type={r_data.get('type')}, ID={r_data.get('id')}, Error: {model_exc}")

    # Apply pagination here if implemented

    return validated_output

# Add comment: Operates on user-added resources stored in db.users
# Note: This endpoint returns data grouped by type, whereas /user returns a flat list.
@router.get("/", response_model=Dict[str, List[UserResource]])
async def get_all_user_resources_grouped(current_user: dict = Depends(get_current_active_user)):
    """Get all resources *added by* the current user, grouped by type."""
    username = get_username(current_user)

    user = await db.users.find_one({"username": username})
    user_resources_raw = {}
    if user and "resources" in user and isinstance(user['resources'], dict):
        user_resources_raw = user["resources"]

    # Validate and format the output
    formatted_output: Dict[str, List[UserResource]] = {
        "articles": [],
        "videos": [],
        "courses": [],
        "books": []
        # Note: Does not include 'platforms_guides' as user cannot add this type currently
    }

    for resource_type, resource_list in user_resources_raw.items():
        if resource_type in formatted_output and isinstance(resource_list, list):
            valid_resources_for_type = []
            for resource_data in resource_list:
                if isinstance(resource_data, dict):
                     # Add 'type' field for model validation
                    resource_data_typed = resource_data.copy()
                    resource_data_typed['type'] = resource_type
                    try:
                        validated_resource = UserResource(**resource_data_typed)
                        valid_resources_for_type.append(validated_resource)
                    except Exception as model_exc: # Catch Pydantic validation error specifically if needed
                        logger.warning(f"Skipping user resource due to validation error: Type={resource_type}, ID={resource_data.get('id')}, Error: {model_exc}")
            formatted_output[resource_type] = valid_resources_for_type

    return formatted_output

# Add comment: Operates on user-added resources stored in db.users
@router.get("/{resource_type}", response_model=List[UserResource])
async def get_user_resources_by_type(
    resource_type: str,
    completed: Optional[bool] = None,
    topic: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get resources of a specific type *added by* the user with optional filtering."""
    try:
        # Validate the type against user-addable types
        if resource_type not in ["articles", "videos", "courses", "books"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid resource type for user-added resources: {resource_type}"
            )

        username = current_user["username"]

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
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new resource *added by* the user."""
    # Validate resource type (only user-addable types)
    if resource_type not in ["articles", "videos", "courses", "books"]:
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
        resource_dict["id"] = await get_next_resource_id(db, username, resource_type) # Use helper for integer ID
        resource_dict["date_added"] = datetime.now().isoformat()
        resource_dict["completed"] = False
        resource_dict["completion_date"] = None
        resource_dict["notes"] = resource_dict.get("notes", "") # Ensure notes field exists
        # Add other user-specific fields if needed (priority, source are not in ResourceBase)
        resource_dict["priority"] = "medium" # Default or get from input if model changes
        resource_dict["source"] = "user" # Indicate it's user-added

        # Get user document
        user = await db.users.find_one({"username": username})

        # Initialize resources structure if it doesn't exist
        if not user or "resources" not in user or not isinstance(user.get("resources"), dict):
            await db.users.update_one(
                {"username": username},
                {"$set": {"resources": {
                    "articles": [], "videos": [], "courses": [], "books": []
                }}},
                upsert=True
            )
        elif resource_type not in user.get("resources", {}):
             # Ensure the specific resource type list exists
             await db.users.update_one(
                {"username": username},
                {"$set": {f"resources.{resource_type}": []}},
                upsert=False # Don't upsert here, user must exist
            )


        # Add to user's resources
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
    current_user: dict = Depends(get_current_active_user)
):
    """Update an existing resource *added by* the user."""
    username = get_username(current_user)

    # Validate type
    if resource_type not in ["articles", "videos", "courses", "books"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resource type for user-added resource: {resource_type}"
        )

    # Get user's resources
    user = await db.users.find_one({"username": username})
    if not user or "resources" not in user or not isinstance(user.get("resources"), dict) or resource_type not in user["resources"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resources of type {resource_type} not found for user."
        )

    # Find the resource to update
    resources = user["resources"][resource_type]
    resource_index = -1 # Use -1 to indicate not found initially
    for i, r in enumerate(resources):
        # Check if 'r' is a dict and has 'id' matching resource_id
        if isinstance(r, dict) and r.get("id") == resource_id:
            resource_index = i
            break

    if resource_index == -1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User-added resource with ID {resource_id} not found in type {resource_type}"
        )

    # Update resource fields
    update_data = resource_update.model_dump(exclude_unset=True) # Exclude unset fields
    # Prevent changing ID or type via update
    update_data.pop('id', None)
    update_data.pop('type', None)

    # Update the dictionary in the list
    original_resource = resources[resource_index]
    original_resource.update(update_data)

    # Save updated resources list back to the user document
    result = await db.users.update_one(
        {"username": username, f"resources.{resource_type}.id": resource_id}, # More specific filter
        {"$set": {f"resources.{resource_type}.$": original_resource}} # Use positional operator $
    )

    if result.matched_count == 0:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User-added resource with ID {resource_id} not found during update."
        )
    if result.modified_count == 0:
        # This might happen if the update data is identical to existing data
        logger.info(f"Resource {resource_id} (type {resource_type}) for user {username} was not modified (data might be identical).")
        # Return the resource anyway, as it reflects the current state
        # Pass it back through the model validation
        original_resource['type'] = resource_type
        return UserResource(**original_resource)


    # Fetch the updated resource to return it (or construct from original_resource)
    updated_user = await db.users.find_one({"username": username})
    updated_resource_data = next((r for r in updated_user["resources"][resource_type] if isinstance(r, dict) and r.get("id") == resource_id), None)

    if updated_resource_data:
        updated_resource_data['type'] = resource_type
        return UserResource(**updated_resource_data)
    else:
        # Should not happen if modified_count was 1, but handle defensively
        logger.error(f"Resource {resource_id} (type {resource_type}) for user {username} modified but not found after update.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve updated resource.")


# Add comment: Operates on user-added resources stored in db.users
@router.patch("/{resource_type}/{resource_id}/complete", response_model=UserResource)
async def mark_user_resource_completed(
    resource_type: str,
    resource_id: int, # User resources use integer IDs
    completion_data: ResourceComplete,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Mark a specific user-added resource as completed.
    Finds the resource within the user's document and updates its status.
    Uses find/modify-in-python/update logic for mock DB compatibility.
    """
    username = get_username(current_user)
    # Ensure the resource type is one that users can add (e.g., not platforms_guides)
    if resource_type not in ["articles", "videos", "courses", "books"]:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resource type for user-added resource: {resource_type}"
        )
    now_iso = datetime.now().isoformat()

    # --- Revised Logic: Find, Modify in Python, Update --- #
    # 1. Find the user document
    user = await db.users.find_one({"username": username})
    if not user:
        logger.error(f"Authenticated user '{username}' not found in DB for resource completion.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # 2. Find the resource within the user's document in Python
    resource_found = False
    resource_index = -1
    target_array_path = f"resources.{resource_type}" # e.g., "resources.articles"
    resource_list = user.get("resources", {}).get(resource_type, [])

    if not isinstance(resource_list, list):
         logger.error(f"Data corruption: Expected list for {target_array_path} for user {username}, found {type(resource_list)}")
         raise HTTPException(status_code=500, detail="Internal server error processing user resources.")

    for i, resource in enumerate(resource_list):
        # Ensure comparison is between integers if resource ID is stored as int
        if isinstance(resource, dict) and resource.get("id") == resource_id:
            resource_found = True
            resource_index = i
            break

    if not resource_found:
        logger.warning(f"Resource ID {resource_id} not found in {target_array_path} for user {username}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User-added resource with ID {resource_id} not found in type {resource_type}"
        )

    # 3. Update the resource fields in the Python list
    resource_to_update = resource_list[resource_index] # Get a reference to the dict in the list

    if not isinstance(resource_to_update, dict):
         logger.error(f"Data corruption: Expected dict for resource at index {resource_index} in {target_array_path} for user {username}")
         raise HTTPException(status_code=500, detail="Internal server error processing resource.")

    if resource_to_update.get('completed') is True:
        logger.info(f"Resource {resource_type}/{resource_id} for user {username} is already marked completed.")
        # Update notes even if already completed
        if completion_data.notes is not None:
             resource_to_update['notes'] = completion_data.notes
    else:
        resource_to_update['completed'] = True
        resource_to_update['completion_date'] = now_iso
        if completion_data.notes is not None:
            resource_to_update['notes'] = completion_data.notes
        logger.info(f"Marking resource {resource_type}/{resource_id} completed for user {username}.")

    # 4. Use update_one to $set the entire modified array back into the user document
    # Note: This replaces the whole array for the specific resource_type
    update_result = await db.users.update_one(
        {"username": username},
        {"$set": {target_array_path: resource_list}} # Set the modified list back
    )

    if update_result.modified_count == 0 and update_result.matched_count > 0:
         # This could happen if the only change was notes on an already completed item,
         # and the notes were the same as before. Or a concurrent update conflict.
         # We'll assume success if notes were updated or state changed. Check if notes were part of the update.
         if completion_data.notes is not None and resource_to_update['notes'] == completion_data.notes:
             logger.info(f"Resource {resource_type}/{resource_id} completion status unchanged, notes updated to same value for {username}.")
         elif not resource_to_update['completed']: # Should be completed now unless error
             logger.error(f"DB update reported no modification for {username}, resource {resource_id}, but state change expected.")
             raise HTTPException(status_code=500, detail="Failed to save resource completion status (no modification).")
         # If only notes changed to the same value, or it was already complete and notes weren't provided, no modification is OK.

    elif update_result.matched_count == 0:
         # This means the user document itself wasn't found, which contradicts the initial find_one. Very unlikely.
         logger.error(f"Failed to find user {username} during final update for resource {resource_id} completion.")
         raise HTTPException(status_code=500, detail="Failed to save resource completion status (user disappeared?).")


    logger.info(f"Successfully marked/updated resource {resource_type}/{resource_id} status for user {username}.")
    # Return the updated resource object from the list (add type back for model)
    resource_to_update['type'] = resource_type
    try:
        return UserResource(**resource_to_update)
    except Exception as e:
         logger.error(f"Validation error creating response for completed resource {resource_id} user {username}: {e}")
         raise HTTPException(status_code=500, detail="Failed to create response model for updated resource.")

# Add comment: Operates on user-added resources stored in db.users
@router.delete("/{resource_type}/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_resource(
    resource_type: str,
    resource_id: int, # User resources use integer IDs
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a specific resource *added by* the user."""
    username = get_username(current_user)

    # Validate type
    if resource_type not in ["articles", "videos", "courses", "books"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resource type for user-added resource: {resource_type}"
        )

    # Use $pull to remove the resource from the array
    update_result = await db.users.update_one(
        {"username": username},
        {"$pull": {f"resources.{resource_type}": {"id": resource_id}}}
    )

    if update_result.matched_count == 0:
        # User not found
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if update_result.modified_count == 0:
        # Resource with that ID wasn't found in the array
        logger.warning(f"Resource ID {resource_id} (type {resource_type}) not found for deletion for user {username}.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User-added resource with ID {resource_id} not found in type {resource_type}"
        )

    logger.info(f"Successfully deleted resource {resource_type}/{resource_id} for user {username}.")
    # No content to return for 204

# Add comment: Operates on user-added resources stored in db.users
@router.get("/{resource_type}/{resource_id}", response_model=UserResource)
async def get_user_resource_by_id(
    resource_type: str,
    resource_id: int, # User resources use integer IDs
    current_user: dict = Depends(get_current_active_user)
):
    """Get a specific resource *added by* the user by its type and ID."""
    username = get_username(current_user)
    validate_resource_type(resource_type)

    user = await db.users.find_one({"username": username})

    resource_data = None
    if user and "resources" in user and isinstance(user["resources"], dict) and resource_type in user["resources"]:
        resource_list = user["resources"][resource_type]
        if isinstance(resource_list, list):
            # Find the resource with the matching ID in the list
            resource_data = next((r for r in resource_list if isinstance(r, dict) and r.get("id") == resource_id), None)

    if resource_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User-added resource with ID {resource_id} not found in type {resource_type}"
        )

    # Add type for model validation and return
    resource_data['type'] = resource_type
    try:
         return UserResource(**resource_data)
    except Exception as e:
         logger.error(f"Validation error creating response for get resource {resource_id} user {username}: {e}")
         raise HTTPException(status_code=500, detail="Failed to create response model for resource.")

# Add comment: Operates on user-added resources stored in db.users
@router.get("/next", response_model=List[UserResource])
async def get_next_user_resources(
    count: int = 5,
    current_user: dict = Depends(get_current_active_user)
):
    """Get the next N uncompleted resources *added by* the user."""
    username = get_username(current_user)
    user = await db.users.find_one({"username": username})
    if not user or "resources" not in user or not isinstance(user.get("resources"), dict):
        return []

    # Collect all uncompleted user-added resources
    uncompleted = []
    for resource_type, resource_list in user["resources"].items():
         # Only consider valid user-addable types and ensure it's a list
        if resource_type in ["articles", "videos", "courses", "books"] and isinstance(resource_list, list):
            for resource in resource_list:
                # Check if resource is a dict and not completed
                if isinstance(resource, dict) and not resource.get("completed", False):
                    resource_copy = resource.copy()
                    resource_copy["type"] = resource_type  # Add type for model validation/display
                    # Validate before adding
                    try:
                        uncompleted.append(UserResource(**resource_copy))
                    except Exception as model_exc:
                        logger.warning(f"Skipping next user resource due to validation error: Type={resource_type}, ID={resource.get('id')}, Error: {model_exc}")


    # Sort by date added (newest first)
    uncompleted.sort(key=lambda x: getattr(x, 'date_added', ""), reverse=True)

    # Return up to 'count' resources
    return uncompleted[:count]


# --- Batch Operations (Currently operate on user-added resources) ---

# Add comment: Operates on user-added resources stored in db.users
@router.post("/batch", response_model=List[UserResource], status_code=status.HTTP_201_CREATED)
async def create_batch_user_resources_api(
    batch_data: ResourceBatchRequest, # Uses the generic request model
    current_user: dict = Depends(get_current_active_user)
):
    """
    Create multiple resources *added by the user* in a single batch request.
    This endpoint is specifically designed to match frontend expectations for adding user resources.
    """
    try:
        username = get_username(current_user)

        # Array to store created resources validated against UserResource model
        created_resources: List[UserResource] = []
        # Structure to hold updates for the database push
        updates_by_type: Dict[str, List[Dict]] = {
            "articles": [], "videos": [], "courses": [], "books": []
        }

        # Pre-fetch starting IDs for efficiency (though might have slight race condition risk if called concurrently)
        # A more robust approach might involve a counter collection or retry logic.
        next_ids = {
            rtype: await get_next_resource_id(db, username, rtype)
            for rtype in updates_by_type.keys()
        }

        # Process each resource
        for idx, resource_data in enumerate(batch_data.resources):
            try:
                # Determine resource type (default to 'articles')
                resource_type = resource_data.get("type") or resource_data.get("resource_type", "articles")
                if resource_type not in updates_by_type:
                    logger.warning(f"Skipping resource item {idx} with invalid type: {resource_type}")
                    continue # Skip invalid types

                # Validate URL
                url = resource_data.get("url", "")
                if not validate_url(url):
                    logger.warning(f"Skipping resource item {idx} with invalid URL: {url}")
                    continue # Skip invalid URLs

                # Assign ID and increment for the type
                resource_id = next_ids[resource_type]
                next_ids[resource_type] += 1

                # Create resource dictionary for DB update
                new_resource_db = {
                    "id": resource_id,
                    "title": resource_data.get("title", f"Resource {resource_id}"),
                    "url": url,
                    "topics": resource_data.get("tags", []) or resource_data.get("topics", []),
                    "difficulty": resource_data.get("difficulty", "beginner"),
                    "estimated_time": resource_data.get("estimated_time", 30),
                    "completed": False,
                    "completion_date": None,
                    "date_added": datetime.now().isoformat(),
                    "notes": resource_data.get("notes", "") or resource_data.get("description", ""),
                    "priority": resource_data.get("priority", "medium"),
                    "source": resource_data.get("source", "user") # Mark as user-added
                }

                # Add to the correct list for DB update
                updates_by_type[resource_type].append(new_resource_db)

                # Create validated object for response
                new_resource_resp_data = new_resource_db.copy()
                new_resource_resp_data['type'] = resource_type
                created_resources.append(UserResource(**new_resource_resp_data))

            except Exception as item_exc:
                logger.error(f"Error processing batch resource item {idx}: {str(item_exc)}")
                # Continue to next resource if one fails processing


        # Perform the database updates if there are any resources to add
        if any(updates_by_type.values()):
             # Ensure user document and resources field exist
            user = await db.users.find_one({"username": username})
            if not user:
                # If user doesn't exist, something is wrong with auth - raise error
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

            update_operations = {}
            if "resources" not in user or not isinstance(user.get("resources"), dict):
                 # Initialize the entire resources object if missing
                 init_resources = {rtype: [] for rtype in updates_by_type.keys()}
                 update_operations["$set"] = {"resources": init_resources}

            # Prepare $push operations for each type that has new resources
            push_ops = {}
            for rtype, resources_to_add in updates_by_type.items():
                if resources_to_add:
                    # Ensure the list for this type exists before pushing
                    if "resources" not in user or not isinstance(user.get("resources"), dict) or rtype not in user["resources"]:
                        # Add the field initialization to $set if it wasn't already handled
                        if "$set" not in update_operations: update_operations["$set"] = {}
                        if "resources" not in update_operations["$set"]: update_operations["$set"]["resources"] = {}
                        update_operations["$set"][f"resources.{rtype}"] = [] # Initialize specific type list

                    push_ops[f"resources.{rtype}"] = {"$each": resources_to_add}

            if push_ops:
                update_operations["$push"] = push_ops

            # Execute the update
            if update_operations:
                result = await db.users.update_one({"username": username}, update_operations, upsert=False) # Don't upsert, user must exist
                if result.matched_count == 0:
                     logger.error(f"Batch update failed to match user {username}.")
                     # This indicates a potential issue, maybe user was deleted between check and update?
                     # Don't raise 500 immediately, but log failure. The response will be empty or partial.
                     # If partial success is okay, return `created_resources`. If atomicity needed, this needs transactions.
                     pass # Allow partial success for now
                elif result.modified_count == 0 and update_operations:
                    logger.warning(f"Batch update for user {username} resulted in no modifications, though updates were prepared.")


        return created_resources

    except HTTPException as http_exc:
        raise http_exc # Re-raise known HTTP exceptions
    except Exception as e:
        logger.exception(f"Critical error in batch user resource creation for {username}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create batch resources: {str(e)}"
        )


# --- Metadata Endpoint ---

# Add comment: Utility endpoint, not directly tied to user/library resources yet
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