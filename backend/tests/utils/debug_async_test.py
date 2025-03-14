#!/usr/bin/env python3
"""
Debug script for async operations with MongoDB mocks.
This script helps identify issues with async operations in tests.
"""

import asyncio
import sys
import os
import traceback
from bson import ObjectId
import mongomock
import mongomock_motor
from datetime import datetime

# Add the parent directory to the path so we can import modules from the backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Set up a simple async function to test MongoDB operations
async def test_mongodb_operations():
    print("Starting MongoDB mock test...")

    # Create a mock MongoDB client
    try:
        print("Creating mongomock_motor client...")
        client = mongomock_motor.AsyncMongoMockClient()
        db = client["test_db"]
        print("✅ Successfully created mongomock_motor client")
    except Exception as e:
        print(f"❌ Error creating mongomock_motor client: {e}")
        traceback.print_exc()
        return False

    # Test basic operations
    try:
        print("\nTesting basic operations...")

        # Insert a document
        print("Inserting a document...")
        result = await db.users.insert_one({
            "_id": ObjectId(),
            "name": "Test User",
            "email": "test@example.com",
            "created_at": datetime.utcnow()
        })
        print(f"✅ Successfully inserted document with ID: {result.inserted_id}")

        # Find the document
        print("Finding the document...")
        user = await db.users.find_one({"email": "test@example.com"})
        if user:
            print(f"✅ Successfully found document: {user['name']}")
        else:
            print("❌ Document not found")
            return False

        # Update the document
        print("Updating the document...")
        update_result = await db.users.update_one(
            {"email": "test@example.com"},
            {"$set": {"name": "Updated User"}}
        )
        print(f"✅ Successfully updated document. Modified count: {update_result.modified_count}")

        # Find the updated document
        print("Finding the updated document...")
        updated_user = await db.users.find_one({"email": "test@example.com"})
        if updated_user and updated_user["name"] == "Updated User":
            print(f"✅ Successfully found updated document: {updated_user['name']}")
        else:
            print("❌ Document not updated correctly")
            return False

        # List collections
        print("Listing collections...")
        collections = await db.list_collection_names()
        print(f"✅ Collections: {collections}")

        # Test cursor operations
        print("Testing cursor operations...")
        # Insert multiple documents
        await db.items.insert_many([
            {"name": f"Item {i}", "value": i} for i in range(5)
        ])

        # Find with cursor
        print("Finding with cursor...")
        cursor = db.items.find({})
        items = []
        async for item in cursor:
            items.append(item)
        print(f"✅ Found {len(items)} items using cursor")

        # Delete documents
        print("Deleting documents...")
        delete_result = await db.users.delete_many({})
        print(f"✅ Successfully deleted documents. Deleted count: {delete_result.deleted_count}")

        print("\n✅ All basic operations completed successfully")
        return True

    except Exception as e:
        print(f"❌ Error during operations: {e}")
        traceback.print_exc()
        return False

# Test mongomock (non-async) for comparison
def test_mongomock_operations():
    print("\n\nTesting regular mongomock (non-async)...")

    try:
        # Create a regular mongomock client
        client = mongomock.MongoClient()
        db = client["test_db"]

        # Insert a document
        result = db.users.insert_one({
            "_id": ObjectId(),
            "name": "Test User",
            "email": "test@example.com",
            "created_at": datetime.utcnow()
        })

        # Find the document
        user = db.users.find_one({"email": "test@example.com"})

        # Update the document
        db.users.update_one(
            {"email": "test@example.com"},
            {"$set": {"name": "Updated User"}}
        )

        # Find the updated document
        updated_user = db.users.find_one({"email": "test@example.com"})

        # List collections
        collections = db.list_collection_names()

        # Test cursor operations
        db.items.insert_many([
            {"name": f"Item {i}", "value": i} for i in range(5)
        ])

        # Find with cursor
        cursor = db.items.find({})
        items = list(cursor)

        # Delete documents
        db.users.delete_many({})

        print("✅ Regular mongomock operations completed successfully")
        return True

    except Exception as e:
        print(f"❌ Error during regular mongomock operations: {e}")
        traceback.print_exc()
        return False

async def main():
    print("=" * 50)
    print("MongoDB Mock Async Operations Debug Tool")
    print("=" * 50)

    print("\nSystem Information:")
    print(f"Python version: {sys.version}")

    try:
        import pkg_resources
        print(f"mongomock version: {pkg_resources.get_distribution('mongomock').version}")
        print(f"mongomock-motor version: {pkg_resources.get_distribution('mongomock-motor').version}")
        print(f"motor version: {pkg_resources.get_distribution('motor').version if 'motor' in {pkg.key for pkg in pkg_resources.working_set} else 'Not installed'}")
        print(f"pymongo version: {pkg_resources.get_distribution('pymongo').version}")
    except Exception as e:
        print(f"Error getting package versions: {e}")

    print("\n" + "=" * 50)

    # Test async operations
    async_result = await test_mongodb_operations()

    # Test regular mongomock
    sync_result = test_mongomock_operations()

    print("\n" + "=" * 50)
    print("Summary:")
    print(f"Async MongoDB operations: {'✅ PASSED' if async_result else '❌ FAILED'}")
    print(f"Regular MongoDB operations: {'✅ PASSED' if sync_result else '❌ FAILED'}")
    print("=" * 50)

    if not async_result:
        print("\nTroubleshooting tips for async operations:")
        print("1. Make sure you're using the latest version of mongomock-motor")
        print("2. Check that you're properly awaiting all async operations")
        print("3. Ensure your event loop is properly set up in tests")
        print("4. Consider using FastAPI's dependency injection for testing instead of patching")

    return 0 if async_result and sync_result else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)