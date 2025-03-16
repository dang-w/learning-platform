import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime, timedelta
from main import app, get_current_user, get_current_active_user, oauth2_scheme, User

@pytest.mark.asyncio
async def test_get_concepts(client, test_db, auth_headers):
    """Test getting all concepts."""
    # Set up authentication dependencies
    # Define mock functions
    async def mock_get_current_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    async def mock_get_current_active_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    # Set up the dependency overrides
    app.dependency_overrides[oauth2_scheme] = lambda: "test_token"
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user

    try:
        # Debug: Check if the test user exists
        user_before = await test_db.users.find_one({"username": "testuser"})
        print(f"User before update: {user_before}")

        # Create the test user if it doesn't exist
        if not user_before:
            user_data = {
                "username": "testuser",
                "email": "test@example.com",
                "full_name": "Test User",
                "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
                "disabled": False,
                "resources": [],
                "study_sessions": [],
                "review_sessions": [],
                "learning_paths": [],
                "reviews": [],
                "concepts": []
            }
            await test_db.users.insert_one(user_data)
            print(f"Created test user: {user_data['username']}")

        # Insert test concepts into the user document
        concepts = [
            {
                "id": "20240101000001_neural_networks",
                "title": "Neural Networks",
                "content": "Neural networks are a set of algorithms...",
                "topics": ["Deep Learning", "AI"],
                "reviews": [],
                "next_review": None,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            },
            {
                "id": "20240101000002_reinforcement_learning",
                "title": "Reinforcement Learning",
                "content": "Reinforcement learning is a type of machine learning...",
                "topics": ["RL", "AI"],
                "reviews": [],
                "next_review": None,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
        ]

        # Update the user document with the concepts
        result = await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"concepts": concepts}}
        )
        print(f"Update result: {result.modified_count} documents modified")

        # Debug: Check if the user was updated
        user_after = await test_db.users.find_one({"username": "testuser"})
        print(f"User after update: {user_after}")

        # Debug: Check the current user from the API
        me_response = client.get("/users/me/", headers=auth_headers)
        print(f"Current user response: {me_response.status_code}")
        print(f"Current user data: {me_response.json()}")

        # Patch the database in the reviews router to use the test database
        from routers.reviews import db as reviews_db
        import sys

        # Store the original database
        original_db = reviews_db

        # Replace the database with the test database
        sys.modules['routers.reviews'].db = test_db

        try:
            # Test getting all concepts
            response = client.get("/api/reviews/concepts", headers=auth_headers)
            assert response.status_code == 200
            concepts_data = response.json()
            assert len(concepts_data) == 2
            assert concepts_data[0]["title"] == "Neural Networks"
            assert concepts_data[1]["title"] == "Reinforcement Learning"
        finally:
            # Restore the original database
            sys.modules['routers.reviews'].db = original_db
    finally:
        # Clear dependency overrides
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_create_concept(client, test_db, auth_headers):
    """Test creating a new concept."""
    # Set up authentication dependencies
    # Define mock functions
    async def mock_get_current_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    async def mock_get_current_active_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    # Set up the dependency overrides
    app.dependency_overrides[oauth2_scheme] = lambda: "test_token"
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user

    try:
        # Ensure the user exists with an empty concepts array
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"concepts": []}},
            upsert=True
        )

        # Patch the database in the reviews router to use the test database
        from routers.reviews import db as reviews_db
        import sys

        # Store the original database
        original_db = reviews_db

        # Replace the database with the test database
        sys.modules['routers.reviews'].db = test_db

        try:
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

            # Verify it was saved to the user document
            user = await test_db.users.find_one({"username": "testuser"})
            assert user is not None
            assert "concepts" in user
            assert len(user["concepts"]) == 1
            assert user["concepts"][0]["title"] == "Convolutional Neural Networks"
        finally:
            # Restore the original database
            sys.modules['routers.reviews'].db = original_db
    finally:
        # Clear dependency overrides
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_get_concept_by_id(client, test_db, auth_headers):
    """Test getting a specific concept by ID."""
    # Set up authentication dependencies
    # Define mock functions
    async def mock_get_current_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    async def mock_get_current_active_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    # Set up the dependency overrides
    app.dependency_overrides[oauth2_scheme] = lambda: "test_token"
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user

    try:
        # Insert a test concept into the user document
        concept_id = "20240101000003_recurrent_neural_networks"
        concept = {
            "id": concept_id,
            "title": "Recurrent Neural Networks",
            "content": "RNNs are a class of neural networks...",
            "topics": ["Deep Learning", "RNN"],
            "reviews": [],
            "next_review": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }

        # Update the user document with the concept
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"concepts": [concept]}},
            upsert=True
        )

        # Patch the database in the reviews router to use the test database
        from routers.reviews import db as reviews_db
        import sys

        # Store the original database
        original_db = reviews_db

        # Replace the database with the test database
        sys.modules['routers.reviews'].db = test_db

        try:
            # Test getting the concept by ID
            response = client.get(f"/api/reviews/concepts/{concept_id}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == concept_id
            assert data["title"] == "Recurrent Neural Networks"
            assert data["content"] == "RNNs are a class of neural networks..."
            assert data["topics"] == ["Deep Learning", "RNN"]
        finally:
            # Restore the original database
            sys.modules['routers.reviews'].db = original_db
    finally:
        # Clear dependency overrides
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_update_concept(client, test_db, auth_headers):
    """Test updating a concept."""
    # Set up authentication dependencies
    # Define mock functions
    async def mock_get_current_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    async def mock_get_current_active_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    # Set up the dependency overrides
    app.dependency_overrides[oauth2_scheme] = lambda: "test_token"
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user

    try:
        # Insert a test concept into the user document
        concept_id = "20240101000004_transformers"
        concept = {
            "id": concept_id,
            "title": "Transformers",
            "content": "Transformers are a type of model architecture...",
            "topics": ["NLP", "Deep Learning"],
            "reviews": [],
            "next_review": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }

        # Update the user document with the concept
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"concepts": [concept]}},
            upsert=True
        )

        # Patch the database in the reviews router to use the test database
        from routers.reviews import db as reviews_db
        import sys

        # Store the original database
        original_db = reviews_db

        # Replace the database with the test database
        sys.modules['routers.reviews'].db = test_db

        try:
            # Update the concept
            update_data = {
                "title": "Transformer Architecture",
                "content": "Transformers are a type of model architecture that uses self-attention...",
                "topics": ["NLP", "Deep Learning", "Attention Mechanism"]
            }

            response = client.put(f"/api/reviews/concepts/{concept_id}", json=update_data, headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["title"] == "Transformer Architecture"
            assert data["content"] == "Transformers are a type of model architecture that uses self-attention..."
            assert data["topics"] == ["NLP", "Deep Learning", "Attention Mechanism"]

            # Verify it was updated in the user document
            user = await test_db.users.find_one({"username": "testuser"})
            assert user is not None
            assert "concepts" in user
            assert len(user["concepts"]) == 1
            assert user["concepts"][0]["title"] == "Transformer Architecture"
            assert user["concepts"][0]["topics"] == ["NLP", "Deep Learning", "Attention Mechanism"]
        finally:
            # Restore the original database
            sys.modules['routers.reviews'].db = original_db
    finally:
        # Clear dependency overrides
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_delete_concept(client, test_db, auth_headers):
    """Test deleting a concept."""
    # Set up authentication dependencies
    # Define mock functions
    async def mock_get_current_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    async def mock_get_current_active_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    # Set up the dependency overrides
    app.dependency_overrides[oauth2_scheme] = lambda: "test_token"
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user

    try:
        # Insert a test concept into the user document
        concept_id = "20240101000005_lstm_networks"
        concept = {
            "id": concept_id,
            "title": "LSTM Networks",
            "content": "Long Short-Term Memory networks...",
            "topics": ["Deep Learning", "RNN"],
            "reviews": [],
            "next_review": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }

        # Update the user document with the concept
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"concepts": [concept]}},
            upsert=True
        )

        # Patch the database in the reviews router to use the test database
        from routers.reviews import db as reviews_db
        import sys

        # Store the original database
        original_db = reviews_db

        # Replace the database with the test database
        sys.modules['routers.reviews'].db = test_db

        try:
            # Delete the concept
            response = client.delete(f"/api/reviews/concepts/{concept_id}", headers=auth_headers)
            assert response.status_code == 204

            # Verify it was deleted from the user document
            user = await test_db.users.find_one({"username": "testuser"})
            assert user is not None
            assert "concepts" in user
            assert len(user["concepts"]) == 0
        finally:
            # Restore the original database
            sys.modules['routers.reviews'].db = original_db
    finally:
        # Clear dependency overrides
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_review_concept(client, test_db, auth_headers):
    """Test reviewing a concept."""
    # Set up authentication dependencies
    # Define mock functions
    async def mock_get_current_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    async def mock_get_current_active_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    # Set up the dependency overrides
    app.dependency_overrides[oauth2_scheme] = lambda: "test_token"
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user

    try:
        # Insert a test concept into the user document
        concept_id = "20240101000006_backpropagation"
        concept = {
            "id": concept_id,
            "title": "Backpropagation",
            "content": "Backpropagation is an algorithm used to train neural networks...",
            "topics": ["Deep Learning", "Neural Networks"],
            "reviews": [],
            "next_review": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }

        # Update the user document with the concept
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"concepts": [concept]}},
            upsert=True
        )

        # Patch the database in the reviews router to use the test database
        from routers.reviews import db as reviews_db
        import sys

        # Store the original database
        original_db = reviews_db

        # Replace the database with the test database
        sys.modules['routers.reviews'].db = test_db

        try:
            # Review the concept
            review_data = {
                "confidence": 4
            }

            response = client.post(f"/api/reviews/concepts/{concept_id}/review", json=review_data, headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == concept_id
            assert len(data["reviews"]) == 1
            assert data["reviews"][0]["confidence"] == 4
            assert data["next_review"] is not None

            # Verify it was updated in the user document
            user = await test_db.users.find_one({"username": "testuser"})
            assert user is not None
            assert "concepts" in user
            assert len(user["concepts"]) == 1
            assert len(user["concepts"][0]["reviews"]) == 1
            assert user["concepts"][0]["reviews"][0]["confidence"] == 4
            assert user["concepts"][0]["next_review"] is not None
        finally:
            # Restore the original database
            sys.modules['routers.reviews'].db = original_db
    finally:
        # Clear dependency overrides
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_get_due_concepts(client, test_db, auth_headers):
    """Test getting concepts due for review."""
    # Set up authentication dependencies
    # Define mock functions
    async def mock_get_current_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    async def mock_get_current_active_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    # Set up the dependency overrides
    app.dependency_overrides[oauth2_scheme] = lambda: "test_token"
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user

    try:
        # Insert test concepts with different review dates
        now = datetime.now()

        # Concept due for review (past date)
        past_concept_id = "20240101000007_past_due_concept"
        past_concept = {
            "id": past_concept_id,
            "title": "Past Due Concept",
            "content": "This concept is past due for review...",
            "topics": ["Test"],
            "reviews": [
                {
                    "date": (now - timedelta(days=10)).isoformat(),
                    "confidence": 3
                }
            ],
            "next_review": (now - timedelta(days=1)).isoformat(),
            "created_at": (now - timedelta(days=20)).isoformat(),
            "updated_at": (now - timedelta(days=10)).isoformat()
        }

        # Concept not due for review (future date)
        future_concept_id = "20240101000008_future_due_concept"
        future_concept = {
            "id": future_concept_id,
            "title": "Future Due Concept",
            "content": "This concept is due for review in the future...",
            "topics": ["Test"],
            "reviews": [
                {
                    "date": (now - timedelta(days=1)).isoformat(),
                    "confidence": 5
                }
            ],
            "next_review": (now + timedelta(days=7)).isoformat(),
            "created_at": (now - timedelta(days=10)).isoformat(),
            "updated_at": (now - timedelta(days=1)).isoformat()
        }

        # Update the user document with the concepts
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"concepts": [past_concept, future_concept]}},
            upsert=True
        )

        # Patch the database in the reviews router to use the test database
        from routers.reviews import db as reviews_db
        import sys

        # Store the original database
        original_db = reviews_db

        # Replace the database with the test database
        sys.modules['routers.reviews'].db = test_db

        try:
            # Test getting due concepts
            response = client.get("/api/reviews/due", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["id"] == past_concept_id
            assert data[0]["title"] == "Past Due Concept"
        finally:
            # Restore the original database
            sys.modules['routers.reviews'].db = original_db
    finally:
        # Clear dependency overrides
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_get_review_statistics(client, test_db, auth_headers):
    """Test getting review statistics."""
    # Set up authentication dependencies
    # Define mock functions
    async def mock_get_current_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    async def mock_get_current_active_user():
        # Return a User object to match the implementation in reviews.py
        return User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            disabled=False
        )

    # Set up the dependency overrides
    app.dependency_overrides[oauth2_scheme] = lambda: "test_token"
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user

    try:
        # Insert test concepts with reviews
        now = datetime.now()

        concepts = [
            {
                "id": "20240101000009_concept_1",
                "title": "Concept 1",
                "content": "Content 1",
                "topics": ["Topic 1", "Topic 2"],
                "reviews": [
                    {
                        "date": (now - timedelta(days=10)).isoformat(),
                        "confidence": 3
                    },
                    {
                        "date": (now - timedelta(days=5)).isoformat(),
                        "confidence": 4
                    }
                ],
                "next_review": (now + timedelta(days=2)).isoformat(),
                "created_at": (now - timedelta(days=20)).isoformat(),
                "updated_at": (now - timedelta(days=5)).isoformat()
            },
            {
                "id": "20240101000010_concept_2",
                "title": "Concept 2",
                "content": "Content 2",
                "topics": ["Topic 2", "Topic 3"],
                "reviews": [
                    {
                        "date": (now - timedelta(days=8)).isoformat(),
                        "confidence": 2
                    },
                    {
                        "date": (now - timedelta(days=4)).isoformat(),
                        "confidence": 3
                    },
                    {
                        "date": (now - timedelta(days=1)).isoformat(),
                        "confidence": 4
                    }
                ],
                "next_review": (now + timedelta(days=3)).isoformat(),
                "created_at": (now - timedelta(days=15)).isoformat(),
                "updated_at": (now - timedelta(days=1)).isoformat()
            },
            {
                "id": "20240101000011_concept_3",
                "title": "Concept 3",
                "content": "Content 3",
                "topics": ["Topic 1", "Topic 3"],
                "reviews": [],
                "next_review": None,
                "created_at": (now - timedelta(days=2)).isoformat(),
                "updated_at": (now - timedelta(days=2)).isoformat()
            }
        ]

        # Update the user document with the concepts
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"concepts": concepts}},
            upsert=True
        )

        # Patch the database in the reviews router to use the test database
        from routers.reviews import db as reviews_db
        import sys

        # Store the original database
        original_db = reviews_db

        # Replace the database with the test database
        sys.modules['routers.reviews'].db = test_db

        try:
            # Test getting review statistics
            response = client.get("/api/reviews/statistics", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()

            assert data["total_concepts"] == 3
            assert data["total_reviews"] == 5
            assert data["concepts_with_reviews"] == 2
            assert data["concepts_without_reviews"] == 1
            assert data["average_confidence"] > 0
            # Check for topics in the correct format (list of dictionaries with 'name' and 'count' keys)
            topic_names = [topic["name"] for topic in data["topics"]]
            assert "Topic 1" in topic_names
            assert "Topic 2" in topic_names
            assert "Topic 3" in topic_names
            assert len(data["review_history"]) > 0
        finally:
            # Restore the original database
            sys.modules['routers.reviews'].db = original_db
    finally:
        # Clear dependency overrides
        app.dependency_overrides.clear()