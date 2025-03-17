#!/usr/bin/env python
import os
import sys
import subprocess
import time
import argparse

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

def create_override_script():
    """Create a temporary script to override dependencies."""
    script_content = """
# This is a temporary script to override dependencies for testing
import sys
import os
from fastapi import Depends
from bson import ObjectId

# Add the parent directory to the path so we can import main
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the app and auth modules
from main import app
from auth import get_current_user

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
"""

    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tests", "override_dependencies.py")
    with open(script_path, "w") as f:
        f.write(script_content)

    # Create an __init__.py file if it doesn't exist
    init_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tests", "__init__.py")
    if not os.path.exists(init_path):
        with open(init_path, "w") as f:
            f.write("# This file is required to make the directory a Python package\n")

    return script_path

def run_single_test(test_file, test_function=None):
    """Run a single test file or function with pytest."""
    print(f"\n\n{'='*80}")
    if test_function:
        print(f"Running {test_file}::{test_function}")
    else:
        print(f"Running {test_file}")
    print(f"{'='*80}\n")

    # Set up the test database
    if not setup_test_db():
        print("Failed to set up test database")
        return False

    # Ensure the test user exists
    if not ensure_test_user():
        print("Failed to ensure test user exists")
        return False

    # Create the override script
    override_script = create_override_script()

    # Create a temporary conftest_override.py file
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

    # Build the pytest command
    pytest_cmd = ["python", "-m", "pytest", test_file, "-v", "-c", conftest_override_path]
    if test_function:
        pytest_cmd.append(f"::{test_function}")

    # Run the test with pytest
    result = subprocess.run(
        pytest_cmd,
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=True,
        text=True
    )

    # Print the output
    print(result.stdout)
    if result.stderr:
        print("STDERR:")
        print(result.stderr)

    # Clean up the override script and conftest_override.py
    try:
        os.remove(override_script)
        os.remove(conftest_override_path)
    except:
        pass

    return result.returncode == 0

def main():
    """Run a single test file or function."""
    parser = argparse.ArgumentParser(description="Run a single integration test with dependency override")
    parser.add_argument("test_file", help="Path to the test file to run")
    parser.add_argument("--function", "-f", help="Specific test function to run")
    args = parser.parse_args()

    # Run the test
    success = run_single_test(args.test_file, args.function)

    # Print summary
    print(f"\n\n{'='*80}")
    if success:
        print(f"✅ Test PASSED")
    else:
        print(f"❌ Test FAILED")
    print(f"{'='*80}\n")

    # Return success if all tests passed
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())