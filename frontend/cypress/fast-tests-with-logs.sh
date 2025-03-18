#!/bin/bash

# Fast Cypress test runner with optimizations and backend logging
# This script combines the speed optimizations of fast-tests.sh with backend logging

# Set colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================================="
echo "🚀 ${GREEN}Running Optimized E2E Tests with Backend Logging${NC}"
echo "=========================================================="

# Create reports directory if it doesn't exist
mkdir -p ./cypress/reports/fast
mkdir -p ./cypress/reports/backend

# Define environment variables for test optimization
export CYPRESS_VIDEO=false
export CYPRESS_viewportWidth=1024
export CYPRESS_viewportHeight=768
export CYPRESS_defaultCommandTimeout=8000
export CYPRESS_requestTimeout=10000
export CYPRESS_responseTimeout=10000
export CYPRESS_experimentalMemoryManagement=true
export CYPRESS_numTestsKeptInMemory=5

# Generate timestamp for report files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKEND_LOG="./cypress/reports/backend/backend-log-${TIMESTAMP}.log"
ERRORS_LOG="./cypress/reports/backend/errors-log-${TIMESTAMP}.log"
SUMMARY_REPORT="./cypress/reports/backend/test-summary-${TIMESTAMP}.md"
BACKEND_ERRORS_LOG="./cypress/reports/backend/backend-errors.log"

# Check if the backend-logs.sh script exists
if [ -f "./cypress/backend-logs.sh" ]; then
  echo "${YELLOW}Starting backend server with logging...${NC}"
  bash ./cypress/backend-logs.sh > "$BACKEND_LOG" 2>&1 &
  BACKEND_PID=$!

  # Give the backend server time to start
  sleep 3
  echo "${GREEN}Backend server started with PID: ${BACKEND_PID}${NC}"
else
  echo "${YELLOW}Backend logging script not found, proceeding without backend logs${NC}"
fi

# Trap SIGINT to ensure proper cleanup
trap 'echo "${YELLOW}Shutting down...${NC}"; [ -n "$BACKEND_PID" ] && kill $BACKEND_PID; exit' SIGINT

# Set the number of parallel threads based on available CPU cores
# Get CPU count and use 75% of available cores (minimum 2)
CPU_COUNT=$(sysctl -n hw.ncpu || nproc || echo 4)
THREAD_COUNT=$(( CPU_COUNT * 3 / 4 ))
THREAD_COUNT=$(( THREAD_COUNT < 2 ? 2 : THREAD_COUNT ))

echo "${YELLOW}Running tests with ${THREAD_COUNT} parallel threads${NC}"

# Start time measurement
START_TIME=$(date +%s)

# Run tests in parallel
npx cypress-parallel -s cypress:headless -t $THREAD_COUNT -d cypress/e2e --specsDir cypress/e2e

# Capture exit code from tests
EXIT_CODE=$?

# End time measurement
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Filter backend logs for errors
if [ -f "$BACKEND_ERRORS_LOG" ]; then
  grep -i "error\|exception\|fail" "$BACKEND_ERRORS_LOG" > "$ERRORS_LOG" || echo "No errors found in logs" > "$ERRORS_LOG"
elif [ -f "$BACKEND_LOG" ]; then
  grep -i "error\|exception\|fail" "$BACKEND_LOG" > "$ERRORS_LOG" || echo "No errors found in logs" > "$ERRORS_LOG"
fi

# Generate summary report
echo "# E2E Test Run Summary - $(date)" > "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"
echo "## Test Results" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ ${GREEN}All tests passed!${NC}"
  echo "✅ **All tests passed!**" >> "$SUMMARY_REPORT"
else
  echo "❌ ${RED}Some tests failed.${NC}"
  echo "❌ **Some tests failed.**" >> "$SUMMARY_REPORT"
fi

echo "" >> "$SUMMARY_REPORT"
echo "Total execution time: ${DURATION} seconds" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"

# Add backend error information to summary
echo "## Backend Errors" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"

if [ -f "$ERRORS_LOG" ] && [ -s "$ERRORS_LOG" ]; then
  echo "Backend logs have been saved to \`$ERRORS_LOG\`" >> "$SUMMARY_REPORT"
  echo "" >> "$SUMMARY_REPORT"
  echo "### Error Summary" >> "$SUMMARY_REPORT"
  echo "The following errors were logged during test execution:" >> "$SUMMARY_REPORT"
  echo "" >> "$SUMMARY_REPORT"
  echo '```' >> "$SUMMARY_REPORT"
  head -n 20 "$ERRORS_LOG" >> "$SUMMARY_REPORT"

  # If there are more than 20 lines, add a note
  if [ $(wc -l < "$ERRORS_LOG") -gt 20 ]; then
    echo "... (see full log for more errors)" >> "$SUMMARY_REPORT"
  fi

  echo '```' >> "$SUMMARY_REPORT"
else
  echo "No backend errors were logged during this test run." >> "$SUMMARY_REPORT"
fi

# Add performance information
echo "" >> "$SUMMARY_REPORT"
echo "## Performance Metrics" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"
echo "- **Test Duration:** ${DURATION} seconds" >> "$SUMMARY_REPORT"
echo "- **Parallel Threads:** ${THREAD_COUNT}" >> "$SUMMARY_REPORT"
echo "- **Optimizations:** Reduced viewport, disabled video recording, session caching, experimental memory management" >> "$SUMMARY_REPORT"

# Stop backend logging if it was started
if [ -n "$BACKEND_PID" ]; then
  echo "${YELLOW}Stopping backend server (PID: ${BACKEND_PID})${NC}"
  kill $BACKEND_PID
fi

# Print summary location
echo ""
echo "${BLUE}Test execution completed in ${DURATION} seconds${NC}"
echo "${GREEN}Summary report saved to: ${SUMMARY_REPORT}${NC}"
echo "${GREEN}Full backend log saved to: ${BACKEND_LOG}${NC}"
echo "${GREEN}Backend errors log saved to: ${ERRORS_LOG}${NC}"
echo ""

exit $EXIT_CODE