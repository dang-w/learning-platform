import pytest
from fastapi.testclient import TestClient
from main import app
from httpx import AsyncClient, Headers, ASGITransport
from fastapi import status
from datetime import datetime

@pytest.mark.asyncio
async def test_read_root(async_client):
    """Test the root endpoint."""
    response = await async_client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "Welcome to the Learning Platform API" in data["message"]

@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    """Test the health check endpoint directly."""
    response = await async_client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data
    assert "version" in data
    assert "uptime" in data
    # Optionally, add more specific checks for timestamp format, version, etc.
    try:
        # Validate timestamp format
        datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
    except ValueError:
        pytest.fail(f"Invalid timestamp format: {data['timestamp']}")

# Test database connection check (implicitly tested by health check if DB is up)