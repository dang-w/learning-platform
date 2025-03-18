#!/bin/bash

# Script to capture backend logs while running Cypress tests
# This will run the backend server and redirect all output to a log file

# Create reports directory if it doesn't exist
mkdir -p ./cypress/reports/backend

# Set log file path
LOG_FILE="./cypress/reports/backend/backend-errors.log"

# Create or clear the log file
echo "Backend logs captured on $(date)" > $LOG_FILE

# Run the backend server and redirect all output to the log file
echo "Starting backend server and capturing logs to $LOG_FILE"
echo "To view logs in real-time, run: tail -f $LOG_FILE"

# Assuming the backend server is started with this command (adjust as needed)
cd ../backend && uvicorn main:app --reload >> $LOG_FILE 2>&1