import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import httpx
from bs4 import BeautifulSoup
from app.services.url_extractor import extract_metadata_from_url, detect_resource_type

@pytest.mark.asyncio
@patch('httpx.AsyncClient')
async def test_extract_metadata_from_url(mock_client):
    """Test extracting metadata from a URL."""
    # Setup mock response
    mock_response = MagicMock()
    mock_response.text = """
    <html>
        <head>
            <title>Test Title</title>
            <meta name="description" content="Test Description">
            <meta name="keywords" content="python, machine learning, ai">
        </head>
        <body>
            <h1>Test Heading</h1>
            <p>This is a test paragraph with some content about machine learning and artificial intelligence.</p>
        </body>
    </html>
    """
    mock_response.raise_for_status = MagicMock()

    # Setup mock client
    mock_client_instance = AsyncMock()
    mock_client_instance.get.return_value = mock_response
    mock_client.return_value.__aenter__.return_value = mock_client_instance

    # Call the function
    result = await extract_metadata_from_url("https://example.com")

    # Verify the result
    assert result["title"] == "Test Title"
    assert result["description"] == "Test Description"
    assert set(result["topics"]) == {"python", "machine", "learning", "ai"}
    assert "estimated_time" in result
    assert "difficulty" in result

    # Verify the mock was called
    mock_client_instance.get.assert_called_once_with("https://example.com")

@pytest.mark.asyncio
@patch('httpx.AsyncClient')
async def test_extract_metadata_from_url_with_error(mock_client):
    """Test extracting metadata from a URL with an error."""
    # Setup mock client to raise an exception
    mock_client_instance = AsyncMock()
    mock_client_instance.get.side_effect = httpx.RequestError("Error")
    mock_client.return_value.__aenter__.return_value = mock_client_instance

    # Call the function
    result = await extract_metadata_from_url("https://example.com")

    # Verify the result contains default values
    assert result["title"] == "https://example.com"
    assert result["description"] == "No description available"
    assert result["estimated_time"] == 30
    assert result["topics"] == []
    assert result["difficulty"] == "intermediate"

@pytest.mark.asyncio
async def test_detect_resource_type_video():
    """Test detecting a video resource type."""
    video_urls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ",
        "https://vimeo.com/123456789",
        "https://www.ted.com/talks/some_talk"
    ]

    for url in video_urls:
        result = await detect_resource_type(url)
        assert result == "video"

@pytest.mark.asyncio
async def test_detect_resource_type_course():
    """Test detecting a course resource type."""
    course_urls = [
        "https://www.coursera.org/learn/machine-learning",
        "https://www.udemy.com/course/python-for-data-science",
        "https://www.edx.org/course/introduction-to-computer-science"
    ]

    for url in course_urls:
        result = await detect_resource_type(url)
        assert result == "course"

@pytest.mark.asyncio
async def test_detect_resource_type_book():
    """Test detecting a book resource type."""
    book_urls = [
        "https://www.amazon.com/books/dp/1234567890",
        "https://www.goodreads.com/book/show/12345",
        "https://books.google.com/books?id=abcdef"
    ]

    for url in book_urls:
        result = await detect_resource_type(url)
        assert result == "book"

@pytest.mark.asyncio
async def test_detect_resource_type_article():
    """Test detecting an article resource type (default)."""
    article_urls = [
        "https://medium.com/some-article",
        "https://www.example.com/blog/post",
        "https://dev.to/some-post"
    ]

    for url in article_urls:
        result = await detect_resource_type(url)
        assert result == "article"