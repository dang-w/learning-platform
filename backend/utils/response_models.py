"""
Shared response models for the learning platform backend.

This module provides common response models used across the application.
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Generic, TypeVar
from datetime import datetime

# Generic type for response data
T = TypeVar('T')

class StandardResponse(BaseModel, Generic[T]):
    """Standard response model for all API endpoints."""
    success: bool
    message: str
    data: Optional[T] = None
    timestamp: str = datetime.now().isoformat()

class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response model for list endpoints."""
    success: bool
    message: str
    data: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    timestamp: str = datetime.now().isoformat()

class ErrorResponse(BaseModel):
    """Standard error response model."""
    success: bool = False
    message: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: str = datetime.now().isoformat()

# Common response messages
class ResponseMessages:
    """Common response messages used across the application."""
    CREATED = "Resource created successfully"
    UPDATED = "Resource updated successfully"
    DELETED = "Resource deleted successfully"
    NOT_FOUND = "Resource not found"
    UNAUTHORIZED = "Unauthorized access"
    FORBIDDEN = "Forbidden access"
    BAD_REQUEST = "Bad request"
    INTERNAL_ERROR = "Internal server error"
    VALIDATION_ERROR = "Validation error"