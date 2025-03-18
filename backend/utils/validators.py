"""
Validation utilities for the learning platform backend.

This module provides common validation functions used across the application.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
import re
from fastapi import HTTPException, status
from pydantic import BaseModel

# Import error handlers
from .error_handlers import ValidationError

def validate_date_format(date_str: str, format_str: str = "%Y-%m-%d") -> bool:
    """
    Validate that a date string matches the expected format.

    Args:
        date_str: The date string to validate
        format_str: The expected format (default: YYYY-MM-DD)

    Returns:
        True if valid, False otherwise
    """
    try:
        datetime.strptime(date_str, format_str)
        return True
    except ValueError:
        return False

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> None:
    """
    Validate that all required fields are present in the data.

    Args:
        data: The data to validate
        required_fields: List of required field names

    Raises:
        ValidationError: If any required fields are missing
    """
    missing_fields = [field for field in required_fields if field not in data or data[field] is None]
    if missing_fields:
        raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")

def validate_resource_type(resource_type: str) -> None:
    """
    Validate that a resource type is valid.

    Args:
        resource_type: The resource type to validate

    Raises:
        ValidationError: If the resource type is invalid
    """
    valid_types = ["articles", "videos", "courses", "books"]
    if resource_type not in valid_types:
        raise ValidationError(f"Invalid resource type: {resource_type}. Must be one of: {', '.join(valid_types)}")

def validate_url(url: str) -> None:
    """
    Validate that a URL is properly formatted.

    Args:
        url: The URL to validate

    Raises:
        ValidationError: If the URL is invalid
    """
    url_pattern = re.compile(
        r'^(?:http|ftp)s?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'  # domain
        r'localhost|'  # localhost
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # or IP
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)

    if not url_pattern.match(url):
        raise ValidationError(f"Invalid URL format: {url}")

def validate_rating(rating: int, min_value: int = 1, max_value: int = 5) -> None:
    """
    Validate that a rating is within the expected range.

    Args:
        rating: The rating to validate
        min_value: The minimum allowed value (default: 1)
        max_value: The maximum allowed value (default: 5)

    Raises:
        ValidationError: If the rating is outside the allowed range
    """
    if not isinstance(rating, int) or rating < min_value or rating > max_value:
        raise ValidationError(f"Rating must be an integer between {min_value} and {max_value}")

def validate_email(email: str) -> bool:
    """
    Validate that an email address is properly formatted.

    Args:
        email: The email to validate

    Returns:
        bool: True if email is valid

    Raises:
        ValidationError: If the email is invalid
    """
    email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    if not email_pattern.match(email):
        raise ValidationError(f"Invalid email format: {email}")
    return True

def validate_password_strength(password: str) -> bool:
    """
    Validate that a password meets minimum strength requirements.

    Args:
        password: The password to validate

    Returns:
        bool: True if password meets requirements

    Raises:
        ValidationError: If the password is too weak
    """
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters long")

    if not any(c.isupper() for c in password):
        raise ValidationError("Password must contain at least one uppercase letter")

    if not any(c.islower() for c in password):
        raise ValidationError("Password must contain at least one lowercase letter")

    if not any(c.isdigit() for c in password):
        raise ValidationError("Password must contain at least one number")

    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        raise ValidationError("Password must contain at least one special character")

    return True