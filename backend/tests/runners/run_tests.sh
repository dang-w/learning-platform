#!/bin/bash

# Activate virtual environment if needed
# source .venv/bin/activate

# Set PYTHONPATH to include the parent directory (backend)
export PYTHONPATH=$PYTHONPATH:$(pwd)/..

# Check if MongoDB is running without trying to start it
if nc -z localhost 27017 &>/dev/null; then
    echo "MongoDB is running on localhost:27017"
else
    echo "MongoDB is not running on localhost:27017"

    # Ask if user wants to try to start MongoDB
    read -p "Do you want to try to start MongoDB? (y/n): " start_mongo

    if [[ "$start_mongo" =~ ^[Yy]$ ]]; then
        # Run the MongoDB helper script
        ./ensure_mongodb.sh
        if [ $? -ne 0 ]; then
            echo "Failed to start MongoDB. Tests may fail."
            # Ask if user wants to continue anyway
            read -p "Continue with tests anyway? (y/n): " continue_tests
            if [[ ! "$continue_tests" =~ ^[Yy]$ ]]; then
                echo "Exiting."
                exit 1
            fi
        fi
    else
        echo "Continuing without MongoDB. Tests will likely fail."
    fi
fi

# Install required packages
pip install pytest pytest-asyncio --quiet

# Run tests with more detailed output for debugging
echo "Running tests..."
cd .. && python -m pytest tests/ -v --no-summary --showlocals