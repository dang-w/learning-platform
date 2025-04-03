#!/bin/bash

# A simplified fast test runner script to bypass Cypress chaining issues

# Stop on first error
set -e

# Log test startup
echo "Starting simplified Cypress tests"

# Set up environment variables
export CYPRESS_VIDEO=false
export CYPRESS_experimentalMemoryManagement=true
export CYPRESS_numTestsKeptInMemory=5

# Run Cypress tests directly with standard reporter
npx cypress run --config-file e2e/cypress/config/cypress.config.cjs

echo "Tests completed"