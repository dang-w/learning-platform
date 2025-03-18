"""
Mock database module for testing.
This module provides a mock implementation of the database interface
that can be used for testing without requiring a real database connection.
"""
from typing import Dict, List, Any, Optional
from bson import ObjectId
import logging
from datetime import datetime

# Import standardized error handlers
from utils.error_handlers import DatabaseError, ResourceNotFoundError

logger = logging.getLogger(__name__)

class MockCollection:
    """Mock collection for testing."""

    def __init__(self, name: str):
        self.name = name
        self.data = []
        self.indexes = {}
        logger.info(f"Created mock collection: {name}")

    async def create_index(self, key, unique: bool = False) -> str:
        """Create an index on the collection.

        Args:
            key: Either a string for single field index or list of tuples for compound index
            unique: Whether the index should enforce uniqueness
        """
        logger.info(f"Creating index on {self.name} for key: {key}, unique: {unique}")

        # Convert the key to a string representation for storage
        if isinstance(key, list):
            # Handle compound indexes
            index_key = "_".join(f"{k}_{v}" for k, v in key)
        else:
            # Handle single field indexes
            index_key = str(key)

        self.indexes[index_key] = {"unique": unique}
        return f"{index_key}_1"

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

        # Check for unique constraints
        if self.name == "users" and "username" in document:
            existing = await self.find_one({"username": document["username"]})
            if existing:
                raise DatabaseError("Duplicate username")

        # Add _id if not present
        if "_id" not in document:
            document["_id"] = ObjectId()

        # Add standard fields for user documents
        if self.name == "users":
            # Ensure all required fields are present
            if "disabled" not in document:
                document["disabled"] = False

            if "is_active" not in document:
                document["is_active"] = True

            if "resources" not in document:
                document["resources"] = {
                    "articles": [],
                    "videos": [],
                    "courses": [],
                    "books": []
                }

            if "study_sessions" not in document:
                document["study_sessions"] = []

            if "review_sessions" not in document:
                document["review_sessions"] = []

            if "learning_paths" not in document:
                document["learning_paths"] = []

            if "reviews" not in document:
                document["reviews"] = []

            if "concepts" not in document:
                document["concepts"] = []

            if "goals" not in document:
                document["goals"] = []

        # Create a copy of the document to avoid modifying the original
        doc_copy = document.copy()
        self.data.append(doc_copy)

        class InsertOneResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id

        return InsertOneResult(doc_copy["_id"])

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

    async def command(self, command: str) -> Dict[str, Any]:
        """Execute a database command."""
        if command == "ping":
            return {"ok": 1}
        return {"ok": 0}

# Create a mock database instance
db = MockDatabase()

async def create_test_user():
    """Create a test user in the mock database."""
    # Check if the user already exists
    existing_user = await db.users.find_one({"username": "testuser"})
    if existing_user:
        return existing_user

    # Create a new test user with all required fields
    test_user = {
        "_id": ObjectId(),
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "disabled": False,
        "is_active": True,
        "created_at": datetime.utcnow(),
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
        "metrics": [],
        "review_log": {},
        "milestones": []
    }

    # Insert the user
    await db.users.insert_one(test_user)
    return test_user