import pytest

def test_read_root(client):
    """Test the root endpoint."""
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "Welcome to the Learning Platform API" in data["message"]

def test_health_check(client):
    """Test the health check endpoint."""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"
    assert "timestamp" in data