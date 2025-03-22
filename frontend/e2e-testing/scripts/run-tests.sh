#!/bin/bash
# Script to run Cypress tests with consolidated configuration
# Usage: ./run-tests.sh [specPattern]

# Set colors for better output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================================="
echo -e "${BLUE}🚀 Running Cypress Tests${NC}"
echo "=========================================================="

# Get spec pattern from command line args or use all tests
SPEC_PATTERN=${1:-"e2e-testing/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}"}

# Create reports directory structure if it doesn't exist
mkdir -p e2e-testing/reports/mochawesome
mkdir -p e2e-testing/reports/junit
mkdir -p e2e-testing/cypress/screenshots
mkdir -p e2e-testing/cypress/videos

# Print test run info
echo -e "${BLUE}Spec Pattern:${NC} $SPEC_PATTERN"
echo -e "${BLUE}Environment:${NC} $([ "$CI" == "true" ] && echo "CI" || echo "Local")"
echo ""

# Set additional environment variables for testing
export CYPRESS_screenshotsFolder=e2e-testing/cypress/screenshots
export CYPRESS_videosFolder=e2e-testing/cypress/videos
export CYPRESS_RESILIENT_TESTS=true

# Run Cypress with consolidated configuration
echo -e "${GREEN}Starting Cypress run...${NC}"
echo "=========================================================="

npx cypress run \
  --config-file e2e-testing/cypress.config.ts \
  --spec "$SPEC_PATTERN"

# Capture the exit code
EXIT_CODE=$?

echo "=========================================================="
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ Cypress tests completed successfully!${NC}"
else
  echo -e "${RED}❌ Cypress tests failed with exit code $EXIT_CODE${NC}"
fi

echo -e "${BLUE}📊 Test reports available at:${NC} e2e-testing/reports/mochawesome"
echo "=========================================================="

exit $EXIT_CODE