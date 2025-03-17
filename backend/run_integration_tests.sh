#!/bin/bash

# Set up environment
echo "Setting up test environment..."
export $(grep -v '^#' .env.test | xargs)

# Check if MongoDB is running
echo "Checking if MongoDB is running..."
if ! nc -z localhost 27017; then
    echo "MongoDB is not running. Please start MongoDB first."
    echo "You can start MongoDB with: brew services start mongodb-community"
    exit 1
fi

# Set up test database
echo "Setting up test database..."
python tests/setup_test_env.py

# Ensure test user exists
echo "Ensuring test user exists..."
python -c "
import asyncio
from database import db

async def ensure_test_user():
    # Define test user data
    username = 'testuser'
    user_data = {
        'username': username,
        'email': f'{username}@example.com',
        'full_name': 'Test User',
        'hashed_password': '\$2b\$12\$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',  # password123
        'disabled': False,
        'resources': [],
        'study_sessions': [],
        'review_sessions': [],
        'learning_paths': [],
        'reviews': [],
        'concepts': [],
        'goals': [],
        'milestones': []
    }

    # Check if user already exists and delete if needed
    existing_user = await db.users.find_one({'username': username})
    if existing_user:
        await db.users.delete_one({'_id': existing_user['_id']})

    # Insert the test user
    await db.users.insert_one(user_data)
    print(f'Test user \"{username}\" created successfully')

asyncio.run(ensure_test_user())
"

# Run all integration tests using our custom script
echo "Running integration tests..."
python run_tests.py