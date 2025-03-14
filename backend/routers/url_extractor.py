from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any
import os
import sys
import logging
from dotenv import load_dotenv

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the URL extractor service
from app.services.url_extractor import extract_metadata_from_url, detect_resource_type

# Import authentication functions from main
from main import get_current_active_user, User

# Load environment variables
load_dotenv()

# Create router
router = APIRouter()

# Models
class URLMetadataRequest(BaseModel):
    url: str

# Endpoints
@router.post("/extract", response_model=Dict[str, Any])
async def extract_metadata(
    request: URLMetadataRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Extract metadata from a URL."""
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