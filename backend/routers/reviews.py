"""Reviews router."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Annotated
from datetime import datetime, timedelta, timezone
import os
import json
from dotenv import load_dotenv
from bson.objectid import ObjectId
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Import database connection from shared module using dependency injection
from database import get_db

# Import utility functions
from utils.db_utils import get_document_by_id, update_document, delete_document
from utils.validators import validate_date_format, validate_rating, validate_required_fields, validate_resource_type
from utils.error_handlers import ValidationError, ResourceNotFoundError
from utils.response_models import StandardResponse, ResponseMessages

# Create router
router = APIRouter()

# Import authentication functions from auth
from auth import get_current_active_user, User

# Models
class ConceptBase(BaseModel):
    title: str
    content: str
    topics: List[str]

class ConceptCreate(ConceptBase):
    pass

class Review(BaseModel):
    date: str
    confidence: int

class Concept(ConceptBase):
    id: str
    reviews: List[Review] = []
    next_review: Optional[str] = None

class ConceptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    topics: Optional[List[str]] = None

class ConceptBatchCreate(BaseModel):
    concepts: List[ConceptCreate]

class ReviewCreate(BaseModel):
    confidence: int

class ReviewSession(BaseModel):
    date: str
    concepts: List[Dict[str, Any]]
    new_concepts: List[Dict[str, Any]]

# Add these models for resource reviews
class ResourceReviewBase(BaseModel):
    resource_type: str
    resource_id: int
    rating: int
    comment: Optional[str] = None
    content: str
    difficulty_rating: int
    topics: List[str]

class ResourceReviewCreate(ResourceReviewBase):
    pass

class ResourceReview(ResourceReviewBase):
    id: str
    user_id: str
    date: str
    updated_at: Optional[datetime] = None

class ReviewSettings(BaseModel):
    """Review settings model."""
    daily_review_target: int = 5
    notification_frequency: str = "daily"
    notification_enabled: bool = True
    review_reminder_time: str = "18:00"
    enable_spaced_repetition: bool = True
    auto_schedule_reviews: bool = True
    show_hints: bool = True
    difficulty_threshold: int = 3

# Helper functions
def calculate_next_review_date(review_count, confidence_level=3):
    """
    Calculate the next review date based on the number of previous reviews and confidence level.

    Args:
        review_count (int): Number of times the concept has been reviewed
        confidence_level (int): Confidence level (1-5)

    Returns:
        datetime: Date and time for the next review
    """
    # Base intervals in days
    intervals = [1, 3, 7, 14, 30, 60]
    base_interval = intervals[min(review_count, len(intervals) - 1)]

    # Adjust interval based on confidence (lower confidence = earlier review)
    confidence_factor = max(0.5, confidence_level / 5)  # 0.5 to 1.0
    adjusted_interval = base_interval * confidence_factor

    return datetime.now() + timedelta(days=adjusted_interval)

# Routes
@router.post("/concepts", response_model=Concept, status_code=status.HTTP_201_CREATED)
async def create_concept(
    concept: ConceptCreate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """Create a new concept for review."""
    try:
        # Validate required fields
        validate_required_fields(concept.model_dump(), ["title", "content", "topics"])

        if not concept.topics:
            raise ValidationError("At least one topic must be provided")

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Handle both cases where current_user is a User object or a dictionary
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    # Create concept object with ID
    concept_dict = concept.model_dump()
    concept_dict["id"] = str(ObjectId())
    concept_dict["reviews"] = []
    concept_dict["next_review"] = datetime.now().isoformat()
    concept_dict["user_id"] = username

    # Add to user's concepts
    try:
        await db.users.update_one(
            {"username": username},
            {"$push": {"concepts": concept_dict}}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create concept: {str(e)}"
        )

    return concept_dict

@router.get("/concepts", response_model=List[Concept])
async def get_concepts(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    topic: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get all concepts with optional topic filtering."""
    # Handle both cases where current_user is a User object or a dictionary
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')
    print(f"DEBUG: current_user type: {type(current_user)}")
    print(f"DEBUG: username: {username}")

    user = await db.users.find_one({"username": username})
    print(f"DEBUG: user found: {user is not None}")
    if user:
        print(f"DEBUG: user has concepts: {'concepts' in user}")
        if 'concepts' in user:
            print(f"DEBUG: number of concepts: {len(user['concepts'])}")

    if not user or "concepts" not in user:
        return []

    concepts = user["concepts"]

    # Filter by topic if specified
    if topic:
        concepts = [
            c for c in concepts
            if any(t.lower() == topic.lower() for t in c.get("topics", []))
        ]

    print(f"DEBUG: returning {len(concepts)} concepts")
    return concepts

@router.get("/concepts/{concept_id}", response_model=Concept)
async def get_concept(
    concept_id: str,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific concept by ID."""
    # Handle both cases where current_user is a User object or a dictionary
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    user = await db.users.find_one({"username": username})
    if not user or "concepts" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Concepts not found"
        )

    # Find the concept
    for concept in user["concepts"]:
        if concept.get("id") == concept_id:
            return concept

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Concept with ID {concept_id} not found"
    )

@router.put("/concepts/{concept_id}", response_model=Concept)
async def update_concept(
    concept_id: str,
    concept_update: ConceptUpdate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """Update a concept."""
    # Handle both cases where current_user is a User object or a dictionary
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    user = await db.users.find_one({"username": username})
    if not user or "concepts" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Concepts not found"
        )

    # Find the concept to update
    concepts = user["concepts"]
    concept_index = None
    for i, c in enumerate(concepts):
        if c.get("id") == concept_id:
            concept_index = i
            break

    if concept_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Concept with ID {concept_id} not found"
        )

    # Update concept fields
    update_data = {k: v for k, v in concept_update.model_dump().items() if v is not None}
    for key, value in update_data.items():
        concepts[concept_index][key] = value

    # Save updated concepts
    result = await db.users.update_one(
        {"username": username},
        {"$set": {"concepts": concepts}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update concept"
        )

    return concepts[concept_index]

@router.delete("/concepts/{concept_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_concept(
    concept_id: str,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """Delete a concept."""
    # Handle both cases where current_user is a User object or a dictionary
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    result = await db.users.update_one(
        {"username": username},
        {"$pull": {"concepts": {"id": concept_id}}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Concept with ID {concept_id} not found"
        )

@router.post("/concepts/{concept_id}/review", response_model=Concept)
async def mark_concept_reviewed(
    concept_id: str,
    review_data: ReviewCreate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """Mark a concept as reviewed with a confidence level."""
    # Handle both cases where current_user is a User object or a dictionary
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    # Validate confidence level
    if not (1 <= review_data.confidence <= 5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confidence level must be between 1 and 5"
        )

    user = await db.users.find_one({"username": username})
    if not user or "concepts" not in user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Concepts not found"
        )

    # Find the concept
    concepts = user["concepts"]
    concept_index = None
    for i, c in enumerate(concepts):
        if c.get("id") == concept_id:
            concept_index = i
            break

    if concept_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Concept with ID {concept_id} not found"
        )

    # Create review entry
    review_entry = {
        "date": datetime.now().isoformat(),
        "confidence": review_data.confidence
    }

    # Add to review history
    if "reviews" not in concepts[concept_index]:
        concepts[concept_index]["reviews"] = []

    concepts[concept_index]["reviews"].append(review_entry)

    # Calculate next review date
    review_count = len(concepts[concept_index]["reviews"])
    next_review_date = calculate_next_review_date(review_count, review_data.confidence)
    concepts[concept_index]["next_review"] = next_review_date.isoformat()

    # Save updated concepts
    result = await db.users.update_one(
        {"username": username},
        {"$set": {"concepts": concepts}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark concept as reviewed"
        )

    return concepts[concept_index]

@router.get("/due", response_model=List[Concept])
async def get_due_concepts(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """Get concepts that are due for review."""
    # Handle both cases where current_user is a User object or a dictionary
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    user = await db.users.find_one({"username": username})
    if not user or "concepts" not in user:
        return []

    now = datetime.now().isoformat()
    due_concepts = [
        c for c in user["concepts"]
        if c.get("next_review") and c.get("next_review") <= now
    ]

    return due_concepts

@router.get("/new", response_model=List[Concept])
async def get_new_concepts(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    count: int = 3,
    current_user: User = Depends(get_current_active_user)
):
    """Get concepts that haven't been reviewed yet."""
    # Handle both cases where current_user is a User object or a dictionary
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    user = await db.users.find_one({"username": username})
    if not user or "concepts" not in user:
        return []

    new_concepts = [
        c for c in user["concepts"]
        if not c.get("reviews") or len(c.get("reviews", [])) == 0
    ]

    # Return up to 'count' new concepts
    return new_concepts[:count]

@router.get("/session", response_model=ReviewSession)
async def generate_review_session(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    max_reviews: int = 5,
    current_user: User = Depends(get_current_active_user)
):
    """Generate a review session with due concepts and new concepts."""
    # Handle both cases where current_user is a User object or a dictionary
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    concepts = user.get("concepts", [])
    now = datetime.now()

    # Get due concepts
    due_concepts = [
        c for c in concepts
        if c.get("next_review") and c.get("next_review") <= now.isoformat()
    ]

    # Sort by next review date (oldest first)
    due_concepts.sort(key=lambda x: x.get("next_review", ""))

    # If we have more due concepts than our max, prioritize oldest ones
    if len(due_concepts) > max_reviews:
        due_concepts = due_concepts[:max_reviews]
        new_concepts = []
    else:
        # If we have fewer due concepts than max, add some new concepts
        remaining_slots = max_reviews - len(due_concepts)
        new_concepts = [
            c for c in concepts
            if not c.get("reviews") or len(c.get("reviews", [])) == 0
        ][:remaining_slots]

    # Create session
    session = {
        "date": now.strftime("%Y-%m-%d"),
        "concepts": due_concepts,
        "new_concepts": new_concepts
    }

    return session

@router.get("/statistics", response_model=Dict[str, Any])
async def get_review_statistics(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """Get statistics about user's review sessions."""
    # Handle both cases where current_user is a User object or a dictionary
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    # Get user from database
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Extract statistics
    concepts = user.get("concepts", [])
    review_log = user.get("review_log", {})

    # Initialize statistics
    stats = {
        "total_concepts": len(concepts),
        "concept_reviews": {
            "total": 0,
            "by_date": {},
            "by_confidence": {
                "1": 0,
                "2": 0,
                "3": 0,
                "4": 0,
                "5": 0
            }
        },
        "resource_reviews": {
            "total": 0,
            "by_resource_type": {},
            "by_rating": {
                "1": 0,
                "2": 0,
                "3": 0,
                "4": 0,
                "5": 0
            }
        },
        "due_concepts": {
            "today": 0,
            "this_week": 0,
            "overdue": 0
        },
        "average_confidence": 0.0,
        "streak": {
            "current": 0,
            "longest": 0,
            "last_review_date": None
        }
    }

    # Calculate due concept statistics
    now = datetime.now()
    today_end = datetime(now.year, now.month, now.day, 23, 59, 59)
    week_end = today_end + timedelta(days=7-now.weekday())

    for concept in concepts:
        next_review = concept.get("next_review")
        if next_review:
            try:
                next_review_date = datetime.fromisoformat(next_review)
                if next_review_date <= now:
                    stats["due_concepts"]["overdue"] += 1
                elif next_review_date <= today_end:
                    stats["due_concepts"]["today"] += 1
                elif next_review_date <= week_end:
                    stats["due_concepts"]["this_week"] += 1
            except (ValueError, TypeError):
                # Skip if date format is invalid
                pass

        # Count reviews by confidence
        for review in concept.get("reviews", []):
            confidence = str(review.get("confidence", 3))
            stats["concept_reviews"]["total"] += 1

            if confidence in stats["concept_reviews"]["by_confidence"]:
                stats["concept_reviews"]["by_confidence"][confidence] += 1

            # Count by date
            try:
                date = review.get("date", "")[:10]  # Get just the date part
                if date:
                    if date not in stats["concept_reviews"]["by_date"]:
                        stats["concept_reviews"]["by_date"][date] = 0
                    stats["concept_reviews"]["by_date"][date] += 1
            except Exception:
                # Skip if date format is invalid
                pass

    # Calculate average confidence if there are reviews
    if stats["concept_reviews"]["total"] > 0:
        total_confidence = sum(
            int(level) * count
            for level, count in stats["concept_reviews"]["by_confidence"].items()
            if level.isdigit()
        )
        stats["average_confidence"] = round(total_confidence / stats["concept_reviews"]["total"], 1)

    # Process resource reviews
    user_reviews = user.get("reviews", [])
    stats["resource_reviews"]["total"] = len(user_reviews)

    for review in user_reviews:
        # Count by resource type
        resource_type = review.get("resource_type", "other")
        if resource_type not in stats["resource_reviews"]["by_resource_type"]:
            stats["resource_reviews"]["by_resource_type"][resource_type] = 0
        stats["resource_reviews"]["by_resource_type"][resource_type] += 1

        # Count by rating
        rating = str(review.get("rating", 3))
        if rating in stats["resource_reviews"]["by_rating"]:
            stats["resource_reviews"]["by_rating"][rating] += 1

    # Calculate streak information
    dates = sorted(stats["concept_reviews"]["by_date"].keys())
    if dates:
        stats["streak"]["last_review_date"] = dates[-1]

        # Calculate current streak
        current_date = now.date().isoformat()
        yesterday = (now - timedelta(days=1)).date().isoformat()

        if current_date in dates:
            stats["streak"]["current"] = 1
            check_date = yesterday
            while check_date in dates:
                stats["streak"]["current"] += 1
                check_date = (datetime.fromisoformat(check_date) - timedelta(days=1)).date().isoformat()
        elif yesterday in dates:
            stats["streak"]["current"] = 1
            check_date = (datetime.fromisoformat(yesterday) - timedelta(days=1)).date().isoformat()
            while check_date in dates:
                stats["streak"]["current"] += 1
                check_date = (datetime.fromisoformat(check_date) - timedelta(days=1)).date().isoformat()

        # Calculate longest streak
        max_streak = 0
        current_streak = 1
        for i in range(1, len(dates)):
            prev_date = datetime.fromisoformat(dates[i-1])
            curr_date = datetime.fromisoformat(dates[i])

            if (curr_date - prev_date).days == 1:
                current_streak += 1
            else:
                max_streak = max(max_streak, current_streak)
                current_streak = 1

        max_streak = max(max_streak, current_streak)
        stats["streak"]["longest"] = max_streak

    # Use injected db for review statistics calculation if needed elsewhere
    # Example: Calculate average rating from separate reviews collection
    avg_rating = 0
    total_reviews = 0
    try:
        reviews_cursor = db.reviews.find({"user_id": username})
        async for review in reviews_cursor:
            total_reviews += 1
            avg_rating += review.get("rating", 0)
        if total_reviews > 0:
            avg_rating /= total_reviews
    except Exception as e:
        logger.error(f"Error fetching resource reviews for stats: {e}")

    # Return calculated statistics
    return stats

@router.get("/settings", response_model=ReviewSettings)
async def get_review_settings(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """Get user's review settings, returning defaults if none are set."""
    # Handle both cases where current_user is a User object or a dictionary
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Get existing settings or use defaults
    user_settings_data = user.get("review_settings", {}) # Get the nested dict or empty dict

    # Merge defaults with user settings to ensure all fields are present
    default_settings = ReviewSettings().model_dump()
    merged_settings = {**default_settings, **user_settings_data}

    # Validate and return using the model
    try:
        return ReviewSettings(**merged_settings)
    except Exception as e: # Catch potential validation errors if merging results in bad data
        logger.error(f"Error constructing ReviewSettings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving review settings."
        )

@router.put("/settings", response_model=ReviewSettings)
async def update_review_settings(
    settings: ReviewSettings,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """
    Update the user's review settings.
    This endpoint allows changing review system configuration.
    """
    try:
        # Handle both cases where current_user is a User object or a dictionary
        username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

        # Update user document
        result = await db.users.update_one(
            {"username": username},
            {"$set": {"review_settings": settings.model_dump()}}
        )

        if result.modified_count == 0:
            # Check if user exists
            user = await db.users.find_one({"username": username})
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

        # Fetch the updated user settings to return
        updated_user = await db.users.find_one({"username": username})
        if updated_user and "review_settings" in updated_user:
            # Ensure all fields from the model are present, using defaults if missing
            full_settings = {**ReviewSettings().model_dump(), **updated_user["review_settings"]}
            return ReviewSettings(**full_settings)
        else:
            # Should not happen if update was successful, but return defaults as fallback
            return ReviewSettings() # Return defaults

    except Exception as e:
        logger.error(f"Error updating review settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating review settings"
        )

# Add these routes for resource reviews
@router.post("/", response_model=ResourceReview, status_code=status.HTTP_201_CREATED)
async def create_review(
    review: ResourceReviewCreate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """Create a new resource review."""
    try:
        # Handle both cases where current_user is a User object or a dictionary
        username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

        if not username:
            logger.error("Username not found in current_user object")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User information is incomplete"
            )

        # Check if user exists
        user = await db.users.find_one({"username": username})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Validate rating
        if not (1 <= review.rating <= 5):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rating must be between 1 and 5"
            )

        # Validate difficulty rating
        if not (1 <= review.difficulty_rating <= 5):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Difficulty rating must be between 1 and 5"
            )

        # Create review object
        review_dict = review.model_dump()
        review_dict["id"] = f"review_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        review_dict["user_id"] = username
        review_dict["date"] = datetime.now().isoformat()

        # Add to user's reviews
        try:
            result = await db.users.update_one(
                {"username": username},
                {"$push": {"reviews": review_dict}}
            )

            if result.modified_count == 0:
                # If the reviews array doesn't exist yet, create it
                result = await db.users.update_one(
                    {"username": username},
                    {"$set": {"reviews": [review_dict]}}
                )

                if result.modified_count == 0:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to create review"
                    )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create review: {str(e)}"
            )

        return review_dict
    except Exception as e:
        logger.error(f"Error in create_review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create review: {str(e)}"
        )

@router.get("/", response_model=List[ResourceReview])
async def get_reviews(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """Get all reviews created by the user."""
    try:
        # Handle both cases where current_user is a User object or a dictionary
        username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

        if not username:
            logger.error("Username not found in current_user object")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User information is incomplete"
            )

        reviews_cursor = db.reviews.find({"user_id": username})
        reviews = []
        async for review in reviews_cursor:
            review["id"] = str(review["_id"])
            del review["_id"]
            reviews.append(review)
        return reviews
    except Exception as e:
        logger.error(f"Error in get_reviews: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve reviews: {str(e)}"
        )

@router.get("/resource/{resource_type}/{resource_id}", response_model=List[ResourceReview])
async def get_reviews_by_resource(
    resource_type: str,
    resource_id: int,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """Get reviews for a specific resource."""
    try:
        # Handle both cases where current_user is a User object or a dictionary
        username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

        if not username:
            logger.error("Username not found in current_user object")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User information is incomplete"
            )

        # Validate resource type
        validate_resource_type(resource_type)

        reviews_cursor = db.reviews.find({
            "user_id": username,
            "resource_type": resource_type,
            "resource_id": resource_id
        })
        reviews = []
        async for review in reviews_cursor:
            review["id"] = str(review["_id"])
            del review["_id"]
            reviews.append(review)
        return reviews
    except Exception as e:
        logger.error(f"Error in get_reviews_by_resource: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve reviews: {str(e)}"
        )

@router.put("/{review_id}", response_model=ResourceReview)
async def update_review(
    review_id: str,
    review_update: ResourceReviewCreate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """Update a review."""
    try:
        # Handle both cases where current_user is a User object or a dictionary
        username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

        if not username:
            logger.error("Username not found in current_user object")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User information is incomplete"
            )

        # Validate rating
        if not (1 <= review_update.rating <= 5):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rating must be between 1 and 5"
            )

        # Validate difficulty rating
        if not (1 <= review_update.difficulty_rating <= 5):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Difficulty rating must be between 1 and 5"
            )

        # Validate topics list is not empty
        if not review_update.topics:
            raise ValidationError("At least one topic must be provided")

    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    try:
        review_oid = ObjectId(review_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid review ID format")

    # Check if the review exists and belongs to the current user
    existing_review = await db.reviews.find_one({"_id": review_oid, "user_id": username})
    if not existing_review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found or access denied"
        )

    # Prepare update data
    update_data = review_update.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        result = await db.reviews.update_one(
            {"_id": review_oid, "user_id": username},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            # This check is redundant given the find_one above but good for safety
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found or access denied")

        # Fetch the updated review to return
        updated_review = await db.reviews.find_one({"_id": review_oid})
        if not updated_review:
            # Should not happen if update was successful
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve updated review")

        updated_review["id"] = str(updated_review["_id"])
        del updated_review["_id"]

        return updated_review

    except Exception as e:
        logger.error(f"Error updating review {review_id} for user {username}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update review: {str(e)}"
        )

@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: str,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """Delete a review."""
    try:
        # Handle both cases where current_user is a User object or a dictionary
        username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

        if not username:
            logger.error("Username not found in current_user object")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User information is incomplete"
            )

        review_oid = ObjectId(review_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid review ID format")

    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    try:
        result = await db.reviews.delete_one({"_id": review_oid, "user_id": username})

        if result.deleted_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found or access denied")

        # No content to return, FastAPI handles the 204 status code
        return

    except Exception as e:
        logger.error(f"Error deleting review {review_id} for user {username}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete review: {str(e)}"
        )

@router.post("/concepts/batch", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_concepts_batch(
    concepts_batch: ConceptBatchCreate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    current_user: User = Depends(get_current_active_user)
):
    """Create multiple concepts in a batch."""
    try:
        # Handle both cases where current_user is a User object or a dictionary
        username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

        if not username:
            logger.error("Username not found in current_user object")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User information is incomplete"
            )

        result = {
            "success": [],
            "errors": []
        }

        for concept_data in concepts_batch.concepts:
            try:
                # Create a unique ID based on timestamp and title
                timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                slug = concept_data.title.lower().replace(" ", "_")[:20]
                concept_id = f"{timestamp}_{slug}"

                # Create concept document
                concept_doc = {
                    "id": concept_id,
                    "title": concept_data.title,
                    "content": concept_data.content,
                    "topics": concept_data.topics,
                    "reviews": [],
                    "next_review": None,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }

                # Update user document
                update_result = await db.users.update_one(
                    {"username": username},
                    {"$push": {"concepts": concept_doc}}
                )

                if update_result.modified_count == 0:
                    result["errors"].append({
                        "data": concept_data.dict(),
                        "error": "Failed to add concept to user"
                    })
                    continue

                # Add to success list
                result["success"].append(concept_doc)

            except Exception as e:
                result["errors"].append({
                    "data": concept_data.dict(),
                    "error": str(e)
                })

        return result
    except Exception as e:
        logger.error(f"Error in create_concepts_batch: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create concepts batch: {str(e)}"
        )