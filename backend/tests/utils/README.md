# Test Utilities

> **Note:** This document focuses on test utility functions and scripts. For a comprehensive guide on backend testing, please refer to the [Backend Testing Guide](/backend/TESTING.md).

## Test Utility Files

This directory contains utility scripts and helper functions for tests:

- `ensure_mongodb.sh` - Shell script to ensure MongoDB is running for tests

## Utility Scripts

### MongoDB Script

The `ensure_mongodb.sh` script checks if MongoDB is running and starts it if needed:

```bash
# Run the MongoDB check script
./tests/utils/ensure_mongodb.sh
```

The script performs the following actions:
1. Checks if MongoDB is running by attempting to connect
2. If connection fails, attempts to start MongoDB
3. Verifies the connection after startup

## Using Test Utilities

Test utilities can be used in tests by importing them directly or by running the scripts:

```bash
# Run the MongoDB check script before tests
./tests/utils/ensure_mongodb.sh && pytest
```

For more information on testing and utility functions, see the [Backend Testing Guide](/backend/TESTING.md).