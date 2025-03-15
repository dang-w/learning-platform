#!/bin/bash

# Check if a test file was provided
if [ -z "$1" ]; then
    echo "Usage: $0 <test_file_path>"
    echo "Example: $0 api/test_auth_api.py"
    exit 1
fi

TEST_FILE=$1

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

# Get the absolute path of the test file
if [[ "$TEST_FILE" == /* ]]; then
    # Absolute path provided
    ABSOLUTE_TEST_FILE="$TEST_FILE"
elif [[ "$TEST_FILE" == tests/* ]]; then
    # Path includes 'tests/' prefix
    ABSOLUTE_TEST_FILE="$BACKEND_DIR/$TEST_FILE"
else
    # Path is relative to the tests directory
    ABSOLUTE_TEST_FILE="$TESTS_DIR/$TEST_FILE"
fi

# Check if the test file exists
if [ ! -f "$ABSOLUTE_TEST_FILE" ]; then
    echo "Error: Test file '$TEST_FILE' not found at '$ABSOLUTE_TEST_FILE'."
    echo "Current directory: $CURRENT_DIR"
    echo "Tests directory: $TESTS_DIR"
    echo "Backend directory: $BACKEND_DIR"
    exit 1
fi

# Get the relative path from the backend directory
RELATIVE_TEST_FILE="${ABSOLUTE_TEST_FILE#$BACKEND_DIR/}"

# Backup existing pytest.ini if it exists
if [ -f "$BACKEND_DIR/pytest.ini" ]; then
    echo "Backing up existing pytest.ini..."
    cp "$BACKEND_DIR/pytest.ini" "$BACKEND_DIR/pytest.ini.bak"
fi

# Backup existing conftest.py if it exists
if [ -f "$TESTS_DIR/conftest.py" ]; then
    echo "Backing up original conftest.py..."
    cp "$TESTS_DIR/conftest.py" "$TESTS_DIR/conftest.py.bak"
fi

# Install required packages
echo "Installing required packages..."
pip install pytest pytest-asyncio mongomock mongomock-motor --quiet

# Copy the mock conftest to the tests directory
echo "Setting up mock MongoDB configuration..."
CONFTEST_MOCK_PATH="$TESTS_DIR/config/conftest_mock.py"
echo "Looking for conftest_mock.py at: $CONFTEST_MOCK_PATH"

if [ -f "$CONFTEST_MOCK_PATH" ]; then
    cp "$CONFTEST_MOCK_PATH" "$TESTS_DIR/conftest.py"
else
    echo "Error: conftest_mock.py not found at $CONFTEST_MOCK_PATH"
    echo "Current directory: $(pwd)"
    echo "TESTS_DIR: $TESTS_DIR"
    echo "Listing files in $TESTS_DIR:"
    ls -la "$TESTS_DIR"
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

# Run the specified test file with mock MongoDB
echo "Running test file with mock MongoDB: $RELATIVE_TEST_FILE"
echo "This may take a while for the first run as the mocks are initialized..."

# Run with detailed error reporting
cd "$BACKEND_DIR" && python -m pytest "$RELATIVE_TEST_FILE" -v --no-header --showlocals --tb=native

# Store the exit code
TEST_EXIT_CODE=$?

# Change back to the original directory
cd "$CURRENT_DIR" || { echo "Error: Could not change back to original directory"; exit 1; }

# Restore the original conftest if backup exists
if [ -f "$TESTS_DIR/conftest.py.bak" ]; then
    echo "Restoring original conftest.py..."
    mv "$TESTS_DIR/conftest.py.bak" "$TESTS_DIR/conftest.py"
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
    echo "✅ Test file passed successfully with mock MongoDB!"
else
    echo "❌ Test file failed with mock MongoDB. Exit code: $TEST_EXIT_CODE"
    echo "This could be due to limitations in the mongomock-motor library or async compatibility issues."
    echo "Try running with --trace for more detailed debugging information:"
    echo "python -m pytest \"$RELATIVE_TEST_FILE\" -v --trace"
fi

exit $TEST_EXIT_CODE