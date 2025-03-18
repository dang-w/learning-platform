#!/bin/bash

# Fast Cypress test runner with optimizations
# This script optimizes Cypress test runs by:
# 1. Using spec isolation
# 2. Running tests in parallel
# 3. Disabling video recording
# 4. Using a decreased viewport size
# 5. Caching test results

# Set colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================================="
echo "🚀 ${GREEN}Running Optimized E2E Tests${NC}"
echo "=========================================================="

# Create reports directory if it doesn't exist
mkdir -p ./cypress/reports/fast

# Define environment variables for test optimization
export CYPRESS_VIDEO=false
export CYPRESS_viewportWidth=1024
export CYPRESS_viewportHeight=768
export CYPRESS_defaultCommandTimeout=8000
export CYPRESS_requestTimeout=10000
export CYPRESS_responseTimeout=10000
export CYPRESS_experimentalMemoryManagement=true
export CYPRESS_numTestsKeptInMemory=5

# Set the number of parallel threads based on available CPU cores
# Get CPU count and use 75% of available cores (minimum 2)
CPU_COUNT=$(sysctl -n hw.ncpu || nproc || echo 4)
THREAD_COUNT=$(( CPU_COUNT * 3 / 4 ))
THREAD_COUNT=$(( THREAD_COUNT < 2 ? 2 : THREAD_COUNT ))

echo "${YELLOW}Running tests with ${THREAD_COUNT} parallel threads${NC}"

# Run tests in parallel
npx cypress-parallel -s cypress:headless -t $THREAD_COUNT -d cypress/e2e --specsDir cypress/e2e

# Check exit status
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "${GREEN}✓ All tests passed!${NC}"
else
  echo "${RED}✗ Some tests failed.${NC}"
fi

echo "Tests completed in $(( SECONDS )) seconds"
exit $EXIT_CODE