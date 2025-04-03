# API Tests

> **Note:** This document focuses on specific implementation details for API tests. For a comprehensive guide on backend testing, please refer to the [Backend Testing Guide](/backend/TESTING.md).

## API Test Files

The API tests are organized into files corresponding to different API endpoints:

- `test_auth_api.py` - Tests for authentication endpoints
- `test_resources_api.py` - Tests for resource management endpoints
- `test_learning_path_api.py` - Tests for learning path endpoints
- `test_knowledge.py` - Tests for knowledge and concepts endpoints
- `test_reviews_api.py` - Tests for review endpoints
- `test_progress_api.py` - Tests for progress tracking endpoints
- `test_url_extractor_api.py` - Tests for URL metadata extraction endpoints

These tests ensure the correct functioning of the API endpoints through various scenarios, including success cases, error handling, and edge cases.

## Learning Path API Issues

The Learning Path API endpoints are accessible, but most of them are returning errors:

1. `