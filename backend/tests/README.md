# Testing Guide for FastAPI MongoDB Application

This guide explains how to run tests for the FastAPI application with MongoDB using different approaches.

## Directory Structure

```
tests/
├── conftest.py                 # Main pytest configuration
├── README.md                   # This file
├── runners/                    # All test runner scripts
│   ├── run_tests.sh            # Main test runner
│   ├── run_quick_tests.sh      # Quick test runner
│   ├── run_tests_with_mock.sh  # Mock-based test runner
│   └── ...                     # Other runner scripts
├── utils/                      # Utility scripts
│   ├── ensure_mongodb.sh       # MongoDB setup script
│   ├── debug_async_test.py     # Debug utility
│   └── ...                     # Other utility scripts
├── config/                     # Test configurations
│   ├── conftest_mock.py        # Mock configuration
│   └── conftest_dependency.py  # Dependency injection configuration
├── api/                        # API tests grouped by component
│   ├── test_auth_api.py        # Authentication tests
│   ├── test_resources_api.py   # Resource tests
│   └── ...                     # Other API tests
└── services/                   # Service tests
    └── test_url_extractor_service.py  # URL extractor service tests
```

## Testing Approaches

We provide two main approaches for testing:

1. **Mock-based Testing**: Uses `mongomock` and `mongomock-motor` to mock MongoDB operations
2. **Dependency Injection Testing**: Uses FastAPI's dependency override system with mock MongoDB

Both approaches allow you to run tests without a real MongoDB instance.

## Prerequisites

- Python 3.8+
- pip (for installing dependencies)

## Running Tests

All test runner scripts are located in the `runners/` directory. You should run them from the `tests/` directory.

### Using Mock-based Testing

To run all tests with MongoDB mocking:

```bash
./runners/run_tests_with_mock.sh
```

To run a single test file with MongoDB mocking:

```bash
./runners/run_single_test_with_mock.sh api/test_auth_api.py
```

### Using Dependency Injection Testing

To run all tests with dependency injection:

```bash
./runners/run_tests_with_dependency.sh
```

To run a single test file with dependency injection:

```bash
./runners/run_single_test_with_dependency.sh api/test_auth_api.py
```

### Running Tests with Real MongoDB

To run all tests with a real MongoDB instance:

```bash
./runners/run_tests.sh
```

To run a single test file with a real MongoDB instance:

```bash
./runners/run_single_test.sh api/test_auth_api.py
```

### Quick Tests

To run a subset of tests for quick feedback:

```bash
./runners/run_quick_tests.sh
```

### Test Coverage

To run tests with coverage reporting:

```bash
./runners/run_tests_with_coverage.sh
```

## Debugging Tests

For debugging tests, use the debug script:

```bash
./runners/debug_test.sh api/test_auth_api.py mock
```

To debug MongoDB async operations:

```bash
python utils/debug_async_test.py
```

## Understanding the Test Setup

### Mock-based Testing (`config/conftest_mock.py`)

This approach uses `mongomock` and `mongomock-motor` to create a mock MongoDB client that mimics the behavior of a real MongoDB instance. The mock is applied by patching the MongoDB client in the test fixtures.

Key features:
- Uses `mongomock-motor` for async MongoDB operations
- Provides fixtures for test client, database, and authentication
- Handles async operations properly with event loop management

### Dependency Injection Testing (`config/conftest_dependency.py`)

This approach uses FastAPI's dependency override system to replace the real MongoDB client with a mock one during tests. This is a more robust approach as it doesn't rely on patching.

Key features:
- Overrides FastAPI dependencies for database and authentication
- Uses `mongomock-motor` for async MongoDB operations
- Provides fixtures for test client, database, and authentication
- Handles async operations properly with event loop management

## Troubleshooting

### Common Issues

1. **"coroutine object is not iterable" error**:
   - This is usually caused by not awaiting an async function
   - Make sure all async functions are properly awaited
   - Check that the test fixtures are properly handling async operations

2. **"TypeError: object AsyncMockCollection can't be used in 'await' expression"**:
   - This can happen if you're using an incompatible version of `mongomock-motor`
   - Make sure you're using the latest version of `mongomock-motor`

3. **Tests hanging or timing out**:
   - This can be caused by improper event loop handling
   - Make sure the event loop fixture is properly set up
   - Check that all async operations are properly awaited

### Debugging Tips

- Use the `--trace` option for more detailed debugging information:
  ```bash
  python -m pytest api/test_auth_api.py -v --trace
  ```

- Use the `--showlocals` option to see local variables during test failures:
  ```bash
  python -m pytest api/test_auth_api.py -v --showlocals
  ```

- Use the `--tb=native` option for more detailed tracebacks:
  ```bash
  python -m pytest api/test_auth_api.py -v --tb=native
  ```

## Additional Resources

- [FastAPI Testing Documentation](https://fastapi.tiangolo.com/tutorial/testing/)
- [pytest-asyncio Documentation](https://pytest-asyncio.readthedocs.io/en/latest/)
- [mongomock Documentation](https://github.com/mongomock/mongomock)
- [mongomock-motor Documentation](https://github.com/mongomock/mongomock-motor)