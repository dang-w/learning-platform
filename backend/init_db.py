import os
import asyncio
import motor.motor_asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get MongoDB connection string from environment variables
MONGODB_URL = os.getenv("MONGODB_URL")

async def init_database():
    try:
        # Create a Motor client
        client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)

        # Get database
        db = client.learning_platform_db
        print(f"Connected to database: learning_platform_db")

        # Create collections if they don't exist
        collections_to_create = [
            "users",
            "resources",
            "metrics",
            "concepts",
            "goals",
            "milestones",
            "roadmaps"
        ]

        existing_collections = await db.list_collection_names()

        for collection_name in collections_to_create:
            if collection_name not in existing_collections:
                await db.create_collection(collection_name)
                print(f"Created collection: {collection_name}")
            else:
                print(f"Collection already exists: {collection_name}")

        # Create indexes

        # Users collection - username and email should be unique
        await db.users.create_index("username", unique=True)
        await db.users.create_index("email", unique=True)
        print("Created indexes for users collection")

        # Resources collection - index by type and completion status
        await db.resources.create_index([("user_id", 1), ("type", 1)])
        await db.resources.create_index([("user_id", 1), ("completed", 1)])
        await db.resources.create_index([("user_id", 1), ("topics", 1)])
        print("Created indexes for resources collection")

        # Metrics collection - index by date
        await db.metrics.create_index([("user_id", 1), ("date", -1)])
        print("Created indexes for metrics collection")

        # Concepts collection - index by next review date
        await db.concepts.create_index([("user_id", 1), ("next_review", 1)])
        await db.concepts.create_index([("user_id", 1), ("topics", 1)])
        print("Created indexes for concepts collection")

        # Goals collection - index by priority and completion status
        await db.goals.create_index([("user_id", 1), ("priority", -1)])
        await db.goals.create_index([("user_id", 1), ("completed", 1)])
        print("Created indexes for goals collection")

        # Milestones collection - index by target date
        await db.milestones.create_index([("user_id", 1), ("target_date", 1)])
        print("Created indexes for milestones collection")

        print("✅ Database initialization completed successfully!")

    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
    finally:
        # Close the connection
        client.close()
        print("Connection closed")

if __name__ == "__main__":
    # Run the async function
    asyncio.run(init_database())