#!/bin/bash

# Check if a test file was provided
if [ -z "$1" ]; then
    echo "Usage: $0 <test_file_path>"
    echo "Example: $0 test_auth_api.py"
    exit 1
fi

TEST_FILE=$1

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

# Copy the dependency injection conftest to the tests directory
echo "Setting up dependency injection configuration..."
cp conftest_dependency.py conftest.py

# Create a pytest.ini file with asyncio mode set to auto
echo "Creating pytest.ini with asyncio mode..."
cat > ../pytest.ini << EOF
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
EOF

# Run the specified test file with dependency injection
echo "Running test file with dependency injection: $TEST_FILE"
echo "This may take a while for the first run as the mocks are initialized..."

# Run with detailed error reporting
cd .. && python -m pytest "tests/$TEST_FILE" -v --no-header --showlocals --tb=native

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
    echo "✅ Test file passed successfully with dependency injection!"
else
    echo "❌ Test file failed with dependency injection. Exit code: $TEST_EXIT_CODE"
    echo "This could be due to limitations in the mock implementation or async compatibility issues."
    echo "Try running with --trace for more detailed debugging information:"
    echo "python -m pytest \"$TEST_FILE\" -v --trace"
fi

exit $TEST_EXIT_CODE