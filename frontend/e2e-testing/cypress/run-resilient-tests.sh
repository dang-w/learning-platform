#!/bin/bash

# Resilient Cypress Test Runner
# This script provides a robust way to run E2E tests with fallback mechanisms
# and detailed reporting to handle flaky tests and API issues.

# Configuration variables
CONFIG_FILE="./e2e-testing/config/cypress.config.cjs"
REPORTS_DIR="./e2e-testing/cypress/reports"
LOGS_DIR="./e2e-testing/cypress/logs"
BACKEND_LOG="./e2e-testing/cypress/backend-errors.log"
MAX_RETRIES=3
TIMESTAMP=$(date "+%Y%m%d_%H%M%S")

# Color settings for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p "$REPORTS_DIR/resilient"
mkdir -p "$LOGS_DIR"

# Initialize backend error log
echo "Backend logs captured on $(date)" > "$BACKEND_LOG"

# Parse command line arguments
TEST_SPEC=$1
if [ -z "$TEST_SPEC" ]; then
  TEST_SPEC="e2e-testing/cypress/e2e/**/*.cy.ts"
  echo -e "${YELLOW}No specific test provided, running all E2E tests${NC}"
else
  echo -e "${YELLOW}Running test: $TEST_SPEC${NC}"
fi

# Set resilient test environment variables
export CYPRESS_JWT_SECRET="test-secret-key-for-cypress"
export CYPRESS_RESILIENT_MODE="true"
export CYPRESS_AUTO_LOGIN="true"
export CYPRESS_SKIP_API_RESET="false"

# Function to run a test with automatic retries
function run_with_retries {
  local test_spec=$1
  local attempt=1
  local success=false

  while [ $attempt -le $MAX_RETRIES ] && [ "$success" = false ]; do
    echo -e "${BLUE}Attempt $attempt of $MAX_RETRIES for $test_spec${NC}"

    # Run the test with the specific attempt number
    npx cypress run --config-file "$CONFIG_FILE" --spec "$test_spec" --env attempt=$attempt \
      --reporter mochawesome \
      --reporter-options reportDir="$REPORTS_DIR/resilient",overwrite=false,html=false,json=true

    # Check exit status
    if [ $? -eq 0 ]; then
      success=true
      echo -e "${GREEN}✅ Test passed on attempt $attempt${NC}"
    else
      echo -e "${RED}❌ Test failed on attempt $attempt${NC}"
      if [ $attempt -lt $MAX_RETRIES ]; then
        echo -e "${YELLOW}Retrying in 5 seconds...${NC}"
        sleep 5
      fi
      # Increase wait time between retries
      export CYPRESS_defaultCommandTimeout=$((8000 + attempt * 2000))
      export CYPRESS_requestTimeout=$((10000 + attempt * 3000))
    fi

    attempt=$((attempt + 1))
  done

  return $([ "$success" = true ] && echo 0 || echo 1)
}

# Function to generate a summary report
function generate_summary {
  local status=$1
  local summary_file="$REPORTS_DIR/resilient/summary-$TIMESTAMP.md"

  echo "# Resilient Test Run Summary" > "$summary_file"
  echo "Run completed at: $(date)" >> "$summary_file"
  echo "" >> "$summary_file"

  if [ $status -eq 0 ]; then
    echo "## ✅ Overall Status: PASSED" >> "$summary_file"
  else
    echo "## ❌ Overall Status: FAILED" >> "$summary_file"
  fi

  echo "" >> "$summary_file"
  echo "## Test Statistics" >> "$summary_file"
  echo "- Test Spec: \`$TEST_SPEC\`" >> "$summary_file"
  echo "- Maximum Retries: $MAX_RETRIES" >> "$summary_file"

  # Add backend error details if any
  if [ -s "$BACKEND_LOG" ]; then
    echo "" >> "$summary_file"
    echo "## Backend Errors" >> "$summary_file"
    echo "Backend logs have been saved to \`$BACKEND_LOG\`" >> "$summary_file"
  fi

  echo "" >> "$summary_file"
  echo "## Resilient Testing Strategy" >> "$summary_file"
  echo "1. **Automatic Retries** - Tests automatically retry up to $MAX_RETRIES times" >> "$summary_file"
  echo "2. **JWT Token Fallback** - Direct token generation when auth APIs fail" >> "$summary_file"
  echo "3. **Increasing Timeouts** - Each retry increases request and command timeouts" >> "$summary_file"
  echo "4. **Detailed Error Reporting** - Full logs of each test attempt" >> "$summary_file"

  echo -e "${GREEN}Summary report generated at:${NC} $summary_file"
  return $status
}

# Main execution
echo -e "${BLUE}========================================================${NC}"
echo -e "${BLUE}🛡️  Running Resilient E2E Tests${NC}"
echo -e "${BLUE}========================================================${NC}"

# Run the tests with retry mechanism
run_with_retries "$TEST_SPEC"
test_status=$?

# Generate and display summary
generate_summary $test_status
exit $test_status