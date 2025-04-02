import asyncio
import os
from dotenv import load_dotenv
import logging

# Import database connection
from database import db, get_database

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

async def check_db():
    """Check the database connection and create a test user if it doesn't exist."""
    try:
        # Get database connection
        users = await db.users.find().to_list(length=100)
        logger.info(f'Users in database: {[u.get("username") for u in users]}')

        # Create a test user if it doesn't exist
        test_user = {
            "username": "testuser",
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
            "disabled": False,
            "resources": {
                "articles": [],
                "videos": [],
                "courses": [],
                "books": []
            },
            "study_sessions": [],
            "review_sessions": [],
            "learning_paths": [],
            "reviews": [],
            "concepts": [],
            "goals": [],
            "milestones": []
        }

        result = await db.users.update_one(
            {"username": "testuser"},
            {"$set": test_user},
            upsert=True
        )

        logger.info(f"Update result: matched={result.matched_count}, modified={result.modified_count}, upserted={result.upserted_id is not None}")

        # Check again
        users = await db.users.find().to_list(length=100)
        logger.info(f'Users in database after update: {[u.get("username") for u in users]}')

    except Exception as e:
        logger.error(f"Error checking database: {str(e)}")

if __name__ == "__main__":
    asyncio.run(check_db())