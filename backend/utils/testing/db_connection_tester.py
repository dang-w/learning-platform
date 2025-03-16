import os
import asyncio
import motor.motor_asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get MongoDB connection string from environment variables
MONGODB_URL = os.getenv("MONGODB_URL")

async def test_connection():
    try:
        # Create a Motor client
        client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)

        # Get database and collection
        db = client.learning_platform_db

        # Ping the database to test connection
        await db.command("ping")
        print("✅ Successfully connected to MongoDB Atlas!")

        # List all collections in the database
        collections = await db.list_collection_names()
        print(f"Collections in database: {collections}")

        # Create a test collection if it doesn't exist
        if "test_collection" not in collections:
            await db.create_collection("test_collection")
            print("Created test_collection")

        # Insert a test document
        result = await db.test_collection.insert_one({"test": "connection", "status": "success"})
        print(f"Inserted document with ID: {result.inserted_id}")

        # Retrieve the document
        doc = await db.test_collection.find_one({"test": "connection"})
        print(f"Retrieved document: {doc}")

    except Exception as e:
        print(f"❌ Failed to connect to MongoDB Atlas: {e}")
    finally:
        # Close the connection
        client.close()
        print("Connection closed")

if __name__ == "__main__":
    # Run the async function
    asyncio.run(test_connection())