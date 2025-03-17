#!/usr/bin/env python
import os
import sys
import subprocess
import time

def setup_test_db():
    """Set up the test database."""
    print("Setting up test database...")
    result = subprocess.run(
        ["python", "tests/setup_test_env.py"],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=True,
        text=True
    )

    print(result.stdout)
    if result.stderr:
        print("STDERR:")
        print(result.stderr)

    return result.returncode == 0

def ensure_test_user():
    """Ensure the test user exists in the database."""
    print("Ensuring test user exists...")
    result = subprocess.run(
        ["python", "-c", """
import asyncio
from database import db

async def ensure_test_user():
    # Define test user data
    username = "testuser"
    user_data = {
        "username": username,
        "email": f"{username}@example.com",
        "full_name": "Test User",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
        "disabled": False,
        "resources": [],
        "study_sessions": [],
        "review_sessions": [],
        "learning_paths": [],
        "reviews": [],
        "concepts": [],
        "goals": [],
        "milestones": []
    }

    # Check if user already exists and delete if needed
    existing_user = await db.users.find_one({"username": username})
    if existing_user:
        await db.users.delete_one({"_id": existing_user["_id"]})

    # Insert the test user
    await db.users.insert_one(user_data)
    print(f"Test user '{username}' created successfully")

asyncio.run(ensure_test_user())
        """],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=True,
        text=True
    )

    print(result.stdout)
    if result.stderr:
        print("STDERR:")
        print(result.stderr)

    return result.returncode == 0

def create_conftest_override():
    """Create a temporary conftest_override.py file for dependency override."""
    conftest_override_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tests", "conftest_override.py")
    with open(conftest_override_path, "w") as f:
        f.write("""
import pytest
from fastapi.testclient import TestClient
from bson import ObjectId
import sys
import os

# Add the parent directory to the path so we can import main
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the app and auth modules
from main import app
from auth import get_current_user

@pytest.fixture(scope="session", autouse=True)
def override_dependencies():
    \"\"\"Override dependencies for all tests.\"\"\"
    # Override the get_current_user dependency for testing
    async def override_get_current_user():
        # Return a mock user
        return {
            "username": "testuser",
            "email": "testuser@example.com",
            "full_name": "Test User",
            "disabled": False,
            "_id": str(ObjectId()),
            "resources": [],
            "study_sessions": [],
            "review_sessions": [],
            "learning_paths": [],
            "reviews": [],
            "concepts": [],
            "goals": [],
            "milestones": []
        }

    # Apply the override
    app.dependency_overrides[get_current_user] = override_get_current_user

    yield

    # Clear the dependency override after tests
    app.dependency_overrides = {}
""")

    return conftest_override_path

def run_test(test_file):
    """Run a single test file with pytest."""
    print(f"\n\n{'='*80}")
    print(f"Running {test_file}")
    print(f"{'='*80}\n")

    # Set up the test database before each test
    if not setup_test_db():
        print("Failed to set up test database")
        return False

    # Ensure the test user exists in the database
    if not ensure_test_user():
        print("Failed to ensure test user exists")
        return False

    # Create the conftest override file
    conftest_override_path = create_conftest_override()

    # Run the test with pytest
    result = subprocess.run(
        ["python", "-m", "pytest", test_file, "-v", "-c", conftest_override_path],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=True,
        text=True
    )

    # Print the output
    print(result.stdout)
    if result.stderr:
        print("STDERR:")
        print(result.stderr)

    # Clean up the conftest override file
    try:
        os.remove(conftest_override_path)
    except:
        pass

    return result.returncode == 0

def main():
    """Run all integration tests."""
    test_files = [
        "tests/integration/test_auth.py",
        "tests/integration/test_auth_direct.py",
        "tests/integration/test_client_auth.py",
        "tests/integration/test_db.py",
        "tests/integration/test_api_endpoints.py",
        "tests/integration/test_user_profile.py",
        "tests/integration/test_resource_direct.py"
    ]

    # Initialize counters
    passed = 0
    failed = 0
    total = len(test_files)

    # Run each test file
    for test_file in test_files:
        if run_test(test_file):
            passed += 1
            print(f"✅ {test_file} PASSED")
        else:
            failed += 1
            print(f"❌ {test_file} FAILED")

        # Add a small delay to ensure event loops are properly cleaned up
        time.sleep(0.5)

    # Print summary
    print(f"\n\n{'='*80}")
    print(f"Test Summary:")
    print(f"Total: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"{'='*80}\n")

    # Return success if all tests passed
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())