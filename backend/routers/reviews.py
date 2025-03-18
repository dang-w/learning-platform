"""Reviews router."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import json
from dotenv import load_dotenv
from bson.objectid import ObjectId
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Import database connection from shared module
from database import db

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
    content: str
    difficulty_rating: int
    topics: List[str]

class ResourceReviewCreate(ResourceReviewBase):
    pass

class ResourceReview(ResourceReviewBase):
    id: str
    user_id: str
    date: str

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
    current_user: User = Depends(get_current_active_user)
):
    """Get statistics about the user's reviews."""
    # Handle both cases where current_user is a User object or a dictionary
    username = current_user.username if hasattr(current_user, 'username') else current_user.get('username')

    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    reviews = user.get("reviews", [])
    concepts = user.get("concepts", [])

    # Count total reviews from concepts
    total_concept_reviews = sum(len(c.get("reviews", [])) for c in concepts)

    # Initialize statistics
    stats = {
        "total_reviews": total_concept_reviews,  # Use the count from concepts
        "average_rating": 0,
        "average_difficulty": 0,
        "rating_distribution": {str(i): 0 for i in range(1, 6)},
        "difficulty_distribution": {str(i): 0 for i in range(1, 6)},
        "topics": {},
        "resource_types": {},
        "recent_reviews": [],
        "due_reviews": 0,
        "new_concepts": 0,
        "average_confidence": 0,
        "confidence_distribution": {str(i): 0 for i in range(1, 6)},
        # Add concept statistics
        "total_concepts": len(concepts),
        "concepts_with_reviews": sum(1 for c in concepts if c.get("reviews") and len(c.get("reviews", [])) > 0),
        "concepts_without_reviews": sum(1 for c in concepts if not c.get("reviews") or len(c.get("reviews", [])) == 0),
        "review_history": []
    }

    # If there are no reviews in concepts, return early
    if total_concept_reviews == 0:
        return stats

    # Calculate statistics for resource reviews
    total_rating = 0
    total_difficulty = 0

    for review in reviews:
        # Rating distribution
        rating = review.get("rating", 0)
        if 1 <= rating <= 5:
            total_rating += rating
            stats["rating_distribution"][str(rating)] += 1

        # Difficulty distribution
        difficulty = review.get("difficulty_rating", 0)
        if 1 <= difficulty <= 5:
            total_difficulty += difficulty
            stats["difficulty_distribution"][str(difficulty)] += 1

        # Topics
        for topic in review.get("topics", []):
            if topic in stats["topics"]:
                stats["topics"][topic] += 1
            else:
                stats["topics"][topic] = 1

        # Resource types
        resource_type = review.get("resource_type", "unknown")
        if resource_type in stats["resource_types"]:
            stats["resource_types"][resource_type] += 1
        else:
            stats["resource_types"][resource_type] = 1

    # Calculate averages for resource reviews
    if reviews:
        stats["average_rating"] = total_rating / len(reviews)
        stats["average_difficulty"] = total_difficulty / len(reviews)

    # Get recent reviews (last 5)
    sorted_reviews = sorted(
        reviews,
        key=lambda x: x.get("date", ""),
        reverse=True
    )

    stats["recent_reviews"] = sorted_reviews[:5]

    # Convert topic counts to list for easier frontend processing
    stats["topics"] = [
        {"name": topic, "count": count}
        for topic, count in sorted(stats["topics"].items(), key=lambda x: x[1], reverse=True)
    ]

    # Convert resource type counts to list
    stats["resource_types"] = [
        {"type": resource_type, "count": count}
        for resource_type, count in sorted(stats["resource_types"].items(), key=lambda x: x[1], reverse=True)
    ]

    # Calculate concept statistics
    total_confidence = 0
    confidence_counts = {i: 0 for i in range(1, 6)}
    review_dates = []

    # Collect topics from concepts
    concept_topics = {}

    for concept in concepts:
        # Collect topics from concepts
        for topic in concept.get("topics", []):
            if topic in concept_topics:
                concept_topics[topic] += 1
            else:
                concept_topics[topic] = 1

        concept_reviews = concept.get("reviews", [])
        if concept_reviews:
            for review in concept_reviews:
                confidence = review.get("confidence", 0)
                if 1 <= confidence <= 5:
                    total_confidence += confidence
                    confidence_counts[confidence] += 1

                # Add review date to history
                review_date = review.get("date")
                if review_date:
                    review_dates.append(review_date)

    # Calculate average confidence
    if total_concept_reviews > 0:
        stats["average_confidence"] = total_confidence / total_concept_reviews

    # Update confidence distribution
    for i in range(1, 6):
        stats["confidence_distribution"][str(i)] = confidence_counts[i]

    # Add concept topics to topics list
    for topic, count in concept_topics.items():
        # Check if topic already exists in the list
        topic_exists = False
        for topic_item in stats["topics"]:
            if topic_item["name"] == topic:
                topic_item["count"] += count
                topic_exists = True
                break

        # If topic doesn't exist, add it
        if not topic_exists:
            stats["topics"].append({"name": topic, "count": count})

    # Re-sort topics by count
    stats["topics"] = sorted(stats["topics"], key=lambda x: x["count"], reverse=True)

    # Create review history (count of reviews per day)
    review_dates.sort()
    date_counts = {}
    for date_str in review_dates:
        try:
            date_obj = datetime.fromisoformat(date_str)
            date_only = date_obj.date().isoformat()
            if date_only in date_counts:
                date_counts[date_only] += 1
            else:
                date_counts[date_only] = 1
        except (ValueError, TypeError):
            continue

    stats["review_history"] = [
        {"date": date, "count": count}
        for date, count in sorted(date_counts.items())
    ]

    return stats

# Add these routes for resource reviews
@router.post("/", response_model=ResourceReview, status_code=status.HTTP_201_CREATED)
async def create_review(
    review: ResourceReviewCreate,
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

        user = await db.users.find_one({"username": username})
        if not user or "reviews" not in user:
            return []

        return user["reviews"]
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

        user = await db.users.find_one({"username": username})
        if not user or "reviews" not in user:
            return []

        # Filter reviews by resource type and ID
        reviews = [
            review for review in user["reviews"]
            if review.get("resource_type") == resource_type and review.get("resource_id") == resource_id
        ]

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

        # Get user and find review
        user = await db.users.find_one({"username": username})
        if not user or "reviews" not in user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reviews not found"
            )

        reviews = user["reviews"]
        review_index = None

        for i, review in enumerate(reviews):
            if review.get("id") == review_id:
                review_index = i
                break

        if review_index is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Review with ID {review_id} not found"
            )

        # Update review
        update_data = review_update.model_dump()
        for key, value in update_data.items():
            reviews[review_index][key] = value

        # Update date
        reviews[review_index]["date"] = datetime.now().isoformat()

        # Save updated reviews
        result = await db.users.update_one(
            {"username": username},
            {"$set": {"reviews": reviews}}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update review"
            )

        return reviews[review_index]
    except Exception as e:
        logger.error(f"Error in update_review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update review: {str(e)}"
        )

@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: str,
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

        result = await db.users.update_one(
            {"username": username},
            {"$pull": {"reviews": {"id": review_id}}}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Review with ID {review_id} not found"
            )
    except Exception as e:
        logger.error(f"Error in delete_review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete review: {str(e)}"
        )

@router.post("/concepts/batch", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_concepts_batch(
    concepts_batch: ConceptBatchCreate,
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