# AI/ML Learning Platform Backend

This is the backend API for the AI/ML Learning Platform, built with FastAPI and MongoDB.

## Features

- User authentication with JWT tokens
- Resource management (articles, videos, courses, books)
- Progress tracking and metrics
- Spaced repetition review system
- Learning path management
- URL metadata extraction

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file with the following variables:
   ```
   MONGODB_URL=your_mongodb_connection_string
   SECRET_KEY=your_secret_key
   ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7 days
   FRONTEND_URL=http://localhost:3000
   PORT=8000
   HOST=0.0.0.0
   DEBUG=True
   ```
4. Initialize the database with sample data:
   ```bash
   python init_db.py
   ```

## Running the Server

```bash
python -m uvicorn main:app --reload
```

The API will be available at http://localhost:8000

## API Documentation

Once the server is running, you can access the API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

For complete API documentation, see [docs/api/API_DOCUMENTATION.md](/docs/api/API_DOCUMENTATION.md).

## Testing

The backend includes a comprehensive test suite using pytest. For detailed testing information, please refer to:

- [**TESTING.md**](TESTING.md): Main backend testing documentation ✅
- [**tests/README.md**](tests/README.md): Test organization and structure ✅
- [**Unified Testing Guide**](/docs/testing/UNIFIED_TESTING_GUIDE.md): Project-wide testing documentation ✅

### Running Basic Tests

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=app

# Run specific test file
pytest tests/api/test_auth_api.py
```

### Testing Approaches

The test suite supports multiple testing approaches:

1. **Mock-based Testing**: Uses `mongomock` and `mongomock-motor` to mock MongoDB operations
2. **Dependency Injection Testing**: Uses FastAPI's dependency override system with mock MongoDB
3. **Real MongoDB Testing**: Tests against a real MongoDB instance

For detailed testing instructions, see the [TESTING.md](TESTING.md) file.

## Project Structure

- `main.py`: Main FastAPI application
- `auth.py`: Authentication logic
- `database.py`: Database connection and utilities
- `routers/`: API route handlers
  - `resources.py`: Resource management endpoints
  - `progress.py`: Progress tracking endpoints
  - `reviews.py`: Spaced repetition review endpoints
  - `learning_path.py`: Learning path management endpoints
  - `url_extractor.py`: URL metadata extraction endpoints
- `app/services/`: Service modules
  - `url_extractor.py`: URL metadata extraction service
- `tests/`: Test suite
  - `api/`: API endpoint tests
  - `services/`: Service layer tests
  - `utils/`: Test utilities
  - `config/`: Test configurations
  - `runners/`: Test runner scripts
- `utils/`: Utility functions
- `init_db.py`: Database initialization script

## Recent Updates

### E2E Testing Support (March 2025)

The following endpoints have been implemented to support E2E testing:

1. **Batch Creation Endpoints**
   - `/api/resources/batch` - Create multiple resources in a batch
   - `/api/reviews/concepts/batch` - Create multiple knowledge concepts in a batch
   - `/api/learning-path/goals/batch` - Create multiple learning goals in a batch

2. **Token Management**
   - `/token/refresh` - Refresh an access token using an existing valid token

These endpoints enhance the API's usability for E2E testing by allowing for more efficient data setup and improved token handling.

### Running Tests

To run tests for the implemented endpoints:

```bash
# Test token refresh endpoint
pytest tests/api/test_auth_api.py::test_token_refresh -v

# Test batch endpoints
pytest tests/api/test_resources_api.py::test_create_resources_batch -v
pytest tests/api/test_knowledge.py::test_create_concepts_batch -v
pytest tests/api/test_learning_path_api.py::test_create_goals_batch -v
```

## Documentation

For more comprehensive documentation about the project, please refer to the [documentation hub](/docs/README.md).