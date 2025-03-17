import httpx
import re
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional, Union
import logging
from pydantic import HttpUrl
import sys
import os

# Add the parent directory to the path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import utility functions
from utils.validators import validate_url
from utils.error_handlers import ValidationError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def extract_metadata_from_url(url: Union[str, HttpUrl]) -> Dict[str, Any]:
    """
    Extract metadata from a URL including title, description, and estimated reading time.

    Args:
        url: The URL to extract metadata from (can be a string or Pydantic HttpUrl)

    Returns:
        A dictionary containing the extracted metadata

    Raises:
        ValidationError: If the URL is invalid
        Exception: For any other errors during extraction
    """
    try:
        # Convert URL to string if it's a Pydantic URL object
        url_str = str(url)
        logger.info(f"Extracting metadata from URL: {url_str}")

        # Validate URL format
        try:
            validate_url(url_str)
        except ValidationError as e:
            logger.error(f"Invalid URL format: {url_str}")
            raise

        # Initialize default metadata
        metadata = {
            "title": "",
            "description": "",
            "estimated_time": 0,  # in minutes
            "topics": [],
            "difficulty": "intermediate"  # default difficulty
        }

        # Fetch the URL content
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url_str)
            response.raise_for_status()

            # Parse HTML content
            soup = BeautifulSoup(response.text, 'html.parser')

            # Extract title
            if soup.title:
                metadata["title"] = soup.title.string.strip()

            # Extract description from meta tags
            description_meta = soup.find("meta", attrs={"name": "description"}) or \
                              soup.find("meta", attrs={"property": "og:description"})
            if description_meta and description_meta.get("content"):
                metadata["description"] = description_meta["content"].strip()

            # Extract keywords/topics from meta tags
            keywords_meta = soup.find("meta", attrs={"name": "keywords"})
            if keywords_meta and keywords_meta.get("content"):
                keywords = keywords_meta["content"].split(",")
                metadata["topics"] = [keyword.strip().lower() for keyword in keywords if keyword.strip()]

            # If no topics found, try to extract from content
            if not metadata["topics"]:
                # Extract h1, h2, h3 headings as potential topics
                headings = soup.find_all(["h1", "h2", "h3"])
                heading_text = [h.get_text().strip().lower() for h in headings]

                # Extract potential topics from headings
                potential_topics = set()
                for text in heading_text:
                    # Split by common separators and filter out short words
                    words = re.split(r'[,\s\-_]+', text)
                    for word in words:
                        if len(word) > 3 and not word.isdigit():
                            potential_topics.add(word)

                metadata["topics"] = list(potential_topics)[:5]  # Limit to 5 topics

            # Estimate reading time based on content length
            # Average reading speed is about 200-250 words per minute
            content_text = soup.get_text()
            word_count = len(re.findall(r'\w+', content_text))
            reading_time = max(1, round(word_count / 200))  # Minimum 1 minute
            metadata["estimated_time"] = reading_time

            # Estimate difficulty based on content complexity
            # This is a simple heuristic based on average word length and presence of technical terms
            avg_word_length = sum(len(word) for word in re.findall(r'\w+', content_text)) / max(1, word_count)

            # List of technical terms that might indicate advanced content
            technical_terms = [
                "algorithm", "neural network", "deep learning", "machine learning",
                "artificial intelligence", "regression", "classification", "clustering",
                "reinforcement learning", "tensorflow", "pytorch", "keras", "scikit-learn",
                "hyperparameter", "backpropagation", "gradient descent", "optimization"
            ]

            # Count technical terms
            technical_term_count = sum(1 for term in technical_terms if term.lower() in content_text.lower())

            # Determine difficulty
            if avg_word_length > 6 and technical_term_count > 10:
                metadata["difficulty"] = "advanced"
            elif avg_word_length > 5 and technical_term_count > 5:
                metadata["difficulty"] = "intermediate"
            else:
                metadata["difficulty"] = "beginner"

        logger.info(f"Successfully extracted metadata from URL: {url_str}")
        # Add the URL to the metadata
        metadata["url"] = url_str
        return metadata

    except Exception as e:
        logger.error(f"Error extracting metadata from URL {url}: {str(e)}")
        # Return basic metadata with the URL as title
        url_str = str(url)
        return {
            "title": url_str,
            "description": "No description available",
            "estimated_time": 30,  # default 30 minutes
            "topics": [],
            "difficulty": "intermediate",
            "url": url_str
        }

async def detect_resource_type(url: Union[str, HttpUrl]) -> str:
    """
    Detect the type of resource based on the URL.

    Args:
        url: The URL to analyze (can be a string or Pydantic HttpUrl)

    Returns:
        Resource type: 'article', 'video', 'course', or 'book'
    """
    try:
        # Convert URL to string if it's a Pydantic URL object
        url_str = str(url)

        # Video platforms
        video_patterns = [
            r'youtube\.com', r'youtu\.be', r'vimeo\.com', r'dailymotion\.com',
            r'twitch\.tv', r'ted\.com', r'coursera\.org/lecture', r'udemy\.com/lecture'
        ]

        # Course platforms
        course_patterns = [
            r'coursera\.org/learn', r'udemy\.com/course', r'edx\.org/course',
            r'pluralsight\.com/courses', r'linkedin\.com/learning', r'skillshare\.com'
        ]

        # Book platforms
        book_patterns = [
            r'amazon\.com.*books', r'goodreads\.com', r'books\.google\.com',
            r'oreilly\.com/library', r'packtpub\.com', r'manning\.com'
        ]

        # Check for video
        for pattern in video_patterns:
            if re.search(pattern, url_str, re.IGNORECASE):
                return 'video'

        # Check for course
        for pattern in course_patterns:
            if re.search(pattern, url_str, re.IGNORECASE):
                return 'course'

        # Check for book
        for pattern in book_patterns:
            if re.search(pattern, url_str, re.IGNORECASE):
                return 'book'

        # Default to article
        return 'article'

    except Exception as e:
        logger.error(f"Error detecting resource type for URL {url}: {str(e)}")
        return 'article'  # Default to article on error