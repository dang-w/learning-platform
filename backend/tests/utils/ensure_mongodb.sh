#!/bin/bash

# Check if MongoDB is running
echo "Checking if MongoDB is running..."
if nc -z localhost 27017 &>/dev/null; then
    echo "MongoDB is already running on localhost:27017"
    exit 0
fi

# MongoDB is not running
echo "MongoDB is not running on localhost:27017"

# Check if we're running in a CI environment or if SKIP_MONGODB_START is set
if [ -n "$CI" ] || [ -n "$SKIP_MONGODB_START" ]; then
    echo "Skipping MongoDB start attempt (CI environment or SKIP_MONGODB_START is set)"
    echo "Please ensure MongoDB is running before tests"
    exit 1
fi

# Ask user if they want to try starting MongoDB or use Docker
echo ""
echo "Options:"
echo "1) Try to start local MongoDB (if installed)"
echo "2) Use Docker to run a temporary MongoDB container"
echo "3) Skip MongoDB start (tests will likely fail)"
echo ""
read -p "Choose an option (1-3): " choice

case $choice in
    1)
        # Try to start local MongoDB
        echo "Attempting to start local MongoDB..."

        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew &>/dev/null && brew list mongodb-community &>/dev/null; then
                echo "Starting MongoDB using Homebrew..."
                brew services start mongodb-community
            elif [ -d "/usr/local/mongodb" ]; then
                echo "Starting MongoDB from /usr/local/mongodb..."
                /usr/local/mongodb/bin/mongod --dbpath /usr/local/mongodb/data --fork --logpath /usr/local/mongodb/mongod.log
            elif [ -d "/opt/mongodb" ]; then
                echo "Starting MongoDB from /opt/mongodb..."
                /opt/mongodb/bin/mongod --dbpath /opt/mongodb/data --fork --logpath /opt/mongodb/mongod.log
            else
                echo "MongoDB not found. Please install MongoDB or use Docker option."
                exit 1
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            if command -v systemctl &>/dev/null; then
                echo "Starting MongoDB using systemctl..."
                sudo systemctl start mongod
            elif command -v service &>/dev/null; then
                echo "Starting MongoDB using service..."
                sudo service mongod start
            else
                echo "MongoDB service not found. Please install MongoDB or use Docker option."
                exit 1
            fi
        else
            echo "Unsupported OS. Please start MongoDB manually or use Docker option."
            exit 1
        fi
        ;;
    2)
        # Use Docker to run MongoDB
        echo "Checking for Docker..."
        if ! command -v docker &>/dev/null; then
            echo "Docker not found. Please install Docker or choose another option."
            exit 1
        fi

        echo "Starting MongoDB using Docker..."
        docker run --name mongodb-test -d -p 27017:27017 mongo:latest

        if [ $? -ne 0 ]; then
            echo "Failed to start MongoDB Docker container."
            echo "If a container named 'mongodb-test' already exists, remove it with:"
            echo "docker rm -f mongodb-test"
            exit 1
        fi

        echo "MongoDB Docker container started."
        ;;
    3)
        # Skip MongoDB start
        echo "Skipping MongoDB start. Tests will likely fail."
        exit 1
        ;;
    *)
        echo "Invalid option. Exiting."
        exit 1
        ;;
esac

# Wait for MongoDB to start
echo "Waiting for MongoDB to start..."
for i in {1..10}; do
    if nc -z localhost 27017 &>/dev/null; then
        echo "MongoDB is now running!"
        exit 0
    fi
    echo "Waiting... ($i/10)"
    sleep 1
done

echo "Failed to start MongoDB. Please start it manually."
exit 1