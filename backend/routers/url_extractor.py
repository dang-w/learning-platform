from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, HttpUrl
import requests
from bs4 import BeautifulSoup
import re
from typing import Optional, Dict, Any, List
import os
import sys
import logging
from dotenv import load_dotenv

# Fix circular import by using absolute import
from auth import get_current_active_user, User

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the URL extractor service
from app.services.url_extractor import extract_metadata_from_url, detect_resource_type

# Load environment variables
load_dotenv()

# Create router
router = APIRouter()

# Models
class URLMetadataRequest(BaseModel):
    url: HttpUrl

class URLMetadata(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    url: str
    site_name: Optional[str] = None
    estimated_time: Optional[int] = None
    topics: Optional[List[str]] = []
    difficulty: Optional[str] = None
    resource_type: Optional[str] = None

# Endpoints
@router.post("/extract", response_model=URLMetadata)
async def extract_metadata(
    request: URLMetadataRequest,
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Extract metadata from a URL."""
    # Ensure authentication by using the current_user
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    try:
        # Extract metadata from the URL
        metadata = await extract_metadata_from_url(request.url)

        # Detect resource type
        resource_type = await detect_resource_type(request.url)

        # Add resource type to metadata
        metadata["resource_type"] = resource_type

        return metadata
    except Exception as e:
        logging.error(f"Error extracting metadata: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error extracting metadata: {str(e)}"
        )