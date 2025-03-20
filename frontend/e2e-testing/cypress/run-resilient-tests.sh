#!/bin/bash

# Configuration
MAX_ATTEMPTS=3
RETRY_DELAY=5
# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Use an absolute path for CONFIG_FILE
CONFIG_FILE="$SCRIPT_DIR/../../e2e-testing/config/cypress.config.ts"
REPORT_DIR="reports/resilient"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create report directory if it doesn't exist
mkdir -p "$REPORT_DIR"

# Function to run a test with retries
run_test_with_retries() {
    local test_spec=$1
    local attempt=1
    local test_passed=false

    echo "Running test: $test_spec"
    echo "========================================================"
    echo "🛡️  Running Resilient E2E Tests"
    echo "========================================================"

    while [ $attempt -le $MAX_ATTEMPTS ] && [ "$test_passed" = false ]; do
        echo "Attempt $attempt of $MAX_ATTEMPTS for $test_spec"

        # Run the test with the consolidated config
        if npx cypress run --config-file "$CONFIG_FILE" --spec "$test_spec"; then
            test_passed=true
            echo "✅ Test passed on attempt $attempt"
        else
            echo "❌ Test failed on attempt $attempt"
            if [ $attempt -lt $MAX_ATTEMPTS ]; then
                echo "Retrying in $RETRY_DELAY seconds..."
                sleep $RETRY_DELAY
            fi
        fi

        ((attempt++))
    done

    return $([ "$test_passed" = true ])
}

# Main execution
if [ -n "$1" ]; then
    # Run specific test file
    test_spec="$1"
    # Remove any quotes that might have been passed in
    test_spec="${test_spec//\'/}"
    test_spec="${test_spec//\"/}"
    run_test_with_retries "$test_spec"
    exit_code=$?
else
    # Run all test files
    echo "No specific test provided, running all E2E tests"
    run_test_with_retries "e2e-testing/cypress/e2e/**/*.cy.ts"
    exit_code=$?
fi

# Generate summary report
summary_file="$REPORT_DIR/summary-$TIMESTAMP.md"
echo "# E2E Test Summary" > "$summary_file"
echo "## Run Details" >> "$summary_file"
echo "- Date: $(date)" >> "$summary_file"
echo "- Configuration: $CONFIG_FILE" >> "$summary_file"
echo "- Test Spec: ${test_spec:-'All Tests'}" >> "$summary_file"
echo "- Exit Code: $exit_code" >> "$summary_file"

echo "Summary report generated at: $summary_file"
exit $exit_code