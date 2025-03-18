#!/bin/bash

# Cleanup script to remove old E2E testing files from the frontend root
# Only run this after confirming the new structure works properly

# Set colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================================${NC}"
echo -e "${BLUE}🧹 Cleaning up old E2E test files${NC}"
echo -e "${BLUE}========================================================${NC}"

# Check if we're in the right directory
if [ ! -d "./e2e-testing" ]; then
  echo -e "${RED}Error: This script must be run from the frontend directory${NC}"
  exit 1
fi

echo -e "${YELLOW}Removing old files and directories...${NC}"

# Remove old cypress directory (after confirming it exists and we've moved it)
if [ -d "./cypress" ] && [ -d "./e2e-testing/cypress" ]; then
  echo "Removing old cypress directory..."
  rm -rf ./cypress
else
  echo -e "${YELLOW}Old cypress directory not found or not yet moved - skipping${NC}"
fi

# Remove old reports
if [ -d "./mochawesome-report" ]; then
  echo "Removing old mochawesome-report directory..."
  rm -rf ./mochawesome-report
fi

# Remove old runner-results
if [ -d "./runner-results" ]; then
  echo "Removing old runner-results directory..."
  rm -rf ./runner-results
fi

# Remove old config file
if [ -f "./cypress.config.ts" ]; then
  echo "Removing old cypress.config.ts..."
  rm ./cypress.config.ts
fi

# Remove old multi-reporter-config
if [ -f "./multi-reporter-config.json" ]; then
  echo "Removing old multi-reporter-config.json..."
  rm ./multi-reporter-config.json
fi

echo -e "${GREEN}Cleanup completed successfully!${NC}"
echo "If everything is working correctly with the new structure, you can now safely delete this script."