"""
Mock database module for testing.
This module provides a mock implementation of the database interface
that can be used for testing without requiring a real database connection.
"""
from typing import Dict, List, Any, Optional
from bson import ObjectId
import logging

# Import standardized error handlers
from utils.error_handlers import DatabaseError, ResourceNotFoundError

logger = logging.getLogger(__name__)

class MockCollection:
    """Mock collection for testing."""

    def __init__(self, name: str):
        self.name = name
        self.data = []
        logger.info(f"Created mock collection: {name}")

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find a single document in the collection."""
        logger.info(f"Finding one in {self.name} with query: {query}")

        # Handle _id queries specially
        if "_id" in query and isinstance(query["_id"], ObjectId):
            for doc in self.data:
                if "_id" in doc and doc["_id"] == query["_id"]:
                    return doc
            return None

        # Handle other queries
        for doc in self.data:
            matches = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    matches = False
                    break
            if matches:
                return doc

        return None

    async def find(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find documents in the collection."""
        logger.info(f"Finding in {self.name} with query: {query}")

        results = []
        for doc in self.data:
            matches = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    matches = False
                    break
            if matches:
                results.append(doc)

        return results

    async def insert_one(self, document: Dict[str, Any]) -> Any:
        """Insert a document into the collection."""
        logger.info(f"Inserting one in {self.name}: {document}")

        # Add _id if not present
        if "_id" not in document:
            document["_id"] = ObjectId()

        self.data.append(document)

        class InsertOneResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id

        return InsertOneResult(document["_id"])

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> Any:
        """Update a document in the collection."""
        logger.info(f"Updating one in {self.name} with query: {query} and update: {update}")

        # Find the document to update
        for i, doc in enumerate(self.data):
            matches = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    matches = False
                    break

            if matches:
                # Handle $set operator
                if "$set" in update:
                    for key, value in update["$set"].items():
                        self.data[i][key] = value

                # Handle $unset operator
                if "$unset" in update:
                    for key in update["$unset"]:
                        if key in self.data[i]:
                            del self.data[i][key]

                # Handle $push operator
                if "$push" in update:
                    for key, value in update["$push"].items():
                        # Create nested objects if they don't exist
                        parts = key.split('.')
                        current = self.data[i]

                        # Navigate to the correct nested object
                        for j, part in enumerate(parts[:-1]):
                            if part not in current:
                                current[part] = {} if j < len(parts) - 2 else []
                            current = current[part]

                        # Add the value to the array
                        last_part = parts[-1]
                        if last_part not in current:
                            current[last_part] = []

                        if isinstance(current[last_part], list):
                            current[last_part].append(value)
                        else:
                            # If it's not a list, make it a list with the value
                            current[last_part] = [value]

                # Handle direct updates (no operators)
                for key, value in update.items():
                    if not key.startswith("$"):
                        self.data[i][key] = value

                class UpdateResult:
                    def __init__(self, matched_count, modified_count):
                        self.matched_count = matched_count
                        self.modified_count = modified_count

                return UpdateResult(1, 1)

        # No document found to update
        class UpdateResult:
            def __init__(self, matched_count, modified_count):
                self.matched_count = matched_count
                self.modified_count = modified_count

        return UpdateResult(0, 0)

    async def delete_one(self, query: Dict[str, Any]) -> Any:
        """Delete a document from the collection."""
        logger.info(f"Deleting one in {self.name} with query: {query}")

        for i, doc in enumerate(self.data):
            matches = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    matches = False
                    break

            if matches:
                self.data.pop(i)
                class DeleteResult:
                    def __init__(self, deleted_count):
                        self.deleted_count = deleted_count

                return DeleteResult(1)

        class DeleteResult:
            def __init__(self, deleted_count):
                self.deleted_count = deleted_count

        return DeleteResult(0)

    async def delete_many(self, query: Dict[str, Any]) -> Any:
        """Delete multiple documents from the collection."""
        logger.info(f"Deleting many in {self.name} with query: {query}")

        deleted_count = 0
        i = 0
        while i < len(self.data):
            doc = self.data[i]
            matches = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    matches = False
                    break

            if matches:
                self.data.pop(i)
                deleted_count += 1
            else:
                i += 1

        class DeleteResult:
            def __init__(self, deleted_count):
                self.deleted_count = deleted_count

        return DeleteResult(deleted_count)

    async def count_documents(self, query: Dict[str, Any]) -> int:
        """Count documents in the collection."""
        logger.info(f"Counting documents in {self.name} with query: {query}")

        count = 0
        for doc in self.data:
            matches = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    matches = False
                    break
            if matches:
                count += 1

        return count

class MockDatabase:
    """Mock database for testing."""

    def __init__(self):
        self.collections = {}
        logger.info("Created mock database")

    def __getattr__(self, name: str) -> MockCollection:
        """Get a collection by name."""
        if name not in self.collections:
            self.collections[name] = MockCollection(name)
        return self.collections[name]

    async def list_collection_names(self) -> List[str]:
        """List all collection names."""
        return list(self.collections.keys())

# Create a mock database instance
db = MockDatabase()

async def create_test_user():
    """Create a test user in the mock database."""
    # Check if the user already exists
    existing_user = await db.users.find_one({"username": "testuser"})
    if existing_user:
        return existing_user

    # Create a new test user
    test_user = {
        "_id": "testuser",
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "disabled": False,
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
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

    # Insert the user
    await db.users.insert_one(test_user)
    return test_user