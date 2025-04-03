import os
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from database import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["test_utils"],
    responses={404: {"description": "Not found"}},
)

# Define collections to clear during reset
# Add any other collections used in your application that need resetting for tests
COLLECTIONS_TO_RESET = [
    "users",
    "sessions",
    "resources",
    "progress",
    "learning_paths",
    "reviews",
    "lessons",
    "notes",
    # Add other collection names here if needed
]

async def check_reset_permission(request: Request):
    """Dependency to check if database reset is allowed."""
    # Option 1: Check environment variable (Safer for potentially destructive operations)
    allow_reset = os.getenv("ALLOW_DB_RESET", "false").lower() == "true"

    # Option 2: Check for a specific header (Less secure, use with caution)
    # reset_header = request.headers.get("X-Allow-DB-Reset")
    # allow_reset = reset_header == "your-secret-reset-key" # Replace with a secure key

    if not allow_reset:
        logger.warning("Unauthorized attempt to reset database.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Database reset is not allowed in this environment.",
        )
    logger.info("Database reset permission granted.")

@router.post(
    "/reset-db",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(check_reset_permission)],
    summary="Reset Database for Testing",
    description="Deletes all data from specified collections. Requires ALLOW_DB_RESET=true environment variable.",
)
async def reset_database(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Resets the database by clearing specified collections.

    **Protection:** This endpoint is protected and requires the `ALLOW_DB_RESET`
    environment variable to be set to `true`.

    **Functionality:** Connects to the database and deletes all documents
    from the collections defined in `COLLECTIONS_TO_RESET`.

    **Returns:** A success message upon completion or raises an error
    if the reset fails or is not permitted.
    """
    logger.info("--- Entered /reset-db endpoint --- ") # Log entry into the endpoint
    try:
        logger.warning("Initiating database reset...")
        results = {}
        for collection_name in COLLECTIONS_TO_RESET:
            collection = db[collection_name]
            # Check if collection exists before attempting delete
            if collection_name in await db.list_collection_names():
                delete_result = await collection.delete_many({})
                results[collection_name] = delete_result.deleted_count
                logger.info(f"Deleted {delete_result.deleted_count} documents from '{collection_name}'.")
            else:
                results[collection_name] = 0
                logger.info(f"Collection '{collection_name}' not found, skipping.")

        logger.warning("Database reset completed successfully.")
        return {"message": "Database reset successfully", "deleted_counts": results}
    except Exception as e:
        logger.exception(f"Error during database reset: {str(e)}") # Use logger.exception for stack trace
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resetting database: {str(e)}",
        )