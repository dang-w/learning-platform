import pytest
from unittest.mock import patch, AsyncMock
from app.services.url_extractor import extract_metadata_from_url, detect_resource_type

def test_extract_metadata_endpoint(client, auth_headers):
    """Test the URL extractor endpoint."""
    # Test with a valid URL
    response = client.post(
        "/api/url/extract",
        json={"url": "https://www.tensorflow.org/tutorials/keras/classification"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    metadata = response.json()
    assert "title" in metadata
    assert "description" in metadata
    assert "estimated_time" in metadata
    assert "topics" in metadata
    assert "difficulty" in metadata
    assert "resource_type" in metadata

def test_extract_metadata_endpoint_without_auth(client):
    """Test the URL extractor endpoint without authentication."""
    response = client.post(
        "/api/url/extract",
        json={"url": "https://www.tensorflow.org/tutorials/keras/classification"},
    )
    assert response.status_code == 401
    assert "detail" in response.json()

def test_extract_metadata_endpoint_with_invalid_url(client, auth_headers):
    """Test the URL extractor endpoint with an invalid URL."""
    response = client.post(
        "/api/url/extract",
        json={"url": "invalid-url"},
        headers=auth_headers,
    )
    # Even with invalid URLs, the service should return a default response
    assert response.status_code == 200
    metadata = response.json()
    assert metadata["title"] == "invalid-url"
    assert metadata["description"] == "No description available"

@pytest.mark.asyncio
@patch('app.services.url_extractor.extract_metadata_from_url')
@patch('app.services.url_extractor.detect_resource_type')
async def test_extract_metadata_endpoint_mocked(mock_detect_resource_type, mock_extract_metadata, client, auth_headers):
    """Test the URL extractor endpoint with mocked services."""
    # Setup mocks
    mock_metadata = {
        "title": "Test Title",
        "description": "Test Description",
        "estimated_time": 10,
        "topics": ["python", "machine learning"],
        "difficulty": "intermediate"
    }
    mock_extract_metadata.return_value = mock_metadata
    mock_detect_resource_type.return_value = "article"

    # Test the endpoint
    response = client.post(
        "/api/url/extract",
        json={"url": "https://example.com"},
        headers=auth_headers,
    )

    # Verify response
    assert response.status_code == 200
    result = response.json()
    assert result["title"] == "Test Title"
    assert result["description"] == "Test Description"
    assert result["resource_type"] == "article"

    # Verify mocks were called
    mock_extract_metadata.assert_called_once_with("https://example.com")
    mock_detect_resource_type.assert_called_once_with("https://example.com")