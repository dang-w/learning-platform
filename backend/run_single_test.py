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

    # Build the pytest command
    pytest_cmd = ["python", "-m", "pytest", test_file, "-v"]
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

    return result.returncode == 0

def main():
    """Run a single test file or function."""
    parser = argparse.ArgumentParser(description="Run a single integration test")
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