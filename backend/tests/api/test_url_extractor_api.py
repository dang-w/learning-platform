import pytest
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import HTTPException, status

# Import the app and auth functions
from main import app
from auth import get_current_user, get_current_active_user

# Import standardized utilities
from utils.error_handlers import AuthenticationError

# Import the MockUser class from conftest
from tests.conftest import MockUser

from httpx import AsyncClient, Headers, ASGITransport

import sys
import os

# Add the parent directory to the path so we can import main
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Sample URL and expected metadata
sample_url = "https://example.com/article"
expected_metadata = {
    "title": "Sample Article Title",
    "description": "A short description of the article.",
    "image": "https://example.com/image.jpg",
    "url": sample_url,
    "resource_type": "article",
    "topics": [],
    "difficulty": None,
    "estimated_time": None,
    "site_name": None
}

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    # Clear any existing overrides
    app.dependency_overrides.clear()

    yield

    # Clear overrides after the test
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_extract_metadata_endpoint(async_client: AsyncClient, auth_headers):
    """Test the URL extractor endpoint."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Mock the extract_metadata_from_url and detect_resource_type functions
    # Use AsyncMock for async functions
    with patch('routers.url_extractor.extract_metadata_from_url', new_callable=AsyncMock) as mock_extract_metadata, \
         patch('routers.url_extractor.detect_resource_type', return_value="article") as mock_detect_resource_type: # detect_resource_type might be sync

        # Setup mock return values for the async extract_metadata_from_url
        mock_metadata = {
            "title": "Test Title",
            "description": "Test Description",
            "image": None,
            "url": "https://www.tensorflow.org/tutorials/keras/classification",
            "site_name": None,
            "estimated_time": 10,
            "topics": ["python", "machine learning"],
            "difficulty": "intermediate"
        }
        mock_extract_metadata.return_value = mock_metadata
        # mock_detect_resource_type is already patched with a return value

        # Test with a valid URL
        response = await async_client.post( # Use await and async_client
            "/api/url-extractor/extract",
            json={"url": "https://www.tensorflow.org/tutorials/keras/classification"},
            headers=auth_headers,
        )

        # Check if the response is successful
        assert response.status_code == 200
        result = response.json()

        # Verify the response structure
        assert "title" in result
        assert "description" in result
        assert "url" in result
        assert "resource_type" in result
        assert result["url"] == "https://www.tensorflow.org/tutorials/keras/classification"
        mock_extract_metadata.assert_awaited_once() # Verify async mock was awaited
        mock_detect_resource_type.assert_called_once() # Verify sync mock was called

@pytest.mark.asyncio
async def test_extract_metadata_endpoint_without_auth(async_client: AsyncClient):
    """Test the URL extractor endpoint without authentication."""
    # Override the dependencies to simulate unauthenticated access
    # This assumes the dependency check happens before hitting the main logic
    async def override_get_current_active_user(): # Make override async
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    app.dependency_overrides[get_current_active_user] = override_get_current_active_user

    response = await async_client.post( # Use await and async_client
        "/api/url-extractor/extract",
        json={"url": "https://www.tensorflow.org/tutorials/keras/classification"},
    )
    assert response.status_code == 401
    assert "detail" in response.json()

@pytest.mark.asyncio
async def test_extract_metadata_endpoint_with_invalid_url(async_client: AsyncClient, auth_headers):
    """Test the URL extractor endpoint with an invalid URL."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # For invalid URLs, the API should return a 422 Unprocessable Entity
    response = await async_client.post( # Use await and async_client
        "/api/url-extractor/extract",
        json={"url": "invalid-url"},
        headers=auth_headers,
    )
    assert response.status_code == 422
    assert "detail" in response.json()

@patch('routers.url_extractor.extract_metadata_from_url', new_callable=unittest.mock.AsyncMock) # Use fully qualified name
@patch('routers.url_extractor.detect_resource_type', return_value="article") # detect_resource_type might be sync
@pytest.mark.asyncio
async def test_extract_metadata_endpoint_mocked(mock_detect_resource_type, mock_extract_metadata, async_client: AsyncClient, auth_headers): # Change client to async_client and add async
    """Test the URL extractor endpoint with mocked services."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Setup mocks
    mock_metadata = {
        "title": "Test Title",
        "description": "Test Description",
        "image": None,
        "url": "https://example.com",
        "site_name": None,
        "estimated_time": 10,
        "topics": ["python", "machine learning"],
        "difficulty": "intermediate"
    }

    # Configure mocks
    mock_extract_metadata.return_value = mock_metadata
    # mock_detect_resource_type already configured via decorator

    # Test the endpoint
    response = await async_client.post( # Use await and async_client
        "/api/url-extractor/extract",
        json={"url": "https://example.com"},
        headers=auth_headers,
    )

    # Verify response
    assert response.status_code == 200
    result = response.json()

    # Check that our mock values are used
    mock_extract_metadata.assert_awaited_once() # Check awaited
    mock_detect_resource_type.assert_called_once() # Check called

    # The test should check for the mock values, not the actual response
    # which might be different due to the real implementation being called
    assert "title" in result
    assert "description" in result
    assert "url" in result
    assert result["title"] == mock_metadata["title"]
    assert result["description"] == mock_metadata["description"]
    assert result["url"] == mock_metadata["url"]
    assert result["resource_type"] == "article"

# Test the main extraction endpoint
@pytest.mark.asyncio
async def test_extract_metadata_endpoint(async_client, auth_headers):
    """Test the /api/url-extractor/extract endpoint with authentication."""
    # Mock the underlying service function
    with patch("routers.url_extractor.extract_metadata_from_url", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = expected_metadata

        payload = {"url": sample_url}
        response = await async_client.post("/api/url-extractor/extract", json=payload, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data == expected_metadata
        mock_extract.assert_awaited_once_with(sample_url)

# Test the endpoint without authentication
@pytest.mark.asyncio
async def test_extract_metadata_endpoint_without_auth(async_client):
    """Test accessing the endpoint without authentication headers."""
    payload = {"url": sample_url}
    response = await async_client.post("/api/url-extractor/extract", json=payload)

    assert response.status_code == 401

# Test the endpoint with an invalid URL payload
@pytest.mark.asyncio
async def test_extract_metadata_endpoint_with_invalid_url(async_client, auth_headers):
    """Test the endpoint with an invalid URL format in the payload."""
    payload = {"url": "not-a-valid-url"}
    response = await async_client.post("/api/url-extractor/extract", json=payload, headers=auth_headers)

    assert response.status_code == 422 # Unprocessable Entity due to validation

# Test the endpoint behavior when the underlying service raises an error
@pytest.mark.asyncio
async def test_extract_metadata_endpoint_mocked(async_client, auth_headers):
    """Test endpoint when the service fails, using mocks."""
    with patch("routers.url_extractor.extract_metadata_from_url", new_callable=AsyncMock) as mock_extract,\
         patch("routers.url_extractor.detect_resource_type") as mock_detect:

        # Configure the mock to simulate failure
        mock_extract.side_effect = Exception("Service unavailable")
        mock_detect.return_value = "other" # Assume fallback detection

        payload = {"url": sample_url}
        response = await async_client.post("/api/url-extractor/extract", json=payload, headers=auth_headers)

        # Depending on error handling, might be 500 or a specific error response
        # Assuming it returns 500 Internal Server Error
        assert response.status_code == 500
        assert "detail" in response.json()
        assert "Service unavailable" in response.json()["detail"]