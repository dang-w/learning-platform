# Performance Tests

This directory contains performance tests for the backend API. Performance tests focus on measuring response times, throughput, and system behavior under various load conditions.

## Test Organization

- `test_api_performance.py`: Tests API endpoint performance under normal load
- `test_database_performance.py`: Tests database operation performance
- `test_load_performance.py`: Tests API performance under heavy load

## Running Performance Tests

```bash
# Run all performance tests
pytest tests/performance/

# Run specific performance test file
pytest tests/performance/test_api_performance.py

# Run with verbose output
pytest tests/performance/ -v
```

## Note

Performance tests are typically slower than other tests and may require additional setup. They are marked with the `slow` marker and can be excluded from regular test runs:

```bash
# Run all tests except slow ones
pytest -m "not slow"
```

For more information on backend testing, refer to the [Backend Testing Guide](/backend/TESTING.md).