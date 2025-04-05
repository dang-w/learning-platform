"""
Performance tests for API endpoints.
"""
import asyncio
import time
from typing import Dict, List, Optional

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, Headers, ASGITransport

from tests.conftest import app, MockUser
from tests.mock_db import create_test_user

import sys
import os

# Add the parent directory to the path so we can import main
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

pytestmark = [pytest.mark.slow, pytest.mark.performance]


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


@pytest.mark.asyncio
async def test_api_endpoint_response_time(async_client):
    """Test the response time of a critical API endpoint."""
    response = await async_client.get("/api/health")

    assert response.status_code == 200
    assert response.elapsed.total_seconds() < 1.0  # Example threshold: 1 second


@pytest.mark.asyncio
async def test_api_concurrent_requests(async_client):
    """Test handling concurrent requests."""
    num_requests = 10

    # Create tasks for concurrent requests
    tasks = [async_client.get("/api/health") for _ in range(num_requests)]

    # Run tasks concurrently
    responses = await asyncio.gather(*tasks)

    # Check all responses
    for response in responses:
        assert response.status_code == 200


@pytest.mark.xfail(reason="Token authentication fails in full test suite due to event loop issues")
@pytest.mark.asyncio
async def test_resources_endpoint_performance(async_client):
    """Test the performance of the resources endpoint."""
    # This test assumes the necessary authentication setup is handled by fixtures
    # (e.g., setup_test_user, auth_headers implicitly used via async_client configuration)
    response = await async_client.get("/api/resources/") # Assuming /api/resources requires auth

    assert response.status_code == 200
    assert response.elapsed.total_seconds() < 1.5 # Example threshold


@pytest.mark.asyncio
async def test_database_query_performance(test_db):
    """Test the performance of a common database query."""
    start_time = time.time()

    # Perform a representative query on the test database
    # Example: Find all users (adjust query as needed)
    cursor = test_db.users.find({}) # Use the test_db fixture
    users = await cursor.to_list(length=None) # Adjust length if needed

    end_time = time.time()

    query_time = end_time - start_time
    print(f"Database query took: {query_time:.4f} seconds")

    assert query_time < 0.5 # Example threshold: 0.5 seconds

    # Additional assertion: Check if any users were found (if expected)
    # assert len(users) > 0