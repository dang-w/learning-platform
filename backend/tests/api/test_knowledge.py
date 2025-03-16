import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime, timedelta

@pytest.mark.asyncio
async def test_get_concepts(client, db, auth_headers):
    """Test getting all concepts."""
    # Insert test concepts
    concepts = [
        {
            "title": "Neural Networks",
            "content": "Neural networks are a set of algorithms...",
            "topics": ["Deep Learning", "AI"],
            "reviews": [],
            "next_review": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "user_id": ObjectId(auth_headers["user_id"])
        },
        {
            "title": "Reinforcement Learning",
            "content": "Reinforcement learning is a type of machine learning...",
            "topics": ["RL", "AI"],
            "reviews": [],
            "next_review": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "user_id": ObjectId(auth_headers["user_id"])
        }
    ]

    await db.concepts.insert_many(concepts)

    # Test getting all concepts
    response = client.get("/api/reviews/concepts", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "Neural Networks"
    assert data[1]["title"] == "Reinforcement Learning"

@pytest.mark.asyncio
async def test_create_concept(client, db, auth_headers):
    """Test creating a new concept."""
    new_concept = {
        "title": "Convolutional Neural Networks",
        "content": "CNNs are a class of deep neural networks...",
        "topics": ["Deep Learning", "CNN", "Computer Vision"]
    }

    response = client.post("/api/reviews/concepts", json=new_concept, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Convolutional Neural Networks"
    assert data["content"] == "CNNs are a class of deep neural networks..."
    assert data["topics"] == ["Deep Learning", "CNN", "Computer Vision"]
    assert "id" in data
    assert data["reviews"] == []
    assert data["next_review"] is None

    # Verify it was saved to the database
    db_concept = await db.concepts.find_one({"_id": ObjectId(data["id"])})
    assert db_concept is not None
    assert db_concept["title"] == "Convolutional Neural Networks"
    assert db_concept["user_id"] == ObjectId(auth_headers["user_id"])

@pytest.mark.asyncio
async def test_get_concept_by_id(client, db, auth_headers):
    """Test getting a specific concept by ID."""
    # Insert a test concept
    concept_id = ObjectId()
    concept = {
        "_id": concept_id,
        "title": "Recurrent Neural Networks",
        "content": "RNNs are a class of neural networks...",
        "topics": ["Deep Learning", "RNN"],
        "reviews": [],
        "next_review": None,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "user_id": ObjectId(auth_headers["user_id"])
    }

    await db.concepts.insert_one(concept)

    # Test getting the concept by ID
    response = client.get(f"/api/reviews/concepts/{str(concept_id)}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(concept_id)
    assert data["title"] == "Recurrent Neural Networks"
    assert data["content"] == "RNNs are a class of neural networks..."
    assert data["topics"] == ["Deep Learning", "RNN"]

@pytest.mark.asyncio
async def test_update_concept(client, db, auth_headers):
    """Test updating a concept."""
    # Insert a test concept
    concept_id = ObjectId()
    concept = {
        "_id": concept_id,
        "title": "Transformers",
        "content": "Transformers are a type of model architecture...",
        "topics": ["NLP", "Deep Learning"],
        "reviews": [],
        "next_review": None,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "user_id": ObjectId(auth_headers["user_id"])
    }

    await db.concepts.insert_one(concept)

    # Update the concept
    update_data = {
        "title": "Transformer Architecture",
        "content": "Transformers are a type of model architecture that uses self-attention...",
        "topics": ["NLP", "Deep Learning", "Attention Mechanism"]
    }

    response = client.put(f"/api/reviews/concepts/{str(concept_id)}", json=update_data, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Transformer Architecture"
    assert data["content"] == "Transformers are a type of model architecture that uses self-attention..."
    assert data["topics"] == ["NLP", "Deep Learning", "Attention Mechanism"]

    # Verify it was updated in the database
    db_concept = await db.concepts.find_one({"_id": concept_id})
    assert db_concept["title"] == "Transformer Architecture"
    assert db_concept["topics"] == ["NLP", "Deep Learning", "Attention Mechanism"]

@pytest.mark.asyncio
async def test_delete_concept(client, db, auth_headers):
    """Test deleting a concept."""
    # Insert a test concept
    concept_id = ObjectId()
    concept = {
        "_id": concept_id,
        "title": "LSTM Networks",
        "content": "Long Short-Term Memory networks...",
        "topics": ["Deep Learning", "RNN"],
        "reviews": [],
        "next_review": None,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "user_id": ObjectId(auth_headers["user_id"])
    }

    await db.concepts.insert_one(concept)

    # Delete the concept
    response = client.delete(f"/api/reviews/concepts/{str(concept_id)}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify it was deleted from the database
    db_concept = await db.concepts.find_one({"_id": concept_id})
    assert db_concept is None

@pytest.mark.asyncio
async def test_review_concept(client, db, auth_headers):
    """Test reviewing a concept."""
    # Insert a test concept
    concept_id = ObjectId()
    concept = {
        "_id": concept_id,
        "title": "Backpropagation",
        "content": "Backpropagation is an algorithm used to train neural networks...",
        "topics": ["Deep Learning", "Neural Networks"],
        "reviews": [],
        "next_review": None,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "user_id": ObjectId(auth_headers["user_id"])
    }

    await db.concepts.insert_one(concept)

    # Review the concept
    review_data = {
        "confidence": 4
    }

    response = client.post(f"/api/reviews/concepts/{str(concept_id)}/review", json=review_data, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(concept_id)
    assert len(data["reviews"]) == 1
    assert data["reviews"][0]["confidence"] == 4
    assert data["next_review"] is not None

    # Verify it was updated in the database
    db_concept = await db.concepts.find_one({"_id": concept_id})
    assert len(db_concept["reviews"]) == 1
    assert db_concept["reviews"][0]["confidence"] == 4
    assert db_concept["next_review"] is not None

@pytest.mark.asyncio
async def test_get_due_concepts(client, db, auth_headers):
    """Test getting concepts due for review."""
    # Insert test concepts with different review dates
    now = datetime.now()

    # Concept due for review (past date)
    past_concept_id = ObjectId()
    past_concept = {
        "_id": past_concept_id,
        "title": "Past Due Concept",
        "content": "This concept is past due for review...",
        "topics": ["Test"],
        "reviews": [
            {
                "date": now - timedelta(days=10),
                "confidence": 3
            }
        ],
        "next_review": now - timedelta(days=1),
        "created_at": now - timedelta(days=20),
        "updated_at": now - timedelta(days=10),
        "user_id": ObjectId(auth_headers["user_id"])
    }

    # Concept not due for review (future date)
    future_concept_id = ObjectId()
    future_concept = {
        "_id": future_concept_id,
        "title": "Future Due Concept",
        "content": "This concept is due for review in the future...",
        "topics": ["Test"],
        "reviews": [
            {
                "date": now - timedelta(days=1),
                "confidence": 5
            }
        ],
        "next_review": now + timedelta(days=7),
        "created_at": now - timedelta(days=10),
        "updated_at": now - timedelta(days=1),
        "user_id": ObjectId(auth_headers["user_id"])
    }

    await db.concepts.insert_many([past_concept, future_concept])

    # Test getting due concepts
    response = client.get("/api/reviews/due", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == str(past_concept_id)
    assert data[0]["title"] == "Past Due Concept"

@pytest.mark.asyncio
async def test_get_review_statistics(client, db, auth_headers):
    """Test getting review statistics."""
    # Insert test concepts with reviews
    now = datetime.now()

    concepts = [
        {
            "title": "Concept 1",
            "content": "Content 1",
            "topics": ["Topic 1", "Topic 2"],
            "reviews": [
                {
                    "date": now - timedelta(days=10),
                    "confidence": 3
                },
                {
                    "date": now - timedelta(days=5),
                    "confidence": 4
                }
            ],
            "next_review": now + timedelta(days=2),
            "created_at": now - timedelta(days=20),
            "updated_at": now - timedelta(days=5),
            "user_id": ObjectId(auth_headers["user_id"])
        },
        {
            "title": "Concept 2",
            "content": "Content 2",
            "topics": ["Topic 2", "Topic 3"],
            "reviews": [
                {
                    "date": now - timedelta(days=8),
                    "confidence": 2
                },
                {
                    "date": now - timedelta(days=4),
                    "confidence": 3
                },
                {
                    "date": now - timedelta(days=1),
                    "confidence": 4
                }
            ],
            "next_review": now + timedelta(days=3),
            "created_at": now - timedelta(days=15),
            "updated_at": now - timedelta(days=1),
            "user_id": ObjectId(auth_headers["user_id"])
        },
        {
            "title": "Concept 3",
            "content": "Content 3",
            "topics": ["Topic 1", "Topic 3"],
            "reviews": [],
            "next_review": None,
            "created_at": now - timedelta(days=2),
            "updated_at": now - timedelta(days=2),
            "user_id": ObjectId(auth_headers["user_id"])
        }
    ]

    await db.concepts.insert_many(concepts)

    # Test getting review statistics
    response = client.get("/api/reviews/statistics", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["total_concepts"] == 3
    assert data["total_reviews"] == 5
    assert data["concepts_with_reviews"] == 2
    assert data["concepts_without_reviews"] == 1
    assert data["average_confidence"] > 0
    assert "Topic 1" in data["topics"]
    assert "Topic 2" in data["topics"]
    assert "Topic 3" in data["topics"]
    assert len(data["review_history"]) > 0