import pytest
from datetime import datetime, timedelta

def test_get_progress_empty(client, auth_headers, test_db):
    """Test getting progress when there is none."""
    response = client.get(
        "/api/progress/",
        headers=auth_headers,
    )
    assert response.status_code == 200
    progress = response.json()
    assert "metrics" in progress
    assert "reviews" in progress
    assert len(progress["metrics"]) == 0
    assert len(progress["reviews"]) == 0

def test_add_study_session(client, auth_headers, test_db):
    """Test adding a study session."""
    # Add a study session
    session_data = {
        "date": datetime.now().isoformat(),
        "duration": 60,  # minutes
        "topics": ["python", "machine learning"],
        "resources": [
            {"type": "article", "id": 1, "title": "Test Article"}
        ],
        "notes": "Productive session"
    }

    response = client.post(
        "/api/progress/study-session",
        json=session_data,
        headers=auth_headers,
    )

    assert response.status_code == 201
    created_session = response.json()
    assert created_session["duration"] == 60
    assert created_session["topics"] == ["python", "machine learning"]
    assert len(created_session["resources"]) == 1
    assert created_session["notes"] == "Productive session"

def test_get_study_sessions(client, auth_headers, test_db):
    """Test getting study sessions."""
    # Add a study session first
    session_data = {
        "date": datetime.now().isoformat(),
        "duration": 60,
        "topics": ["python"],
        "resources": [],
        "notes": "Test session"
    }

    client.post(
        "/api/progress/study-session",
        json=session_data,
        headers=auth_headers,
    )

    # Get study sessions
    response = client.get(
        "/api/progress/study-sessions",
        headers=auth_headers,
    )

    assert response.status_code == 200
    sessions = response.json()
    assert len(sessions) == 1
    assert sessions[0]["duration"] == 60
    assert sessions[0]["topics"] == ["python"]
    assert sessions[0]["notes"] == "Test session"

def test_get_study_sessions_with_date_filter(client, auth_headers, test_db):
    """Test getting study sessions with date filter."""
    # Add study sessions on different dates
    yesterday = (datetime.now() - timedelta(days=1)).isoformat()
    today = datetime.now().isoformat()

    session1 = {
        "date": yesterday,
        "duration": 60,
        "topics": ["python"],
        "resources": [],
        "notes": "Yesterday's session"
    }

    session2 = {
        "date": today,
        "duration": 90,
        "topics": ["javascript"],
        "resources": [],
        "notes": "Today's session"
    }

    client.post("/api/progress/study-session", json=session1, headers=auth_headers)
    client.post("/api/progress/study-session", json=session2, headers=auth_headers)

    # Get today's sessions
    today_date = datetime.now().strftime("%Y-%m-%d")
    response = client.get(
        f"/api/progress/study-sessions?date={today_date}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    sessions = response.json()
    assert len(sessions) == 1
    assert sessions[0]["notes"] == "Today's session"

def test_add_review_session(client, auth_headers, test_db):
    """Test adding a review session."""
    # Add a review session
    review_data = {
        "date": datetime.now().isoformat(),
        "topics": ["python", "machine learning"],
        "confidence": 4,
        "notes": "Good review session"
    }

    response = client.post(
        "/api/progress/review",
        json=review_data,
        headers=auth_headers,
    )

    assert response.status_code == 201
    created_review = response.json()
    assert created_review["topics"] == ["python", "machine learning"]
    assert created_review["confidence"] == 4
    assert created_review["notes"] == "Good review session"

def test_get_review_sessions(client, auth_headers, test_db):
    """Test getting review sessions."""
    # Add a review session first
    review_data = {
        "date": datetime.now().isoformat(),
        "topics": ["python"],
        "confidence": 3,
        "notes": "Test review"
    }

    client.post(
        "/api/progress/review",
        json=review_data,
        headers=auth_headers,
    )

    # Get review sessions
    response = client.get(
        "/api/progress/reviews",
        headers=auth_headers,
    )

    assert response.status_code == 200
    reviews = response.json()
    assert len(reviews) == 1
    assert reviews[0]["topics"] == ["python"]
    assert reviews[0]["confidence"] == 3
    assert reviews[0]["notes"] == "Test review"

def test_get_progress_summary(client, auth_headers, test_db):
    """Test getting progress summary."""
    # Add study sessions
    session1 = {
        "date": (datetime.now() - timedelta(days=2)).isoformat(),
        "duration": 60,
        "topics": ["python"],
        "resources": [],
        "notes": "Session 1"
    }

    session2 = {
        "date": datetime.now().isoformat(),
        "duration": 90,
        "topics": ["python", "machine learning"],
        "resources": [],
        "notes": "Session 2"
    }

    client.post("/api/progress/study-session", json=session1, headers=auth_headers)
    client.post("/api/progress/study-session", json=session2, headers=auth_headers)

    # Add review session
    review = {
        "date": datetime.now().isoformat(),
        "topics": ["python"],
        "confidence": 4,
        "notes": "Review"
    }

    client.post("/api/progress/review", json=review, headers=auth_headers)

    # Get progress summary
    response = client.get(
        "/api/progress/summary",
        headers=auth_headers,
    )

    assert response.status_code == 200
    summary = response.json()

    assert summary["total_study_time"] == 150  # 60 + 90
    assert summary["total_study_sessions"] == 2
    assert summary["total_reviews"] == 1
    assert "average_confidence" in summary
    assert "topics" in summary
    assert "python" in summary["topics"]
    assert summary["topics"]["python"]["study_time"] == 150

def test_get_recommended_reviews(client, auth_headers, test_db):
    """Test getting recommended reviews."""
    # Add study sessions for different topics
    session1 = {
        "date": (datetime.now() - timedelta(days=10)).isoformat(),
        "duration": 60,
        "topics": ["python"],
        "resources": [],
        "notes": "Old Python session"
    }

    session2 = {
        "date": datetime.now().isoformat(),
        "duration": 90,
        "topics": ["javascript"],
        "resources": [],
        "notes": "Recent JavaScript session"
    }

    client.post("/api/progress/study-session", json=session1, headers=auth_headers)
    client.post("/api/progress/study-session", json=session2, headers=auth_headers)

    # Get recommended reviews
    response = client.get(
        "/api/progress/recommended-reviews",
        headers=auth_headers,
    )

    assert response.status_code == 200
    recommendations = response.json()

    # Python should be recommended for review since it's older
    assert len(recommendations) > 0
    python_rec = next((r for r in recommendations if "python" in r["topic"]), None)
    assert python_rec is not None