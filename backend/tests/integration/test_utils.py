"""
Utility functions for integration tests.
This module contains common functions used across integration tests.
"""

import asyncio
from datetime import datetime, timedelta
from bson import ObjectId
import uuid
import pytest
import logging

# Import standardized utilities
from database import db, get_database
from utils.error_handlers import DatabaseError, ResourceNotFoundError
from utils.response_models import StandardResponse, ErrorResponse
from utils.validators import validate_required_fields
from utils.db_utils import get_document_by_id, update_document, delete_document

from auth import create_access_token

async def create_test_resource(owner_username="testuser", **kwargs):
    """
    Create a test resource in the database.

    Args:
        owner_username: The username of the resource owner
        **kwargs: Additional resource fields to override defaults

    Returns:
        str: The ID of the created resource

    Raises:
        DatabaseError: If there's an error creating the resource
    """
    try:
        # Validate required fields
        required_fields = ["title", "resource_type", "owner_username"]

        # Create default resource data
        resource_data = {
            "title": f"Test Resource {uuid.uuid4().hex[:8]}",
            "description": "A test resource for integration tests",
            "url": f"https://example.com/test-{uuid.uuid4().hex[:8]}",
            "resource_type": "article",
            "tags": ["test", "integration"],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "completion_status": "not_started",
            "notes": "Test notes",
            "priority": 5,
            "owner_username": owner_username
        }

        # Override defaults with any provided kwargs
        resource_data.update(kwargs)

        # Validate required fields
        validate_required_fields(resource_data, required_fields)

        # Insert the resource
        result = await db.resources.insert_one(resource_data)
        return str(result.inserted_id)
    except Exception as e:
        # Raise a standardized database error
        raise DatabaseError(detail=f"Error creating test resource: {str(e)}")

async def create_test_goal(owner_username="testuser", **kwargs):
    """
    Create a test goal in the database.

    Args:
        owner_username: The username of the goal owner
        **kwargs: Additional goal fields to override defaults

    Returns:
        str: The ID of the created goal

    Raises:
        DatabaseError: If there's an error creating the goal
    """
    try:
        # Validate required fields
        required_fields = ["title", "owner_username"]

        # Create default goal data
        goal_data = {
            "title": f"Test Goal {uuid.uuid4().hex[:8]}",
            "description": "A test goal for integration tests",
            "target_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "status": "in_progress",
            "progress": 0,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "owner_username": owner_username,
            "tags": ["test", "integration"]
        }

        # Override defaults with any provided kwargs
        goal_data.update(kwargs)

        # Validate required fields
        validate_required_fields(goal_data, required_fields)

        # Insert the goal
        result = await db.goals.insert_one(goal_data)
        return str(result.inserted_id)
    except Exception as e:
        # Raise a standardized database error
        raise DatabaseError(detail=f"Error creating test goal: {str(e)}")

async def create_test_concept(owner_username="testuser", **kwargs):
    """
    Create a test concept in the database.

    Args:
        owner_username: The username of the concept owner
        **kwargs: Additional concept fields to override defaults

    Returns:
        str: The ID of the created concept

    Raises:
        DatabaseError: If there's an error creating the concept
    """
    try:
        # Validate required fields
        required_fields = ["title", "owner_username"]

        # Create default concept data
        concept_data = {
            "title": f"Test Concept {uuid.uuid4().hex[:8]}",
            "description": "A test concept for integration tests",
            "content": "Test content for the concept",
            "tags": ["test", "integration"],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "owner_username": owner_username,
            "related_resources": []
        }

        # Override defaults with any provided kwargs
        concept_data.update(kwargs)

        # Validate required fields
        validate_required_fields(concept_data, required_fields)

        # Insert the concept
        result = await db.concepts.insert_one(concept_data)
        return str(result.inserted_id)
    except Exception as e:
        # Raise a standardized database error
        raise DatabaseError(detail=f"Error creating test concept: {str(e)}")

async def cleanup_test_resources(resource_ids):
    """
    Clean up test resources from the database.

    Args:
        resource_ids: List of resource IDs to delete

    Returns:
        int: Number of resources deleted
    """
    try:
        # Delete each resource
        deleted_count = 0
        for resource_id in resource_ids:
            try:
                result = await delete_document("resources", resource_id)
                if result:
                    deleted_count += 1
            except ResourceNotFoundError:
                # Ignore if resource not found
                pass
        return deleted_count
    except Exception as e:
        logging.error(f"Error cleaning up test resources: {str(e)}")
        return 0

async def cleanup_test_goals(goal_ids):
    """
    Clean up test goals from the database.

    Args:
        goal_ids: List of goal IDs to delete

    Returns:
        int: Number of goals deleted
    """
    try:
        # Delete each goal
        deleted_count = 0
        for goal_id in goal_ids:
            try:
                result = await delete_document("goals", goal_id)
                if result:
                    deleted_count += 1
            except ResourceNotFoundError:
                # Ignore if goal not found
                pass
        return deleted_count
    except Exception as e:
        logging.error(f"Error cleaning up test goals: {str(e)}")
        return 0

async def cleanup_test_concepts(concept_ids):
    """
    Clean up test concepts from the database.

    Args:
        concept_ids: List of concept IDs to delete

    Returns:
        int: Number of concepts deleted
    """
    try:
        # Delete each concept
        deleted_count = 0
        for concept_id in concept_ids:
            try:
                result = await delete_document("concepts", concept_id)
                if result:
                    deleted_count += 1
            except ResourceNotFoundError:
                # Ignore if concept not found
                pass
        return deleted_count
    except Exception as e:
        logging.error(f"Error cleaning up test concepts: {str(e)}")
        return 0

def verify_response(response, expected_status=200):
    """
    Verify that a response is valid and has the expected status code.

    Args:
        response: The response to verify
        expected_status: The expected status code (default: 200)

    Returns:
        dict: The response data

    Raises:
        AssertionError: If the response is invalid or has an unexpected status code
    """
    # Check status code
    assert response.status_code == expected_status, f"Expected status code {expected_status}, got {response.status_code}: {response.text}"

    # Parse response data
    response_data = response.json()

    # For error responses, return the error details
    if expected_status >= 400:
        return response_data

    # For success responses, check for standard response format
    if isinstance(response_data, dict) and "success" in response_data:
        assert response_data["success"] is True, f"Expected success=True, got {response_data}"
        if "data" in response_data:
            return response_data["data"]

    # If not a standard response, return the raw data
    return response_data