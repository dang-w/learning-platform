#!/bin/bash

# Activate virtual environment if needed
# source .venv/bin/activate

# Set PYTHONPATH to include the parent directory (backend)
export PYTHONPATH=$PYTHONPATH:$(pwd)/..

# Get the current directory
CURRENT_DIR=$(pwd)

# Determine if we're in the tests directory or the backend directory
if [[ "$CURRENT_DIR" == */tests ]]; then
    # We're in the tests directory
    TESTS_DIR="$CURRENT_DIR"
    BACKEND_DIR="$(dirname "$CURRENT_DIR")"
elif [[ "$CURRENT_DIR" == */tests/runners ]]; then
    # We're in the runners directory
    TESTS_DIR="$(dirname "$CURRENT_DIR")"
    BACKEND_DIR="$(dirname "$TESTS_DIR")"
else
    # Assume we're in the backend directory
    BACKEND_DIR="$CURRENT_DIR"
    TESTS_DIR="$CURRENT_DIR/tests"
fi

# Create a backup of the original conftest.py if it exists
if [ -f "$TESTS_DIR/conftest.py" ]; then
    echo "Backing up original conftest.py..."
    cp "$TESTS_DIR/conftest.py" "$TESTS_DIR/conftest.py.bak"
fi

# Backup existing pytest.ini if it exists
if [ -f "$BACKEND_DIR/pytest.ini" ]; then
    echo "Backing up existing pytest.ini..."
    cp "$BACKEND_DIR/pytest.ini" "$BACKEND_DIR/pytest.ini.bak"
fi

# Install required packages
echo "Installing required packages..."
pip install pytest pytest-asyncio mongomock mongomock-motor --quiet

# Copy the mock conftest to the tests directory
echo "Setting up mock MongoDB configuration..."
CONFTEST_MOCK_PATH="$TESTS_DIR/config/conftest_mock.py"

if [ -f "$CONFTEST_MOCK_PATH" ]; then
    cp "$CONFTEST_MOCK_PATH" "$TESTS_DIR/conftest.py"
else
    echo "Error: conftest_mock.py not found at $CONFTEST_MOCK_PATH"
    echo "Current directory: $(pwd)"
    echo "TESTS_DIR: $TESTS_DIR"
    echo "Listing files in $TESTS_DIR/config:"
    ls -la "$TESTS_DIR/config"
    exit 1
fi

# Create a pytest.ini file with asyncio mode set to auto
echo "Creating pytest.ini with asyncio mode..."
cat > "$BACKEND_DIR/pytest.ini" << EOF
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
EOF

# Run all tests with mock MongoDB
echo "Running all tests with mock MongoDB..."
echo "This may take a while for the first run as the mocks are initialized..."

# Run with detailed error reporting
cd "$BACKEND_DIR" && python -m pytest tests/ -v --no-header

# Store the exit code
TEST_EXIT_CODE=$?

# Change back to the original directory
cd "$CURRENT_DIR" || { echo "Error: Could not change back to original directory"; exit 1; }

# Restore the original conftest if backup exists
if [ -f "$TESTS_DIR/conftest.py.bak" ]; then
    echo "Restoring original conftest.py..."
    mv "$TESTS_DIR/conftest.py.bak" "$TESTS_DIR/conftest.py"
else
    echo "No backup found, using git to restore original conftest.py..."
    # Try to restore using git
    if command -v git &>/dev/null && [ -d "$BACKEND_DIR/.git" ]; then
        git checkout -- "$TESTS_DIR/conftest.py"
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
    echo "Try running specific test files for more detailed information."
fi

exit $TEST_EXIT_CODE