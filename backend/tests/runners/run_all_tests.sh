#!/bin/bash

# Activate virtual environment if needed
# source .venv/bin/activate

# Set PYTHONPATH to include the parent directory (backend)
export PYTHONPATH=$PYTHONPATH:$(pwd)/..

# Backup existing pytest.ini if it exists
if [ -f "../../pytest.ini" ]; then
    echo "Backing up existing pytest.ini..."
    cp ../../pytest.ini ../../pytest.ini.bak
fi

# Create a pytest.ini file with asyncio mode set to auto
echo "Creating pytest.ini with asyncio mode..."
cat > ../../pytest.ini << EOF
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
EOF

# Check if MongoDB is running
if nc -z localhost 27017 &>/dev/null; then
    echo "MongoDB is running on localhost:27017"
else
    echo "MongoDB is not running on localhost:27017"

    # Ask if user wants to try to start MongoDB
    read -p "Do you want to try to start MongoDB? (y/n): " start_mongo

    if [[ "$start_mongo" =~ ^[Yy]$ ]]; then
        # Run the MongoDB helper script if it exists
        if [ -f "../config/ensure_mongodb.sh" ]; then
            ../config/ensure_mongodb.sh
        else
            echo "MongoDB helper script not found. Please start MongoDB manually."
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
echo "Installing required packages..."
pip install pytest pytest-asyncio --quiet

# Run all tests with verbose output
echo "Running all tests..."
cd ../.. && python -m pytest tests/ -v --no-header

# Store the exit code
TEST_EXIT_CODE=$?

# Change back to the tests directory
cd tests

# Restore original pytest.ini if it exists
if [ -f "../pytest.ini.bak" ]; then
    echo "Restoring original pytest.ini..."
    mv ../pytest.ini.bak ../pytest.ini
else
    # Try to restore using git
    if command -v git &>/dev/null && [ -d "../.git" ]; then
        git checkout -- ../pytest.ini
    else
        # If no git, just remove the file
        rm -f ../pytest.ini
    fi
fi

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed successfully!"
else
    echo "❌ Some tests failed. Exit code: $TEST_EXIT_CODE"
    echo "Try running specific test files for more detailed information."
fi

exit $TEST_EXIT_CODE