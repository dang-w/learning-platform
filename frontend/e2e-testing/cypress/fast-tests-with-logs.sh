#!/bin/bash

# Fast Cypress test runner with enhanced logging
# This script includes:
# 1. Log collection from tests and backend
# 2. Parallel test execution
# 3. Performance optimizations
# 4. Test resilience improvements

# Stop on first error
set -e

# Clear previous reports and logs
echo "Cleaning previous reports and logs..."
rm -rf ./e2e-testing/reports/*
rm -rf ./e2e-testing/cypress/reports/*
rm -rf ./e2e-testing/cypress/screenshots/*
rm -rf ./e2e-testing/cypress/videos/*
rm -f ./e2e-testing/cypress/backend-errors.log

# Create necessary directories
mkdir -p ./e2e-testing/cypress/reports/fast
mkdir -p ./e2e-testing/cypress/logs

# Start collecting backend logs in background
./e2e-testing/cypress/backend-logs.sh &
BACKEND_LOGS_PID=$!

# Set optimized environment variables
export CYPRESS_VIDEO=false
export CYPRESS_viewportWidth=1024
export CYPRESS_viewportHeight=768
export CYPRESS_defaultCommandTimeout=8000
export CYPRESS_requestTimeout=10000
export CYPRESS_responseTimeout=10000
export CYPRESS_experimentalMemoryManagement=true
export CYPRESS_numTestsKeptInMemory=5

# Enable enhanced logging for tests
export CYPRESS_DEBUG=true
export CYPRESS_RECORD_LOGS=true
export CYPRESS_INCLUDE_API_RESPONSES=true

# Auto-detect thread count based on CPU cores
THREAD_COUNT=$(node -e "console.log(Math.max(2, require('os').cpus().length - 1))")
echo "Running with $THREAD_COUNT parallel threads"

# Set up test completion trap to ensure logs are collected
function cleanup {
  EXIT_CODE=$?

  # Stop backend log collection
  if [ ! -z "$BACKEND_LOGS_PID" ]; then
    kill $BACKEND_LOGS_PID || true
  fi

  # Generate summary report
  TIMESTAMP=$(date +%Y%m%d%H%M%S)
  SUMMARY_FILE="./e2e-testing/cypress/reports/summary/test-summary-$TIMESTAMP.md"

  mkdir -p ./e2e-testing/cypress/reports/summary

  echo "# E2E Test Run Summary" > $SUMMARY_FILE
  echo "Run completed at: $(date)" >> $SUMMARY_FILE
  echo "Duration: $SECONDS seconds" >> $SUMMARY_FILE
  echo "" >> $SUMMARY_FILE

  if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed!" >> $SUMMARY_FILE
  else
    echo "❌ Some tests failed. Exit code: $EXIT_CODE" >> $SUMMARY_FILE
    echo "" >> $SUMMARY_FILE
    echo "See screenshots and videos in the cypress directory for details." >> $SUMMARY_FILE
  fi

  echo "" >> $SUMMARY_FILE
  echo "Backend logs have been saved to \`./e2e-testing/cypress/backend-errors.log\`" >> $SUMMARY_FILE

  echo "Test summary saved to $SUMMARY_FILE"
  exit $EXIT_CODE
}

trap cleanup EXIT

# Run tests in parallel with custom reporter
echo "Starting parallel test run with enhanced logging..."
echo "Starting backend log capture..."
REPORTER_CONFIG_PATH="/Users/dan/code/learning-platform/frontend/multi-reporter-config.json"
CONFIG_FILE="e2e-testing/cypress/config/cypress.config.cjs"

# First attempt: Run with parallel reporter
npx cypress-parallel -s "cypress run --config-file $CONFIG_FILE" -t $THREAD_COUNT -d ./e2e-testing/cypress/e2e --specsDir ./e2e-testing/cypress/e2e --reporter cypress-multi-reporters --reporter-options configFile=$REPORTER_CONFIG_PATH

echo "Tests completed successfully!"