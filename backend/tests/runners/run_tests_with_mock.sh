#!/bin/bash

# Activate virtual environment if needed
# source .venv/bin/activate

# Set PYTHONPATH to include the parent directory (backend)
export PYTHONPATH=$PYTHONPATH:$(pwd)/..

# Get the current directory
CURRENT_DIR=$(pwd)

# Check if we're already in the tests directory
if [[ "$CURRENT_DIR" == */tests ]]; then
    TESTS_DIR="$CURRENT_DIR"
    BACKEND_DIR="$(dirname "$CURRENT_DIR")"
else
    # Assume we're in the backend directory
    BACKEND_DIR="$CURRENT_DIR"
    TESTS_DIR="$CURRENT_DIR/tests"

    # Change to the tests directory if we're not already there
    cd "$TESTS_DIR" || { echo "Error: Could not change to tests directory"; exit 1; }
fi

# Create a backup of the original conftest.py if it exists
if [ -f "conftest.py" ]; then
    echo "Backing up original conftest.py..."
    cp conftest.py conftest.py.bak
fi

# Install required packages
echo "Installing required packages..."
pip install pytest pytest-asyncio mongomock mongomock-motor --quiet

# Copy the mock conftest to the tests directory
echo "Setting up mock MongoDB configuration..."
if [ -f "config/conftest_mock.py" ]; then
    cp config/conftest_mock.py conftest.py
else
    echo "Error: conftest_mock.py not found at config/conftest_mock.py"
    echo "Current directory: $(pwd)"
    echo "Listing files in config:"
    ls -la config
    exit 1
fi

# Create a pytest.ini file with asyncio mode set to auto in the parent directory
echo "Creating pytest.ini with asyncio mode..."
cat > "$BACKEND_DIR/pytest.ini" << EOF
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
EOF

# Run tests with mock MongoDB
echo "Running tests with mock MongoDB..."
echo "This may take a while for the first run as the mocks are initialized..."

# Run with detailed error reporting
cd "$BACKEND_DIR" && python -m pytest tests/api/ tests/services/ -v --no-header --showlocals

# Store the exit code
TEST_EXIT_CODE=$?

# Change back to the tests directory
cd "$TESTS_DIR" || { echo "Error: Could not change back to tests directory"; exit 1; }

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
if [ -f "$BACKEND_DIR/pytest.ini.bak" ]; then
    echo "Restoring original pytest.ini..."
    mv "$BACKEND_DIR/pytest.ini.bak" "$BACKEND_DIR/pytest.ini"
else
    # Try to restore using git
    if command -v git &>/dev/null && [ -d "$BACKEND_DIR/.git" ]; then
        git checkout -- "$BACKEND_DIR/pytest.ini"
    else
        # If no git, just remove the file
        rm -f "$BACKEND_DIR/pytest.ini"
    fi
fi

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed successfully with mock MongoDB!"
else
    echo "❌ Some tests failed with mock MongoDB. Exit code: $TEST_EXIT_CODE"
    echo "This could be due to limitations in the mongomock-motor library or async compatibility issues."
    echo "Consider running specific tests with './runners/run_single_test_with_mock.sh tests/api/test_file.py' for more details."
fi

exit $TEST_EXIT_CODE