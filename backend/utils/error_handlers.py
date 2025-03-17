"""
Error handling utilities for the learning platform backend.

This module provides common error handling functions used across the application.
"""

from fastapi import HTTPException, status
from typing import Dict, Any, Optional
import logging

# Configure logging
logger = logging.getLogger(__name__)

class APIError(Exception):
    """Base class for API errors."""
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        headers: Optional[Dict[str, Any]] = None
    ):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code
        self.headers = headers

class ResourceNotFoundError(APIError):
    """Raised when a resource is not found."""
    def __init__(
        self,
        detail: str = "Resource not found",
        error_code: Optional[str] = "NOT_FOUND",
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code=error_code,
            headers=headers
        )

class AuthenticationError(APIError):
    """Raised when authentication fails."""
    def __init__(
        self,
        detail: str = "Authentication failed",
        error_code: Optional[str] = "UNAUTHORIZED",
        headers: Optional[Dict[str, Any]] = None
    ):
        if not headers:
            headers = {"WWW-Authenticate": "Bearer"}
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code=error_code,
            headers=headers
        )

class PermissionDeniedError(APIError):
    """Raised when a user doesn't have permission to access a resource."""
    def __init__(
        self,
        detail: str = "Permission denied",
        error_code: Optional[str] = "FORBIDDEN",
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code=error_code,
            headers=headers
        )

class ValidationError(APIError):
    """Raised when input validation fails."""
    def __init__(
        self,
        detail: str = "Validation error",
        error_code: Optional[str] = "VALIDATION_ERROR",
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code=error_code,
            headers=headers
        )

class DatabaseError(APIError):
    """Raised when a database operation fails."""
    def __init__(
        self,
        detail: str = "Database error",
        error_code: Optional[str] = "DATABASE_ERROR",
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code=error_code,
            headers=headers
        )

def handle_exception(e: Exception) -> HTTPException:
    """
    Convert exceptions to HTTPExceptions.

    Args:
        e: The exception to handle

    Returns:
        An HTTPException
    """
    if isinstance(e, APIError):
        return HTTPException(
            status_code=e.status_code,
            detail=e.detail,
            headers=e.headers
        )

    # Log unexpected errors
    logger.error(f"Unexpected error: {str(e)}")

    # Return a generic error
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="An unexpected error occurred"
    )