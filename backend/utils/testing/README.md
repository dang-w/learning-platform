# Testing Utilities

This directory contains utility scripts for testing various components of the learning platform backend. These scripts are not part of the automated test suite but are used for manual testing and verification.

## Available Utilities

### API Tester (`api_tester.py`)

Tests the main API endpoints of the learning platform.

```bash
python -m learning_platform.backend.utils.testing.api_tester
```

### URL Extractor Tester (`url_extractor_tester.py`)

Tests the URL extraction service.

```bash
python -m learning_platform.backend.utils.testing.url_extractor_tester
```

### Database Connection Tester (`db_connection_tester.py`)

Tests the connection to the MongoDB database.

```bash
python -m learning_platform.backend.utils.testing.db_connection_tester
```

## Usage Notes

- These scripts require the backend services to be running.
- Make sure you have the appropriate environment variables set (check your `.env` file).
- These scripts are intended for development and debugging purposes only.