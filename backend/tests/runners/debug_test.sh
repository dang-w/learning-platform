#!/bin/bash

# Check if a test file was provided
if [ -z "$1" ]; then
    echo "Usage: $0 <test_file_path> [mock|dependency]"
    echo "Example: $0 test_auth_api.py mock"
    exit 1
fi

TEST_FILE=$1
APPROACH=${2:-"mock"}  # Default to mock if not specified

# Check if the test file exists
if [ ! -f "$TEST_FILE" ]; then
    # If the path doesn't include "tests/", try prepending it
    if [[ "$TEST_FILE" != tests/* ]] && [[ "$TEST_FILE" != */tests/* ]]; then
        if [ -f "$TEST_FILE" ]; then
            # File exists in current directory
            TEST_FILE="$TEST_FILE"
        else
            echo "Error: Test file '$TEST_FILE' not found."
            exit 1
        fi
    else
        echo "Error: Test file '$TEST_FILE' not found."
        exit 1
    fi
fi

# Validate approach
if [ "$APPROACH" != "mock" ] && [ "$APPROACH" != "dependency" ]; then
    echo "Error: Invalid approach. Must be 'mock' or 'dependency'."
    echo "Usage: $0 <test_file_path> [mock|dependency]"
    exit 1
fi

# Activate virtual environment if needed
# source .venv/bin/activate

# Set PYTHONPATH to include the parent directory (backend)
export PYTHONPATH=$PYTHONPATH:$(pwd)/..

# Create a backup of the original conftest.py if it exists
if [ -f "conftest.py" ]; then
    echo "Backing up original conftest.py..."
    cp conftest.py conftest.py.bak
fi

# Backup existing pytest.ini if it exists
if [ -f "../pytest.ini" ]; then
    echo "Backing up existing pytest.ini..."
    cp ../pytest.ini ../pytest.ini.bak
fi

# Install required packages
echo "Installing required packages..."
pip install pytest pytest-asyncio mongomock mongomock-motor --quiet

# Set up the appropriate conftest file
if [ "$APPROACH" == "mock" ]; then
    echo "Setting up mock MongoDB configuration..."
    cp conftest_mock.py conftest.py
else
    echo "Setting up dependency injection configuration..."
    cp conftest_dependency.py conftest.py
fi

# Create a pytest.ini file with asyncio mode set to auto
echo "Creating pytest.ini with asyncio mode..."
cat > ../pytest.ini << EOFMARKER
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
EOFMARKER

# Run the specified test file with detailed debugging
echo "Running test file with $APPROACH approach: $TEST_FILE"
echo "This may take a while for the first run as the mocks are initialized..."

# Run with detailed error reporting and debugging
cd .. && python -m pytest "tests/$TEST_FILE" -v --no-header --showlocals --tb=native --trace -s

# Store the exit code
TEST_EXIT_CODE=$?

# Change back to the tests directory
cd tests

# Restore the original conftest if backup exists
if [ -f "conftest.py.bak" ]; then
    echo "Restoring original conftest.py..."
    mv conftest.py.bak conftest.py
else
    echo "No backup found, using git to restore original conftest.py..."
    # Try to restore using git
    if command -v git &>/dev/null && [ -d "../.git" ]; then
        git checkout -- conftest.py
    fi
fi

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
    echo "✅ Test file passed successfully with $APPROACH approach!"
else
    echo "❌ Test file failed with $APPROACH approach. Exit code: $TEST_EXIT_CODE"
    echo "This could be due to limitations in the mock implementation or async compatibility issues."
    echo ""
    echo "Debugging tips:"
    echo "1. Check for 'coroutine object is not iterable' errors - make sure all async functions are properly awaited"
    echo "2. Check for event loop issues - make sure the event loop fixture is properly set up"
    echo "3. Run the debug_async_test.py script to test basic MongoDB operations"
    echo "4. Try the other approach (mock or dependency) to see if it works better"
fi

exit $TEST_EXIT_CODE