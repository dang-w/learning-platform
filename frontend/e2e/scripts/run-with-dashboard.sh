#!/bin/bash
# Script to run Cypress tests with Dashboard integration
# Usage: ./run-with-dashboard.sh [specPattern]

# Set colors for better output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================================="
echo -e "${BLUE}🚀 Running Cypress Tests with Dashboard Integration${NC}"
echo "=========================================================="

# Check if required environment variables are set
if [ -z "$CYPRESS_PROJECT_ID" ]; then
  echo -e "${YELLOW}⚠️  Warning: CYPRESS_PROJECT_ID environment variable not set.${NC}"
  echo -e "Please register your project at https://dashboard.cypress.io and set:"
  echo -e "export CYPRESS_PROJECT_ID=your-project-id"
  echo ""
  echo -e "${YELLOW}Continuing with placeholder value...${NC}"
fi

if [ -z "$CYPRESS_RECORD_KEY" ]; then
  echo -e "${YELLOW}⚠️  Warning: CYPRESS_RECORD_KEY environment variable not set.${NC}"
  echo -e "Please generate a record key in Cypress Dashboard and set:"
  echo -e "export CYPRESS_RECORD_KEY=your-record-key"
  echo ""
  echo -e "${RED}Error: Cannot continue without a record key.${NC}"
  echo -e "Exiting..."
  exit 1
fi

# Get spec pattern from command line args or use all tests
SPEC_PATTERN=${1:-"e2e/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}"}

# Create reports directory structure if it doesn't exist
mkdir -p e2e/cypress/reports/mochawesome
mkdir -p e2e/cypress/reports/junit
mkdir -p e2e/cypress/screenshots
mkdir -p e2e/cypress/videos

# Print test run info
echo -e "${BLUE}Cypress Project ID:${NC} $CYPRESS_PROJECT_ID"
echo -e "${BLUE}Spec Pattern:${NC} $SPEC_PATTERN"
echo -e "${BLUE}Environment:${NC} $([ "$CI" == "true" ] && echo "CI" || echo "Local")"
echo ""

# Set additional environment variables for testing
export CYPRESS_screenshotsFolder=e2e/cypress/screenshots
export CYPRESS_videosFolder=e2e/cypress/videos
export CYPRESS_RESILIENT_TESTS=true

# Run Cypress with dashboard recording
echo -e "${GREEN}Starting Cypress run with Dashboard recording...${NC}"
echo "=========================================================="

npx cypress run \
  --config-file e2e/cypress.config.mts \
  --spec "$SPEC_PATTERN" \
  --record \
  --parallel \
  --group "e2e-tests" \
  --tag "dashboard"

# Capture the exit code
EXIT_CODE=$?

echo "=========================================================="
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ Cypress tests completed successfully!${NC}"
else
  echo -e "${RED}❌ Cypress tests failed with exit code $EXIT_CODE${NC}"
fi

echo -e "${BLUE}📊 View results in Cypress Dashboard:${NC}"
echo -e "https://dashboard.cypress.io/projects/$CYPRESS_PROJECT_ID"
echo "=========================================================="

exit $EXIT_CODE