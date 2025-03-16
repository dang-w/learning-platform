import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime, timedelta
import routers.progress

@pytest.mark.asyncio
async def test_add_study_metric(client, test_db, auth_headers, mock_auth_dependencies):
    """Test adding a study metric."""
    # Patch the router's database with the test database
    original_db = routers.progress.db
    routers.progress.db = test_db

    try:
        # Ensure user exists with empty metrics array
        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"metrics": []}},
            upsert=True
        )

        new_metric = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "study_hours": 2.5,
            "topics": "Neural Networks,Deep Learning",
            "focus_score": 8,
            "notes": "Studied chapter 3 of the Deep Learning book"
        }

        response = client.post("/api/progress/metrics", json=new_metric, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["study_hours"] == 2.5
        assert data["topics"] == "Neural Networks,Deep Learning"
        assert data["focus_score"] == 8
        assert data["notes"] == "Studied chapter 3 of the Deep Learning book"
        assert "id" in data

        # Verify it was saved to the user's metrics array
        user = await test_db.users.find_one({"username": "testuser"})
        assert user is not None
        assert "metrics" in user
        assert len(user["metrics"]) == 1
        assert user["metrics"][0]["study_hours"] == 2.5
        assert user["metrics"][0]["id"] == data["id"]
    finally:
        # Restore the original database
        routers.progress.db = original_db

@pytest.mark.asyncio
async def test_get_study_metrics(client, test_db, auth_headers, mock_auth_dependencies):
    """Test getting all study metrics."""
    # Patch the router's database with the test database
    original_db = routers.progress.db
    routers.progress.db = test_db

    try:
        # Insert test metrics into user document
        today = datetime.now()
        metrics = [
            {
                "id": f"{today.strftime('%Y-%m-%d')}_123456",
                "date": today.strftime("%Y-%m-%d"),
                "study_hours": 2.5,
                "topics": "Neural Networks,Deep Learning",
                "focus_score": 8,
                "notes": "Studied chapter 3"
            },
            {
                "id": f"{(today - timedelta(days=1)).strftime('%Y-%m-%d')}_123457",
                "date": (today - timedelta(days=1)).strftime("%Y-%m-%d"),
                "study_hours": 1.5,
                "topics": "Linear Algebra",
                "focus_score": 7,
                "notes": "Reviewed matrices"
            },
            {
                "id": f"{(today - timedelta(days=2)).strftime('%Y-%m-%d')}_123458",
                "date": (today - timedelta(days=2)).strftime("%Y-%m-%d"),
                "study_hours": 3.0,
                "topics": "Probability,Statistics",
                "focus_score": 9,
                "notes": "Studied Bayes theorem"
            }
        ]

        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"metrics": metrics}},
            upsert=True
        )

        # Test getting all metrics
        response = client.get("/api/progress/metrics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert data[0]["study_hours"] == 2.5
        assert data[1]["study_hours"] == 1.5
        assert data[2]["study_hours"] == 3.0
    finally:
        # Restore the original database
        routers.progress.db = original_db

@pytest.mark.asyncio
async def test_get_metrics_with_date_range(client, test_db, auth_headers, mock_auth_dependencies):
    """Test getting metrics with date range filter."""
    # Patch the router's database with the test database
    original_db = routers.progress.db
    routers.progress.db = test_db

    try:
        # Insert test metrics into user document
        today = datetime.now()
        metrics = [
            {
                "id": f"{today.strftime('%Y-%m-%d')}_123456",
                "date": today.strftime("%Y-%m-%d"),
                "study_hours": 2.5,
                "topics": "Neural Networks",
                "focus_score": 8,
                "notes": "Today"
            },
            {
                "id": f"{(today - timedelta(days=7)).strftime('%Y-%m-%d')}_123457",
                "date": (today - timedelta(days=7)).strftime("%Y-%m-%d"),
                "study_hours": 1.5,
                "topics": "Linear Algebra",
                "focus_score": 7,
                "notes": "Last week"
            },
            {
                "id": f"{(today - timedelta(days=30)).strftime('%Y-%m-%d')}_123458",
                "date": (today - timedelta(days=30)).strftime("%Y-%m-%d"),
                "study_hours": 3.0,
                "topics": "Probability",
                "focus_score": 9,
                "notes": "Last month"
            }
        ]

        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"metrics": metrics}},
            upsert=True
        )

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
    finally:
        # Restore the original database
        routers.progress.db = original_db

@pytest.mark.asyncio
async def test_delete_study_metric(client, test_db, auth_headers, mock_auth_dependencies):
    """Test deleting a study metric."""
    # Patch the router's database with the test database
    original_db = routers.progress.db
    routers.progress.db = test_db

    try:
        # Insert a test metric into user document
        metric_id = f"{datetime.now().strftime('%Y-%m-%d')}_123459"
        metric = {
            "id": metric_id,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "study_hours": 2.0,
            "topics": "Machine Learning",
            "focus_score": 8,
            "notes": "Test metric"
        }

        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"metrics": [metric]}},
            upsert=True
        )

        # Delete the metric
        response = client.delete(f"/api/progress/metrics/{metric_id}", headers=auth_headers)
        assert response.status_code == 204

        # Verify it was deleted from the user's metrics array
        user = await test_db.users.find_one({"username": "testuser"})
        assert user is not None
        assert "metrics" in user
        assert len(user["metrics"]) == 0
    finally:
        # Restore the original database
        routers.progress.db = original_db

@pytest.mark.asyncio
async def test_get_recent_metrics_summary(client, test_db, auth_headers, mock_auth_dependencies):
    """Test getting recent metrics summary."""
    # Patch the router's database with the test database
    original_db = routers.progress.db
    routers.progress.db = test_db

    try:
        # Insert test metrics into user document
        today = datetime.now()
        metrics = []

        # Today
        metrics.append({
            "id": f"{today.strftime('%Y-%m-%d')}_123460",
            "date": today.strftime("%Y-%m-%d"),
            "study_hours": 2.5,
            "topics": "Neural Networks",
            "focus_score": 8,
            "notes": "Today"
        })

        # Yesterday
        metrics.append({
            "id": f"{(today - timedelta(days=1)).strftime('%Y-%m-%d')}_123461",
            "date": (today - timedelta(days=1)).strftime("%Y-%m-%d"),
            "study_hours": 1.5,
            "topics": "Linear Algebra",
            "focus_score": 7,
            "notes": "Yesterday"
        })

        # Add metrics for the past week
        for i in range(2, 7):
            metrics.append({
                "id": f"{(today - timedelta(days=i)).strftime('%Y-%m-%d')}_{123462 + i}",
                "date": (today - timedelta(days=i)).strftime("%Y-%m-%d"),
                "study_hours": 2.0,
                "topics": f"Topic {i}",
                "focus_score": 7,
                "notes": f"Day {i}"
            })

        # Add metrics for the past month
        for i in range(7, 30):
            metrics.append({
                "id": f"{(today - timedelta(days=i)).strftime('%Y-%m-%d')}_{123470 + i}",
                "date": (today - timedelta(days=i)).strftime("%Y-%m-%d"),
                "study_hours": 1.8,
                "topics": f"Topic {i}",
                "focus_score": 6,
                "notes": f"Day {i}"
            })

        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"metrics": metrics}},
            upsert=True
        )

        # Test getting recent metrics summary
        response = client.get("/api/progress/metrics/recent", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        # Check for the expected structure
        assert "total_hours" in data
        assert "avg_focus" in data
        assert "study_days" in data
        assert "consistency" in data
        assert "top_topics" in data
    finally:
        # Restore the original database
        routers.progress.db = original_db

@pytest.mark.asyncio
async def test_get_weekly_report(client, test_db, auth_headers, mock_auth_dependencies):
    """Test getting weekly report."""
    # Patch the router's database with the test database
    original_db = routers.progress.db
    routers.progress.db = test_db

    try:
        # Insert test metrics into user document
        today = datetime.now()
        this_week_start = today - timedelta(days=today.weekday())
        last_week_start = this_week_start - timedelta(days=7)

        metrics = []

        # This week
        for i in range(3):  # Add 3 days for this week
            metrics.append({
                "id": f"{(this_week_start + timedelta(days=i)).strftime('%Y-%m-%d')}_{123500 + i}",
                "date": (this_week_start + timedelta(days=i)).strftime("%Y-%m-%d"),
                "study_hours": 2.0,
                "topics": "Neural Networks,Deep Learning",
                "focus_score": 8,
                "notes": f"This week day {i}"
            })

        # Last week
        for i in range(5):  # Add 5 days for last week
            metrics.append({
                "id": f"{(last_week_start + timedelta(days=i)).strftime('%Y-%m-%d')}_{123510 + i}",
                "date": (last_week_start + timedelta(days=i)).strftime("%Y-%m-%d"),
                "study_hours": 1.5,
                "topics": "Linear Algebra,Calculus",
                "focus_score": 7,
                "notes": f"Last week day {i}"
            })

        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"metrics": metrics}},
            upsert=True
        )

        # Test getting weekly report
        response = client.get("/api/progress/report/weekly", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        assert "report_content" in data
        assert "time_plot_url" in data
        assert "focus_plot_url" in data
        assert "topic_plot_url" in data
    finally:
        # Restore the original database
        routers.progress.db = original_db

@pytest.mark.asyncio
async def test_get_study_metrics_by_topic(client, test_db, auth_headers, mock_auth_dependencies):
    """Test getting study metrics filtered by topic."""
    # Patch the router's database with the test database
    original_db = routers.progress.db
    routers.progress.db = test_db

    try:
        # Insert test metrics into user document
        today = datetime.now()
        metrics = [
            {
                "id": f"{today.strftime('%Y-%m-%d')}_123600",
                "date": today.strftime("%Y-%m-%d"),
                "study_hours": 2.5,
                "topics": "Neural Networks,Deep Learning",
                "focus_score": 8,
                "notes": "NN study"
            },
            {
                "id": f"{(today - timedelta(days=1)).strftime('%Y-%m-%d')}_123601",
                "date": (today - timedelta(days=1)).strftime("%Y-%m-%d"),
                "study_hours": 1.5,
                "topics": "Neural Networks,Computer Vision",
                "focus_score": 7,
                "notes": "CNN study"
            },
            {
                "id": f"{(today - timedelta(days=2)).strftime('%Y-%m-%d')}_123602",
                "date": (today - timedelta(days=2)).strftime("%Y-%m-%d"),
                "study_hours": 3.0,
                "topics": "Reinforcement Learning",
                "focus_score": 9,
                "notes": "RL study"
            }
        ]

        await test_db.users.update_one(
            {"username": "testuser"},
            {"$set": {"metrics": metrics}},
            upsert=True
        )

        # Test getting all metrics first
        response = client.get("/api/progress/metrics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

        # Manually filter metrics by topic
        neural_networks_metrics = [m for m in data if "Neural Networks" in m["topics"]]
        assert len(neural_networks_metrics) == 2
        assert all("Neural Networks" in metric["topics"] for metric in neural_networks_metrics)

        reinforcement_learning_metrics = [m for m in data if "Reinforcement Learning" in m["topics"]]
        assert len(reinforcement_learning_metrics) == 1
        assert reinforcement_learning_metrics[0]["notes"] == "RL study"
    finally:
        # Restore the original database
        routers.progress.db = original_db