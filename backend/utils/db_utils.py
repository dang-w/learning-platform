"""
Database utility functions for the learning platform backend.

This module provides common database operations used across the application.
"""

from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status
from bson.objectid import ObjectId
import logging

# Import database connection
from database import db

# Configure logging
logger = logging.getLogger(__name__)

async def get_document_by_id(collection_name: str, doc_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get a document by its ID, with optional user ID filtering.

    Args:
        collection_name: The name of the collection to query
        doc_id: The document ID to find
        user_id: Optional user ID to filter by (for user-specific documents)

    Returns:
        The document if found

    Raises:
        HTTPException: If document not found
    """
    try:
        # Convert string ID to ObjectId if needed
        if collection_name != "users" and len(doc_id) == 24:
            try:
                doc_id = ObjectId(doc_id)
            except Exception:
                pass

        # Build query
        query = {"_id": doc_id}
        if user_id:
            query["user_id"] = user_id

        # Get document
        document = await db[collection_name].find_one(query)

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document not found in {collection_name}"
            )

        # Convert ObjectId to string
        if "_id" in document:
            document["_id"] = str(document["_id"])

        return document
    except Exception as e:
        logger.error(f"Error getting document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

async def update_document(collection_name: str, doc_id: str, update_data: Dict[str, Any],
                          user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Update a document by its ID.

    Args:
        collection_name: The name of the collection to update
        doc_id: The document ID to update
        update_data: The data to update
        user_id: Optional user ID to filter by (for user-specific documents)

    Returns:
        The updated document

    Raises:
        HTTPException: If document not found or update fails
    """
    try:
        # Convert string ID to ObjectId if needed
        if collection_name != "users" and len(doc_id) == 24:
            try:
                doc_id = ObjectId(doc_id)
            except Exception:
                pass

        # Build query
        query = {"_id": doc_id}
        if user_id:
            query["user_id"] = user_id

        # Update document
        result = await db[collection_name].update_one(
            query,
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document not found in {collection_name}"
            )

        # Get updated document
        updated_doc = await get_document_by_id(collection_name, doc_id, user_id)
        return updated_doc
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

async def delete_document(collection_name: str, doc_id: str, user_id: Optional[str] = None) -> bool:
    """
    Delete a document by its ID.

    Args:
        collection_name: The name of the collection to delete from
        doc_id: The document ID to delete
        user_id: Optional user ID to filter by (for user-specific documents)

    Returns:
        True if document was deleted

    Raises:
        HTTPException: If document not found or delete fails
    """
    try:
        # Convert string ID to ObjectId if needed
        if collection_name != "users" and len(doc_id) == 24:
            try:
                doc_id = ObjectId(doc_id)
            except Exception:
                pass

        # Build query
        query = {"_id": doc_id}
        if user_id:
            query["user_id"] = user_id

        # Delete document
        result = await db[collection_name].delete_one(query)

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document not found in {collection_name}"
            )

        return True
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )