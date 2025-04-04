"""
Mock database module for testing.
This module provides a mock implementation of the database interface
that can be used for testing without requiring a real database connection.
"""
from typing import Dict, List, Any, Optional
from bson import ObjectId
import logging
from datetime import datetime, timedelta, timezone
import asyncio

# Import standardized error handlers
from utils.error_handlers import DatabaseError, ResourceNotFoundError

logger = logging.getLogger(__name__)

class MockCollection:
    """Mock collection for testing."""

    def __init__(self, name: str):
        self.name = name
        self.data = []
        self.indexes = {}
        self._event_loop = None
        logger.info(f"Created mock collection: {name}")

    def _get_event_loop(self):
        """Get the current event loop or create a new one."""
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop

    async def create_index(self, key, unique: bool = False) -> str:
        """Create an index on the collection."""
        self._event_loop = self._get_event_loop()
        logger.info(f"Creating index on {self.name} for key: {key}, unique: {unique}")
        index_key = str(key)
        self.indexes[index_key] = {"unique": unique}
        return index_key

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find a single document."""
        self._event_loop = self._get_event_loop()
        logger.info(f"Finding one in {self.name} with query: {query}")

        # Convert ObjectId to string for comparison
        if "_id" in query and isinstance(query["_id"], ObjectId):
            query["_id"] = str(query["_id"])

        for doc in self.data:
            matches = True
            for key, value in query.items():
                if isinstance(value, ObjectId):
                    if str(value) != str(doc.get(key)):
                        matches = False
                        break
                elif doc.get(key) != value:
                    matches = False
                    break
            if matches:
                return doc
        return None

    def find(self, query: Dict[str, Any] = None) -> "MockCursor":
        """Find documents matching query."""
        self._event_loop = self._get_event_loop()
        if query is None:
            query = {}

        # Convert ObjectId to string for comparison
        if "_id" in query and isinstance(query["_id"], ObjectId):
            query["_id"] = str(query["_id"])

        filtered_data = []
        for doc in self.data:
            matches = True
            for key, value in query.items():
                if isinstance(value, ObjectId):
                    if str(value) != str(doc.get(key)):
                        matches = False
                        break
                elif doc.get(key) != value:
                    matches = False
                    break
            if matches:
                filtered_data.append(doc)

        return MockCursor(filtered_data, self)

    async def insert_one(self, document: Dict[str, Any]) -> Any:
        """Insert a single document."""
        self._event_loop = self._get_event_loop()

        # Ensure document has an _id
        if "_id" not in document:
            document["_id"] = ObjectId()

        # Check unique indexes
        for index_key, index_info in self.indexes.items():
            if index_info.get("unique"):
                field = index_key.split("_")[0]  # Get the field name from the index key
                if field in document:
                    for existing_doc in self.data:
                        if existing_doc.get(field) == document[field]:
                            raise DatabaseError(f"Duplicate key error for unique index: {field}")

        self.data.append(document)
        return type("InsertOneResult", (), {"inserted_id": document["_id"]})

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> Any:
        """Update a single document."""
        self._event_loop = self._get_event_loop()

        # Convert ObjectId to string for comparison
        if "_id" in query and isinstance(query["_id"], ObjectId):
            query["_id"] = str(query["_id"])

        modified_count = 0
        for doc in self.data:
            matches = True
            for key, value in query.items():
                if isinstance(value, ObjectId):
                    if str(value) != str(doc.get(key)):
                        matches = False
                        break
                elif doc.get(key) != value:
                    matches = False
                    break
            if matches:
                if "$set" in update:
                    doc.update(update["$set"])
                else:
                    doc.update(update)
                modified_count = 1
                break

        return type("UpdateResult", (), {"modified_count": modified_count})

    async def delete_one(self, query: Dict[str, Any]) -> Any:
        """Delete a single document."""
        self._event_loop = self._get_event_loop()
        logger.info(f"Deleting one in {self.name} with query: {query}")

        # Convert ObjectId to string for comparison
        if "_id" in query and isinstance(query["_id"], ObjectId):
            query["_id"] = str(query["_id"])

        for i, doc in enumerate(self.data):
            matches = True
            for key, value in query.items():
                if isinstance(value, ObjectId):
                    if str(value) != str(doc.get(key)):
                        matches = False
                        break
                elif doc.get(key) != value:
                    matches = False
                    break
            if matches:
                del self.data[i]
                return {"deleted_count": 1}
        return {"deleted_count": 0}

    async def delete_many(self, query: Dict[str, Any]) -> Any:
        """Delete multiple documents."""
        self._event_loop = self._get_event_loop()
        logger.info(f"Deleting many in {self.name} with query: {query}")

        # Convert ObjectId to string for comparison
        if "_id" in query and isinstance(query["_id"], ObjectId):
            query["_id"] = str(query["_id"])

        deleted_count = 0
        i = 0
        while i < len(self.data):
            doc = self.data[i]
            matches = True
            for key, value in query.items():
                if isinstance(value, ObjectId):
                    if str(value) != str(doc.get(key)):
                        matches = False
                        break
                elif doc.get(key) != value:
                    matches = False
                    break
            if matches:
                del self.data[i]
                deleted_count += 1
            else:
                i += 1
        return {"deleted_count": deleted_count}

    async def count_documents(self, query: Dict[str, Any]) -> int:
        """Count documents matching query."""
        self._event_loop = self._get_event_loop()

        # Convert ObjectId to string for comparison
        if "_id" in query and isinstance(query["_id"], ObjectId):
            query["_id"] = str(query["_id"])

        count = 0
        for doc in self.data:
            matches = True
            for key, value in query.items():
                if isinstance(value, ObjectId):
                    if str(value) != str(doc.get(key)):
                        matches = False
                        break
                elif doc.get(key) != value:
                    matches = False
                    break
            if matches:
                count += 1

        return count

class MockCursor:
    """Mock cursor for testing."""

    def __init__(self, data: List[Dict[str, Any]], collection: 'MockCollection'):
        self.data = data
        self.collection = collection
        self._sort_field = None
        self._sort_direction = None
        self._skip_count = 0
        self._limit_count = None
        self._event_loop = None

    def _get_event_loop(self):
        """Get the current event loop or create a new one."""
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop

    def sort(self, field: str, direction: int = 1):
        """Sort the cursor results."""
        self._sort_field = field
        self._sort_direction = direction
        return self

    def skip(self, count: int):
        """Skip the first n results."""
        self._skip_count = count
        return self

    def limit(self, count: int):
        """Limit the number of results."""
        self._limit_count = count
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        """Convert cursor to list."""
        self._event_loop = self._get_event_loop()

        # Apply sorting if specified
        if self._sort_field:
            self.data.sort(
                key=lambda x: x.get(self._sort_field, ""),
                reverse=self._sort_direction == -1
            )

        # Apply skip and limit
        start = self._skip_count
        end = None if self._limit_count is None else start + self._limit_count

        return self.data[start:end]

class MockDatabase:
    """Mock database for testing."""

    def __init__(self):
        self.collections = {}
        self._event_loop = None
        logger.info("Created mock database")

    def _get_event_loop(self):
        """Get the current event loop or create a new one."""
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop

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
        "first_name": "Test",
        "last_name": "User",
        "disabled": False,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
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