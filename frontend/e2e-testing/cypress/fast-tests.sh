#!/bin/bash

# Fast Cypress test runner with optimizations
# This script optimizes Cypress test runs by:
# 1. Clearing previous reports before run
# 2. Using cypress-parallel to run tests in parallel threads
# 3. Setting optimized environment variables
# 4. Using a custom multi-reporter configuration

# Stop on first error
set -e

# Clear previous reports
echo "Cleaning previous reports..."
rm -rf ./e2e-testing/reports/*
rm -rf ./e2e-testing/cypress/reports/*
rm -rf ./e2e-testing/cypress/screenshots/*
rm -rf ./e2e-testing/cypress/videos/*

# Create reports directory
mkdir -p ./e2e-testing/cypress/reports/fast

# Set optimal environment variables
export CYPRESS_VIDEO=false
export CYPRESS_viewportWidth=1024
export CYPRESS_viewportHeight=768
export CYPRESS_defaultCommandTimeout=8000
export CYPRESS_requestTimeout=10000
export CYPRESS_responseTimeout=10000
export CYPRESS_experimentalMemoryManagement=true
export CYPRESS_numTestsKeptInMemory=5

# Auto-detect thread count based on CPU cores
THREAD_COUNT=$(node -e "console.log(Math.max(2, require('os').cpus().length - 1))")
echo "Running with $THREAD_COUNT parallel threads"

# Run tests in parallel with custom reporter
echo "Starting parallel test run..."
# Update path to multi-reporter config
REPORTER_CONFIG_PATH="./e2e-testing/config/multi-reporter-config.json"
npx cypress-parallel -s cypress:headless -t $THREAD_COUNT -d ./e2e-testing/cypress/e2e --specsDir ./e2e-testing/cypress/e2e --reporter cypress-multi-reporters --reporter-options configFile=$REPORTER_CONFIG_PATH

echo "Tests completed successfully!"