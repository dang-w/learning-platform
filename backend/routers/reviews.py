from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import json

from main import get_current_active_user, User, db

router = APIRouter()

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
    """Get statistics about the review system."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "concepts" not in user:
        return {
            "total_concepts": 0,
            "reviewed_concepts": 0,
            "due_reviews": 0,
            "new_concepts": 0,
            "review_counts": {},
            "average_confidence": 0,
            "review_history": {
                "last_7_days": 0,
                "last_30_days": 0,
                "all_time": 0
            },
            "confidence_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        }

    concepts = user["concepts"]
    now = datetime.now()

    # Initialize statistics
    stats = {
        "total_concepts": len(concepts),
        "reviewed_concepts": 0,
        "due_reviews": 0,
        "new_concepts": 0,
        "review_counts": {},
        "average_confidence": 0,
        "review_history": {
            "last_7_days": 0,
            "last_30_days": 0,
            "all_time": 0
        },
        "confidence_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    }

    # Count reviews by confidence level
    total_confidence = 0
    total_reviews = 0

    # Calculate time thresholds
    last_7_days = (now - timedelta(days=7)).isoformat()
    last_30_days = (now - timedelta(days=30)).isoformat()

    for concept in concepts:
        reviews = concept.get("reviews", [])
        review_count = len(reviews)

        # Count reviewed vs new concepts
        if review_count > 0:
            stats["reviewed_concepts"] += 1

            # Count by review count
            if review_count not in stats["review_counts"]:
                stats["review_counts"][review_count] = 0
            stats["review_counts"][review_count] += 1
        else:
            stats["new_concepts"] += 1

        # Count due reviews
        if concept.get("next_review") and concept.get("next_review") <= now.isoformat():
            stats["due_reviews"] += 1

        # Process individual reviews
        for review in reviews:
            total_reviews += 1

            # Count by confidence
            confidence = review.get("confidence", 3)
            stats["confidence_distribution"][confidence] += 1
            total_confidence += confidence

            # Count by time period
            review_date = review.get("date", "")
            if review_date >= last_7_days:
                stats["review_history"]["last_7_days"] += 1
            if review_date >= last_30_days:
                stats["review_history"]["last_30_days"] += 1

    # Calculate average confidence
    stats["review_history"]["all_time"] = total_reviews
    if total_reviews > 0:
        stats["average_confidence"] = total_confidence / total_reviews

    return stats