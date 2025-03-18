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
  # Try to get recent errors from backend logs on both possible ports
  LOGS=""
  LOGS=$(curl -s http://localhost:3000/api/dev/logs 2>/dev/null || curl -s http://localhost:3001/api/dev/logs 2>/dev/null || echo "No logs endpoint available")

  if [[ "$LOGS" != "No logs endpoint available" ]]; then
    # Only try to parse if we got actual logs
    echo "$(date): Captured logs" >> $LOG_FILE
    echo "$LOGS" | grep -i "error\|exception\|fail" >> $LOG_FILE 2>/dev/null || echo "No errors found in logs" >> $LOG_FILE
  else
    # Just note that logs are not available
    echo "$(date): Logs endpoint not available" >> $LOG_FILE
  fi

  # Sleep before next poll
  sleep $POLLING_INTERVAL
done