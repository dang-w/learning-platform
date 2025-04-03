#!/bin/bash

# Script to run Cypress tests while capturing backend logs

# Check if the backend-logs.sh script is running
if ! pgrep -f "cypress/backend-logs.sh" > /dev/null; then
  echo "Starting backend server with logging..."
  bash ./cypress/backend-logs.sh &
  BACKEND_PID=$!

  # Give the backend server time to start
  sleep 5
else
  echo "Backend logging already running"
fi

# Run Cypress tests
echo "Running Cypress tests..."
if [ "$1" != "" ]; then
  # Run specific test if argument provided
  npx cypress run --spec "$1"
else
  # Run all tests if no argument provided
  npx cypress run
fi

# Display location of backend logs
echo ""
echo "Backend logs have been saved to ./cypress/backend-errors.log"
echo "Review this file to investigate backend errors that occurred during testing."