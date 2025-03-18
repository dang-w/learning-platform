import os
import motor.motor_asyncio
from dotenv import load_dotenv
import logging
import asyncio
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get MongoDB connection string from environment variables
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "learning_platform")

# Create MongoDB client with proper settings
client = motor.motor_asyncio.AsyncIOMotorClient(
    MONGODB_URL,
    serverSelectionTimeoutMS=5000,  # 5 second timeout
    connectTimeoutMS=10000,         # 10 second timeout
    retryWrites=True,
    maxPoolSize=50                  # Increase connection pool size
)

db = client[DB_NAME]

# Function to get a new database connection
async def get_database():
    """
    Create and return a new database connection.
    This is useful for tests to avoid event loop conflicts.

    Returns:
        A dictionary containing both the database and client objects.
    """
    new_client = motor.motor_asyncio.AsyncIOMotorClient(
        MONGODB_URL,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=10000,
        retryWrites=True
    )
    new_db = new_client[DB_NAME]
    return {
        "db": new_db,
        "client": new_client
    }

# Create indexes
async def create_indexes():
    """Create all required database indexes."""
    try:
        # Users collection indexes
        await db.users.create_index("username", unique=True)
        await db.users.create_index("email", unique=True)

        # Resources collection indexes
        await db.resources.create_index([("type", 1), ("user_id", 1)])
        await db.resources.create_index("created_at")

        # Reviews collection indexes
        await db.reviews.create_index([("resource_id", 1), ("user_id", 1)])
        await db.reviews.create_index("created_at")

        # Learning paths collection indexes
        await db.learning_paths.create_index("user_id")
        await db.learning_paths.create_index("created_at")

        logger.info("All database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {str(e)}")
        raise

async def verify_db_connection() -> bool:
    """
    Verify database connection is working.

    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        # Check connection
        await client.admin.command('ping')

        # Verify we can write to the database
        result = await db.connection_test.insert_one({"test": "connection"})
        await db.connection_test.delete_one({"_id": result.inserted_id})

        return True
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        return False

# Initialize database
async def init_db():
    """Initialize database with required indexes and verify connection."""
    try:
        # Verify connection
        if not await verify_db_connection():
            raise Exception("Could not verify database connection")

        # Create indexes
        await create_indexes()

        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise

# Ensure indexes are created when the application starts
if __name__ == "__main__":
    asyncio.run(init_db())