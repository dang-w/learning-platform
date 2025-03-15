from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import json
from dotenv import load_dotenv
import motor.motor_asyncio

# Load environment variables
load_dotenv()

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.learning_platform_db

# Create router
router = APIRouter()

# Import authentication functions from main
# This will be imported in main.py after the router is created
# to avoid circular imports
from main import get_current_active_user, User

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
    # Generate a unique ID for the concept
    concept_id = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{concept.title.lower().replace(' ', '_')}"

    # Create concept object
    concept_dict = concept.dict()
    concept_dict["id"] = concept_id
    concept_dict["reviews"] = []
    concept_dict["next_review"] = None

    # Add to user's concepts
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$push": {"concepts": concept_dict}}
    )

    if result.modified_count == 0:
        # If the concepts array doesn't exist yet, create it
        result = await db.users.update_one(
            {"username": current_user.username},
            {"$set": {"concepts": [concept_dict]}}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create concept"
            )

    return concept_dict

@router.get("/concepts", response_model=List[Concept])
async def get_concepts(
    topic: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get all concepts with optional topic filtering."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "concepts" not in user:
        return []

    concepts = user["concepts"]

    # Filter by topic if specified
    if topic:
        concepts = [
            c for c in concepts
            if any(t.lower() == topic.lower() for t in c.get("topics", []))
        ]

    return concepts

@router.get("/concepts/{concept_id}", response_model=Concept)
async def get_concept(
    concept_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific concept by ID."""
    user = await db.users.find_one({"username": current_user.username})
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
    user = await db.users.find_one({"username": current_user.username})
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
    update_data = {k: v for k, v in concept_update.dict().items() if v is not None}
    for key, value in update_data.items():
        concepts[concept_index][key] = value

    # Save updated concepts
    result = await db.users.update_one(
        {"username": current_user.username},
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
    result = await db.users.update_one(
        {"username": current_user.username},
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
    # Validate confidence level
    if not (1 <= review_data.confidence <= 5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confidence level must be between 1 and 5"
        )

    user = await db.users.find_one({"username": current_user.username})
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
        {"username": current_user.username},
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
    user = await db.users.find_one({"username": current_user.username})
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
    user = await db.users.find_one({"username": current_user.username})
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
    user = await db.users.find_one({"username": current_user.username})
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
    user = await db.users.find_one({"username": current_user.username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    reviews = user.get("reviews", [])

    # Initialize statistics
    stats = {
        "total_reviews": len(reviews),
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
        "confidence_distribution": {str(i): 0 for i in range(1, 6)}
    }

    if not reviews:
        return stats

    # Calculate statistics
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

    # Calculate averages
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

    return stats

# Add these routes for resource reviews
@router.post("/", response_model=ResourceReview, status_code=status.HTTP_201_CREATED)
async def create_review(
    review: ResourceReviewCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new resource review."""
    # Check if user exists
    user = await db.users.find_one({"username": current_user.username})
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
    review_dict = review.dict()
    review_dict["id"] = f"review_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    review_dict["user_id"] = current_user.username
    review_dict["date"] = datetime.now().isoformat()

    # Add to user's reviews
    try:
        result = await db.users.update_one(
            {"username": current_user.username},
            {"$push": {"reviews": review_dict}}
        )

        if result.modified_count == 0:
            # If the reviews array doesn't exist yet, create it
            result = await db.users.update_one(
                {"username": current_user.username},
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

@router.get("/", response_model=List[ResourceReview])
async def get_reviews(
    current_user: User = Depends(get_current_active_user)
):
    """Get all reviews created by the user."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "reviews" not in user:
        return []

    return user["reviews"]

@router.get("/resource/{resource_type}/{resource_id}", response_model=List[ResourceReview])
async def get_reviews_by_resource(
    resource_type: str,
    resource_id: int,
    current_user: User = Depends(get_current_active_user)
):
    """Get reviews for a specific resource."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "reviews" not in user:
        return []

    # Filter reviews by resource type and ID
    reviews = [
        review for review in user["reviews"]
        if review.get("resource_type") == resource_type and review.get("resource_id") == resource_id
    ]

    return reviews

@router.put("/{review_id}", response_model=ResourceReview)
async def update_review(
    review_id: str,
    review_update: ResourceReviewCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Update a review."""
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
    user = await db.users.find_one({"username": current_user.username})
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
    update_data = review_update.dict()
    for key, value in update_data.items():
        reviews[review_index][key] = value

    # Update date
    reviews[review_index]["date"] = datetime.now().isoformat()

    # Save updated reviews
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$set": {"reviews": reviews}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update review"
        )

    return reviews[review_index]

@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a review."""
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$pull": {"reviews": {"id": review_id}}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review with ID {review_id} not found"
        )