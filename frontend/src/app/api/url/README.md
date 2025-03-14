# URL Metadata Extraction API

This API provides functionality to extract metadata from URLs, which is used in the resource creation process.

## Endpoints

### `POST /api/url/extract`

Extracts metadata from a URL, including title, description, estimated reading time, and more.

#### Request

```json
{
  "url": "https://example.com/article"
}
```

#### Response

```json
{
  "title": "Example Article Title",
  "description": "This is an example article description",
  "resource_type": "articles",
  "estimated_time": 15,
  "difficulty": "intermediate",
  "topics": ["machine learning", "neural networks"]
}
```

#### Authentication

This endpoint requires authentication. The user must have a valid JWT token in the cookies.

#### Error Handling

- `401 Unauthorized`: If the user is not authenticated
- `400 Bad Request`: If the URL is missing
- `500 Internal Server Error`: If there's an error extracting metadata

## Implementation Details

The frontend API route connects to the backend URL extraction service, which uses BeautifulSoup to parse HTML content and extract metadata.

The backend service is implemented in `backend/app/services/url_extractor.py` and exposed via the `/api/url/extract` endpoint in `backend/routers/url_extractor.py`.

## Testing

You can test the API using the provided test script:

```bash
npx ts-node -r tsconfig-paths/register src/app/api/url/extract/test.ts
```

Make sure to replace the token in the test script with a valid JWT token.