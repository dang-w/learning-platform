# Configuration Tests

> **Note:** This document focuses on configuration test utilities. For a comprehensive guide on backend testing, please refer to the [Backend Testing Guide](/backend/TESTING.md).

## Configuration Test Files

This directory contains test configuration files and utilities:

- `conftest_mock.py` - Contains test fixtures that provide mocked components
- `conftest_dependency.py` - Contains test fixtures for dependency injection
- `ensure_mongodb.sh` - Shell script to ensure MongoDB is running for tests

## Using Configuration Test Utilities

These utilities provide alternative test fixtures that can be imported in test files:

```python
# Example: Using mock fixtures
from tests.config.conftest_mock import mock_db, mock_user

# Example: Using dependency fixtures
from tests.config.conftest_dependency import override_get_db, override_get_user
```

## MongoDB Script

The `ensure_mongodb.sh` script can be used to verify MongoDB is running before tests:

```bash
# Ensure MongoDB is running
./tests/config/ensure_mongodb.sh
```

For complete test setup and configuration options, see the [Backend Testing Guide](/backend/TESTING.md).