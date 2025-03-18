#!/bin/bash

# Script to capture backend logs during Cypress test runs
# Monitors the backend API logs and saves errors to a file

# Configuration
LOG_FILE="./e2e-testing/cypress/backend-errors.log"
POLLING_INTERVAL=5  # seconds

# Initialize log file
echo "Backend log capture started at $(date)" > $LOG_FILE
echo "-------------------------------------------" >> $LOG_FILE

echo "Starting backend log capture..."

# Run until terminated
while true; do
  # Get recent errors from backend logs (adjust command based on your backend)
  curl -s http://localhost:3001/api/dev/logs 2>/dev/null | grep -i "error\|exception\|fail" >> $LOG_FILE

  # Sleep before next poll
  sleep $POLLING_INTERVAL
done