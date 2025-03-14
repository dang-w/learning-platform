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

## Testing

Run the API tests to ensure everything is working correctly:

```bash
python test_api.py
```

To test the URL extractor service:

```bash
python test_url_extractor.py
```

## Project Structure

- `main.py`: Main FastAPI application
- `routers/`: API route handlers
  - `resources.py`: Resource management endpoints
  - `progress.py`: Progress tracking endpoints
  - `reviews.py`: Spaced repetition review endpoints
  - `learning_path.py`: Learning path management endpoints
  - `url_extractor.py`: URL metadata extraction endpoints
- `app/services/`: Service modules
  - `url_extractor.py`: URL metadata extraction service
- `init_db.py`: Database initialization script
- `test_api.py`: API test script
- `test_url_extractor.py`: URL extractor test script