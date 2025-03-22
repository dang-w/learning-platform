"""
Performance tests for API endpoints.
"""
import asyncio
import time
from typing import Dict, List, Optional

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

from tests.conftest import app, MockUser
from tests.mock_db import create_test_user

pytestmark = [pytest.mark.slow, pytest.mark.performance]


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


@pytest.mark.asyncio
async def test_api_endpoint_response_time(client):
    """Test response time for basic API endpoints."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        start_time = time.time()
        response = await ac.get("/health")
        end_time = time.time()

        assert response.status_code == 200
        assert end_time - start_time < 0.1  # Response should be under 100ms


@pytest.mark.asyncio
async def test_api_concurrent_requests(client):
    """Test API performance under concurrent requests."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Create 10 concurrent requests
        start_time = time.time()
        tasks = [ac.get("/health") for _ in range(10)]
        responses = await asyncio.gather(*tasks)
        end_time = time.time()

        # All responses should be successful
        assert all(response.status_code == 200 for response in responses)

        # Total time for 10 concurrent requests should be reasonable
        total_time = end_time - start_time
        assert total_time < 1.0  # All requests should complete within 1 second

        # Log the average response time
        avg_time = total_time / len(tasks)
        print(f"Average response time: {avg_time:.4f} seconds")


@pytest.mark.xfail(reason="Token authentication fails in full test suite due to event loop issues")
def test_resources_endpoint_performance(client):
    """Test performance of resource listing endpoint."""
    from auth import create_access_token
    from datetime import timedelta

    # Manually create token without using the setup_test_user fixture
    access_token = create_access_token(
        data={"sub": "testuser"},
        expires_delta=timedelta(minutes=30)
    )
    headers = {"Authorization": f"Bearer {access_token}"}

    # Measure performance
    start_time = time.time()
    response = client.get("/api/resources/", headers=headers)
    end_time = time.time()

    assert response.status_code == 200
    assert end_time - start_time < 0.6  # Response should be under 600ms


@pytest.mark.asyncio
async def test_database_query_performance():
    """Test database query performance."""
    from database import get_db

    # Get database connection
    db = await get_db()

    # Measure performance of a typical database query
    start_time = time.time()
    # Execute a simple find query
    documents = await db.resources.find().to_list(length=100)
    end_time = time.time()

    query_time = end_time - start_time
    print(f"Database query time: {query_time:.4f} seconds")

    # Query should be reasonably fast
    assert query_time < 0.5  # Query should be under 500ms