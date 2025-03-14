#!/bin/bash

# Check if MongoDB is running
if nc -z localhost 27017 &>/dev/null; then
    echo "MongoDB is already running on localhost:27017"
    exit 0
fi

echo "MongoDB is not running on localhost:27017"

# Check if MongoDB is installed
if command -v mongod &>/dev/null; then
    echo "MongoDB is installed. Attempting to start..."

    # Check if we're on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # Try to start MongoDB using brew services
        if command -v brew &>/dev/null; then
            echo "Starting MongoDB using Homebrew services..."
            brew services start mongodb-community

            # Wait for MongoDB to start
            echo "Waiting for MongoDB to start..."
            for i in {1..10}; do
                if nc -z localhost 27017 &>/dev/null; then
                    echo "MongoDB started successfully!"
                    exit 0
                fi
                sleep 1
            done
        else
            echo "Homebrew not found. Please start MongoDB manually."
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Try to start MongoDB using systemd
        echo "Starting MongoDB using systemd..."
        sudo systemctl start mongod

        # Wait for MongoDB to start
        echo "Waiting for MongoDB to start..."
        for i in {1..10}; do
            if nc -z localhost 27017 &>/dev/null; then
                echo "MongoDB started successfully!"
                exit 0
            fi
            sleep 1
        done
    else
        echo "Unsupported OS. Please start MongoDB manually."
        exit 1
    fi
else
    echo "MongoDB is not installed. Please install MongoDB and try again."
    echo "Visit https://www.mongodb.com/docs/manual/installation/ for installation instructions."
    exit 1
fi

echo "Failed to start MongoDB. Please start it manually."
exit 1