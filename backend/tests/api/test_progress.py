import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime, timedelta

@pytest.mark.asyncio
async def test_add_study_metric(client, db, auth_headers):
    """Test adding a study metric."""
    new_metric = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "study_hours": 2.5,
        "topics": ["Neural Networks", "Deep Learning"],
        "focus_score": 8,
        "notes": "Studied chapter 3 of the Deep Learning book"
    }

    response = client.post("/api/progress/metrics", json=new_metric, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["study_hours"] == 2.5
    assert data["topics"] == ["Neural Networks", "Deep Learning"]
    assert data["focus_score"] == 8
    assert data["notes"] == "Studied chapter 3 of the Deep Learning book"
    assert "id" in data

    # Verify it was saved to the database
    db_metric = await db.metrics.find_one({"_id": ObjectId(data["id"])})
    assert db_metric is not None
    assert db_metric["study_hours"] == 2.5
    assert db_metric["user_id"] == ObjectId(auth_headers["user_id"])

@pytest.mark.asyncio
async def test_get_study_metrics(client, db, auth_headers):
    """Test getting all study metrics."""
    # Insert test metrics
    today = datetime.now()
    metrics = [
        {
            "date": today.strftime("%Y-%m-%d"),
            "study_hours": 2.5,
            "topics": ["Neural Networks", "Deep Learning"],
            "focus_score": 8,
            "notes": "Studied chapter 3",
            "user_id": ObjectId(auth_headers["user_id"])
        },
        {
            "date": (today - timedelta(days=1)).strftime("%Y-%m-%d"),
            "study_hours": 1.5,
            "topics": ["Linear Algebra"],
            "focus_score": 7,
            "notes": "Reviewed matrices",
            "user_id": ObjectId(auth_headers["user_id"])
        },
        {
            "date": (today - timedelta(days=2)).strftime("%Y-%m-%d"),
            "study_hours": 3.0,
            "topics": ["Probability", "Statistics"],
            "focus_score": 9,
            "notes": "Studied Bayes theorem",
            "user_id": ObjectId(auth_headers["user_id"])
        }
    ]

    await db.metrics.insert_many(metrics)

    # Test getting all metrics
    response = client.get("/api/progress/metrics", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert data[0]["study_hours"] == 2.5
    assert data[1]["study_hours"] == 1.5
    assert data[2]["study_hours"] == 3.0

@pytest.mark.asyncio
async def test_get_metrics_with_date_range(client, db, auth_headers):
    """Test getting metrics with date range filter."""
    # Insert test metrics
    today = datetime.now()
    metrics = [
        {
            "date": today.strftime("%Y-%m-%d"),
            "study_hours": 2.5,
            "topics": ["Neural Networks"],
            "focus_score": 8,
            "notes": "Today",
            "user_id": ObjectId(auth_headers["user_id"])
        },
        {
            "date": (today - timedelta(days=7)).strftime("%Y-%m-%d"),
            "study_hours": 1.5,
            "topics": ["Linear Algebra"],
            "focus_score": 7,
            "notes": "Last week",
            "user_id": ObjectId(auth_headers["user_id"])
        },
        {
            "date": (today - timedelta(days=30)).strftime("%Y-%m-%d"),
            "study_hours": 3.0,
            "topics": ["Probability"],
            "focus_score": 9,
            "notes": "Last month",
            "user_id": ObjectId(auth_headers["user_id"])
        }
    ]

    await db.metrics.insert_many(metrics)

    # Test getting metrics with date range
    start_date = (today - timedelta(days=10)).strftime("%Y-%m-%d")
    end_date = today.strftime("%Y-%m-%d")
    response = client.get(f"/api/progress/metrics?start_date={start_date}&end_date={end_date}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2  # Should include today and 7 days ago, but not 30 days ago
    assert any(metric["notes"] == "Today" for metric in data)
    assert any(metric["notes"] == "Last week" for metric in data)
    assert not any(metric["notes"] == "Last month" for metric in data)

@pytest.mark.asyncio
async def test_delete_study_metric(client, db, auth_headers):
    """Test deleting a study metric."""
    # Insert a test metric
    metric_id = ObjectId()
    metric = {
        "_id": metric_id,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "study_hours": 2.0,
        "topics": ["Machine Learning"],
        "focus_score": 8,
        "notes": "Test metric",
        "user_id": ObjectId(auth_headers["user_id"])
    }

    await db.metrics.insert_one(metric)

    # Delete the metric
    response = client.delete(f"/api/progress/metrics/{str(metric_id)}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify it was deleted from the database
    db_metric = await db.metrics.find_one({"_id": metric_id})
    assert db_metric is None

@pytest.mark.asyncio
async def test_get_recent_metrics_summary(client, db, auth_headers):
    """Test getting recent metrics summary."""
    # Insert test metrics for different days
    today = datetime.now()
    metrics = []

    # Today
    metrics.append({
        "date": today.strftime("%Y-%m-%d"),
        "study_hours": 2.5,
        "topics": ["Neural Networks"],
        "focus_score": 8,
        "notes": "Today",
        "user_id": ObjectId(auth_headers["user_id"])
    })

    # Yesterday
    metrics.append({
        "date": (today - timedelta(days=1)).strftime("%Y-%m-%d"),
        "study_hours": 1.5,
        "topics": ["Linear Algebra"],
        "focus_score": 7,
        "notes": "Yesterday",
        "user_id": ObjectId(auth_headers["user_id"])
    })

    # Add metrics for the past week
    for i in range(2, 7):
        metrics.append({
            "date": (today - timedelta(days=i)).strftime("%Y-%m-%d"),
            "study_hours": 2.0,
            "topics": ["Topic " + str(i)],
            "focus_score": 7,
            "notes": f"Day {i}",
            "user_id": ObjectId(auth_headers["user_id"])
        })

    # Add metrics for the past month
    for i in range(7, 30):
        metrics.append({
            "date": (today - timedelta(days=i)).strftime("%Y-%m-%d"),
            "study_hours": 1.8,
            "topics": ["Topic " + str(i)],
            "focus_score": 6,
            "notes": f"Day {i}",
            "user_id": ObjectId(auth_headers["user_id"])
        })

    await db.metrics.insert_many(metrics)

    # Test getting recent metrics summary
    response = client.get("/api/progress/metrics/recent", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert "today" in data
    assert "yesterday" in data
    assert "this_week" in data
    assert "last_week" in data
    assert "this_month" in data

    assert data["today"]["study_hours"] == 2.5
    assert data["yesterday"]["study_hours"] == 1.5
    assert data["this_week"]["total_hours"] > 0
    assert data["this_month"]["total_hours"] > 0
    assert data["this_month"]["average_focus_score"] > 0
    assert len(data["this_month"]["top_topics"]) > 0

@pytest.mark.asyncio
async def test_get_weekly_report(client, db, auth_headers):
    """Test getting weekly report."""
    # Insert test metrics for different weeks
    today = datetime.now()
    this_week_start = today - timedelta(days=today.weekday())
    last_week_start = this_week_start - timedelta(days=7)

    metrics = []

    # This week
    for i in range(3):  # Add 3 days for this week
        metrics.append({
            "date": (this_week_start + timedelta(days=i)).strftime("%Y-%m-%d"),
            "study_hours": 2.0,
            "topics": ["Neural Networks", "Deep Learning"],
            "focus_score": 8,
            "notes": f"This week day {i}",
            "user_id": ObjectId(auth_headers["user_id"])
        })

    # Last week
    for i in range(5):  # Add 5 days for last week
        metrics.append({
            "date": (last_week_start + timedelta(days=i)).strftime("%Y-%m-%d"),
            "study_hours": 1.5,
            "topics": ["Linear Algebra", "Calculus"],
            "focus_score": 7,
            "notes": f"Last week day {i}",
            "user_id": ObjectId(auth_headers["user_id"])
        })

    await db.metrics.insert_many(metrics)

    # Test getting weekly report
    response = client.get("/api/progress/report/weekly", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert "this_week" in data
    assert "last_week" in data
    assert "comparison" in data

    assert data["this_week"]["total_hours"] == 6.0  # 3 days * 2.0 hours
    assert data["last_week"]["total_hours"] == 7.5  # 5 days * 1.5 hours

    assert "study_days" in data["this_week"]
    assert "average_focus" in data["this_week"]
    assert "top_topics" in data["this_week"]

    assert "hours_change" in data["comparison"]
    assert "focus_change" in data["comparison"]
    assert "consistency_change" in data["comparison"]

@pytest.mark.asyncio
async def test_get_study_metrics_by_topic(client, db, auth_headers):
    """Test getting study metrics filtered by topic."""
    # Insert test metrics with different topics
    today = datetime.now()
    metrics = [
        {
            "date": today.strftime("%Y-%m-%d"),
            "study_hours": 2.5,
            "topics": ["Neural Networks", "Deep Learning"],
            "focus_score": 8,
            "notes": "NN study",
            "user_id": ObjectId(auth_headers["user_id"])
        },
        {
            "date": (today - timedelta(days=1)).strftime("%Y-%m-%d"),
            "study_hours": 1.5,
            "topics": ["Neural Networks", "Computer Vision"],
            "focus_score": 7,
            "notes": "CNN study",
            "user_id": ObjectId(auth_headers["user_id"])
        },
        {
            "date": (today - timedelta(days=2)).strftime("%Y-%m-%d"),
            "study_hours": 3.0,
            "topics": ["Reinforcement Learning"],
            "focus_score": 9,
            "notes": "RL study",
            "user_id": ObjectId(auth_headers["user_id"])
        }
    ]

    await db.metrics.insert_many(metrics)

    # Test getting metrics filtered by topic
    response = client.get("/api/progress/metrics?topic=Neural%20Networks", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2  # Should include the first two metrics
    assert all("Neural Networks" in metric["topics"] for metric in data)

    # Test getting metrics filtered by a different topic
    response = client.get("/api/progress/metrics?topic=Reinforcement%20Learning", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1  # Should include only the third metric
    assert data[0]["notes"] == "RL study"