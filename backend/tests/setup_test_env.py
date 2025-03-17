import os
import sys
import asyncio
from dotenv import load_dotenv

# Add the parent directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load test environment variables
load_dotenv('.env.test')

from database import db, init_db

async def setup_test_database():
    """
    Set up the test database by creating necessary indexes and collections.
    """
    print("Setting up test database...")

    # Initialize the database (create indexes)
    await init_db()

    # Clear existing data
    collections = await db.list_collection_names()
    for collection in collections:
        await db[collection].drop()

    print(f"Test database '{os.getenv('DB_NAME')}' initialized successfully")

if __name__ == "__main__":
    asyncio.run(setup_test_database())