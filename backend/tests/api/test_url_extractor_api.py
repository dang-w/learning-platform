import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException, status

# Import the app and auth functions
from main import app
from auth import get_current_user, get_current_active_user

# Import standardized utilities
from utils.error_handlers import AuthenticationError

# Import the MockUser class from conftest
from tests.conftest import MockUser

@pytest.fixture(scope="function", autouse=True)
def clear_dependency_overrides():
    """Clear dependency overrides before and after each test."""
    # Clear any existing overrides
    app.dependency_overrides.clear()

    yield

    # Clear overrides after the test
    app.dependency_overrides.clear()

def test_extract_metadata_endpoint(client, auth_headers):
    """Test the URL extractor endpoint."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # Mock the extract_metadata_from_url and detect_resource_type functions
    with patch('routers.url_extractor.extract_metadata_from_url') as mock_extract_metadata, \
         patch('routers.url_extractor.detect_resource_type') as mock_detect_resource_type:

        # Setup mock return values
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

        # Configure mocks
        mock_extract_metadata.return_value = mock_metadata
        mock_detect_resource_type.return_value = "article"

        # Test with a valid URL
        response = client.post(
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

def test_extract_metadata_endpoint_without_auth(client):
    """Test the URL extractor endpoint without authentication."""
    # Override the dependencies with a synchronous function that raises an exception
    def override_get_current_user():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_active_user] = override_get_current_user

    response = client.post(
        "/api/url-extractor/extract",
        json={"url": "https://www.tensorflow.org/tutorials/keras/classification"},
    )
    assert response.status_code == 401
    assert "detail" in response.json()

def test_extract_metadata_endpoint_with_invalid_url(client, auth_headers):
    """Test the URL extractor endpoint with an invalid URL."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    # For invalid URLs, the API should return a 422 Unprocessable Entity
    response = client.post(
        "/api/url-extractor/extract",
        json={"url": "invalid-url"},
        headers=auth_headers,
    )
    assert response.status_code == 422
    assert "detail" in response.json()

@patch('routers.url_extractor.extract_metadata_from_url')
@patch('routers.url_extractor.detect_resource_type')
def test_extract_metadata_endpoint_mocked(mock_detect_resource_type, mock_extract_metadata, client, auth_headers):
    """Test the URL extractor endpoint with mocked services."""
    # Create a mock user
    mock_user = MockUser(username="testuser")

    # Override the dependencies with synchronous functions
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
    mock_detect_resource_type.return_value = "article"

    # Test the endpoint
    response = client.post(
        "/api/url-extractor/extract",
        json={"url": "https://example.com"},
        headers=auth_headers,
    )

    # Verify response
    assert response.status_code == 200
    result = response.json()

    # Check that our mock values are used
    assert mock_extract_metadata.called
    assert mock_detect_resource_type.called

    # The test should check for the mock values, not the actual response
    # which might be different due to the real implementation being called
    assert "title" in result
    assert "description" in result
    assert "url" in result
    assert result["title"] == mock_metadata["title"]
    assert result["description"] == mock_metadata["description"]
    assert result["url"] == mock_metadata["url"]
    assert result["resource_type"] == "article"