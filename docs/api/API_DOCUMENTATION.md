# Learning Platform API Documentation

## Overview

This document provides comprehensive documentation for the Learning Platform API, including authentication endpoints, resource management, error responses, and rate limits.

## Base URL

All API endpoints are relative to the base URL of your deployment:

- Development: `http://localhost:8000`
- Production: Depends on your deployment configuration

## Authentication

The API uses JWT token-based authentication. To access protected endpoints, you need to:

1. Obtain an access token via login
2. Include the token in the Authorization header for subsequent requests

### Authentication Endpoints

#### Login for Access Token

```
POST /token
```

**Request Body:**
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Rate Limit:** 5 requests per minute.

#### Refresh Access Token

```
POST /token/refresh
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Rate Limit:** 5 requests per minute.

### User Management

#### Create User

```
POST /users/
```

**Request Body:**
```json
{
  "username": "new_user",
  "email": "user@example.com",
  "password": "StrongPassword123!",
  "full_name": "John Doe"
}
```

**Response:**
```json
{
  "username": "new_user",
  "email": "user@example.com",
  "full_name": "John Doe",
  "id": "6123f1d83bac9b1e9a7dfa3c",
  "disabled": false,
  "is_active": true,
  "created_at": "2023-05-04T12:34:56.789Z",
  "resources": {
    "articles": [],
    "videos": [],
    "courses": [],
    "books": []
  },
  "study_sessions": [],
  "review_sessions": [],
  "learning_paths": [],
  "reviews": [],
  "concepts": [],
  "goals": [],
  "metrics": [],
  "milestones": []
}
```

**Rate Limit:** 3 requests per hour.

#### Get Current User

```
GET /users/me/
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "username": "your_username",
  "email": "your_email@example.com",
  "full_name": "Your Name",
  "id": "6123f1d83bac9b1e9a7dfa3c",
  "disabled": false,
  "is_active": true,
  "created_at": "2023-05-04T12:34:56.789Z",
  "resources": {
    "articles": [...],
    "videos": [...],
    "courses": [...],
    "books": [...]
  },
  "study_sessions": [...],
  "review_sessions": [...],
  "learning_paths": [...],
  "reviews": [...],
  "concepts": [...],
  "goals": [...],
  "metrics": [...],
  "milestones": [...]
}
```

## Resources

### Resource Management

#### List Resources

```
GET /api/resources/
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `resource_type`: Filter by resource type (articles, videos, courses, books)
- `limit`: Maximum number of resources to return (default: 100)
- `offset`: Number of resources to skip (default: 0)

**Response:**
```json
{
  "items": [
    {
      "id": "6123f1d83bac9b1e9a7dfa3c",
      "title": "Learning Python",
      "description": "A comprehensive guide to Python programming",
      "resource_type": "book",
      "url": "https://example.com/python-book",
      "tags": ["python", "programming"],
      "created_at": "2023-05-04T12:34:56.789Z",
      "updated_at": "2023-05-04T12:34:56.789Z",
      "completion_status": "in_progress",
      "notes": "Great book for beginners"
    },
    ...
  ],
  "total": 45,
  "limit": 10,
  "offset": 0
}
```

#### Create Resource

```
POST /api/resources/
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "Learning Python",
  "description": "A comprehensive guide to Python programming",
  "resource_type": "book",
  "url": "https://example.com/python-book",
  "tags": ["python", "programming"],
  "completion_status": "not_started",
  "notes": ""
}
```

**Response:**
```json
{
  "id": "6123f1d83bac9b1e9a7dfa3c",
  "title": "Learning Python",
  "description": "A comprehensive guide to Python programming",
  "resource_type": "book",
  "url": "https://example.com/python-book",
  "tags": ["python", "programming"],
  "created_at": "2023-05-04T12:34:56.789Z",
  "updated_at": "2023-05-04T12:34:56.789Z",
  "completion_status": "not_started",
  "notes": "",
  "user_id": "5fff1bd83bac9b1e9a7dfa3c"
}
```

#### Batch Create Resources

```
POST /api/resources/batch
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "resources": [
    {
      "title": "Python Basics",
      "description": "Introduction to Python",
      "resource_type": "article",
      "url": "https://example.com/python-basics",
      "tags": ["python", "tutorial"],
      "completion_status": "not_started",
      "notes": ""
    },
    {
      "title": "Advanced Python",
      "description": "Advanced Python concepts",
      "resource_type": "article",
      "url": "https://example.com/advanced-python",
      "tags": ["python", "advanced"],
      "completion_status": "not_started",
      "notes": ""
    }
  ]
}
```

**Response:**
```json
{
  "created": [
    {
      "id": "6123f1d83bac9b1e9a7dfa3c",
      "title": "Python Basics",
      "resource_type": "article",
      "created_at": "2023-05-04T12:34:56.789Z"
    },
    {
      "id": "6123f1d83bac9b1e9a7dfa3d",
      "title": "Advanced Python",
      "resource_type": "article",
      "created_at": "2023-05-04T12:34:56.789Z"
    }
  ],
  "total_created": 2
}
```

#### Update Resource

```
PUT /api/resources/{resource_id}
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "Learning Python - Updated",
  "description": "An updated guide to Python programming",
  "completion_status": "completed",
  "notes": "Finished reading, great resource!"
}
```

**Response:**
```json
{
  "id": "6123f1d83bac9b1e9a7dfa3c",
  "title": "Learning Python - Updated",
  "description": "An updated guide to Python programming",
  "resource_type": "book",
  "url": "https://example.com/python-book",
  "tags": ["python", "programming"],
  "created_at": "2023-05-04T12:34:56.789Z",
  "updated_at": "2023-05-04T13:45:12.345Z",
  "completion_status": "completed",
  "notes": "Finished reading, great resource!",
  "user_id": "5fff1bd83bac9b1e9a7dfa3c"
}
```

#### Delete Resource

```
DELETE /api/resources/{resource_id}
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "Resource deleted successfully"
}
```

### Resource Statistics

```
GET /api/resources/statistics
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "total_resources": 45,
  "by_type": {
    "articles": 20,
    "videos": 15,
    "courses": 5,
    "books": 5
  },
  "by_completion_status": {
    "not_started": 10,
    "in_progress": 25,
    "completed": 10
  },
  "recently_added": [
    {
      "id": "6123f1d83bac9b1e9a7dfa3c",
      "title": "Learning Python",
      "resource_type": "book",
      "created_at": "2023-05-04T12:34:56.789Z"
    }
  ],
  "recently_completed": [
    {
      "id": "6123f1d83bac9b1e9a7dfa3d",
      "title": "JavaScript Basics",
      "resource_type": "article",
      "completed_at": "2023-05-03T10:24:36.789Z"
    }
  ]
}
```

## Learning Paths

### List Learning Paths

```
GET /api/learning-path/
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "items": [
    {
      "id": "6123f1d83bac9b1e9a7dfa3c",
      "title": "Web Development Path",
      "description": "Learn web development from scratch",
      "resources": [...],
      "progress": 35,
      "created_at": "2023-05-04T12:34:56.789Z",
      "updated_at": "2023-05-04T12:34:56.789Z"
    },
    ...
  ],
  "total": 3
}
```

### Create Learning Path

```
POST /api/learning-path/
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "Machine Learning Path",
  "description": "Comprehensive path to learn ML",
  "resources": [
    "6123f1d83bac9b1e9a7dfa3c",
    "6123f1d83bac9b1e9a7dfa3d"
  ]
}
```

**Response:**
```json
{
  "id": "6123f1d83bac9b1e9a7dfa4c",
  "title": "Machine Learning Path",
  "description": "Comprehensive path to learn ML",
  "resources": [
    {
      "id": "6123f1d83bac9b1e9a7dfa3c",
      "title": "Intro to ML",
      "resource_type": "article"
    },
    {
      "id": "6123f1d83bac9b1e9a7dfa3d",
      "title": "ML Algorithms",
      "resource_type": "video"
    }
  ],
  "progress": 0,
  "created_at": "2023-05-04T12:34:56.789Z",
  "updated_at": "2023-05-04T12:34:56.789Z"
}
```

### Get Learning Path Progress

```
GET /api/learning-path/{path_id}/progress
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "path_id": "6123f1d83bac9b1e9a7dfa4c",
  "title": "Machine Learning Path",
  "overall_progress": 50,
  "resources": [
    {
      "id": "6123f1d83bac9b1e9a7dfa3c",
      "title": "Intro to ML",
      "completion_status": "completed",
      "resource_type": "article"
    },
    {
      "id": "6123f1d83bac9b1e9a7dfa3d",
      "title": "ML Algorithms",
      "completion_status": "not_started",
      "resource_type": "video"
    }
  ],
  "completed_resources": 1,
  "total_resources": 2
}
```

## Reviews

### Create Review

```
POST /api/reviews/
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "resource_id": "6123f1d83bac9b1e9a7dfa3c",
  "rating": 5,
  "content": "Excellent resource for learning Python. Highly recommended!"
}
```

**Response:**
```json
{
  "id": "6123f1d83bac9b1e9a7dfa5c",
  "resource_id": "6123f1d83bac9b1e9a7dfa3c",
  "user_id": "5fff1bd83bac9b1e9a7dfa3c",
  "rating": 5,
  "content": "Excellent resource for learning Python. Highly recommended!",
  "created_at": "2023-05-04T12:34:56.789Z",
  "updated_at": "2023-05-04T12:34:56.789Z"
}
```

### Get Reviews for Resource

```
GET /api/reviews/resource/{resource_id}
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "items": [
    {
      "id": "6123f1d83bac9b1e9a7dfa5c",
      "resource_id": "6123f1d83bac9b1e9a7dfa3c",
      "user_id": "5fff1bd83bac9b1e9a7dfa3c",
      "username": "john_doe",
      "rating": 5,
      "content": "Excellent resource for learning Python. Highly recommended!",
      "created_at": "2023-05-04T12:34:56.789Z"
    }
  ],
  "total": 1,
  "average_rating": 5.0
}
```

## Sessions

### List Active Sessions

```
GET /sessions/
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "active_sessions": [
    {
      "id": "6123f1d83bac9b1e9a7dfa6c",
      "user_id": "5fff1bd83bac9b1e9a7dfa3c",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2023-05-04T12:34:56.789Z",
      "last_active": "2023-05-04T13:45:12.345Z",
      "expires_at": "2023-05-05T12:34:56.789Z",
      "is_current": true
    }
  ],
  "total": 1
}
```

### Terminate Session

```
DELETE /sessions/{session_id}
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "Session terminated successfully"
}
```

### Terminate All Sessions

```
DELETE /sessions/all
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "All sessions terminated successfully",
  "count": 3
}
```

## Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "user_count": 120,
  "api_version": "0.1.0",
  "timestamp": "2023-05-04T12:34:56.789Z"
}
```

## Metrics

```
GET /api/metrics
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "requests": {
    "total": 1520,
    "by_path": {
      "/api/resources/": 350,
      "/api/health": 120,
      "/token": 100
    },
    "by_method": {
      "GET": 900,
      "POST": 500,
      "PUT": 100,
      "DELETE": 20
    },
    "by_status": {
      "200": 1400,
      "401": 50,
      "404": 30,
      "500": 5
    }
  },
  "auth": {
    "login_attempts": 150,
    "login_success": 120,
    "login_failure": 30,
    "token_refresh": 80,
    "token_refresh_failure": 5
  },
  "resources": {
    "created": 300,
    "updated": 150,
    "deleted": 20,
    "viewed": 800
  },
  "performance": {
    "avg_response_time": 0.15,
    "slow_requests_count": 10,
    "recent_slow_requests": [...]
  },
  "errors": {
    "total": 85,
    "by_path": {
      "/api/resources/": 20,
      "/token": 15
    },
    "by_type": {
      "ValidationError": 40,
      "AuthenticationError": 30,
      "DatabaseError": 10,
      "ServerError": 5
    }
  },
  "rate_limits": {
    "total_exceeded": 25,
    "by_endpoint": {
      "/token": 15,
      "/users/": 10
    }
  },
  "sessions": {
    "created": 120,
    "terminated": 80,
    "expired": 10
  },
  "timestamp": "2023-05-04T12:34:56.789Z"
}
```

## Error Responses

The API uses consistent error response formats across all endpoints:

### 400 Bad Request

Returned when the request is invalid, such as missing required fields or validation errors.

```json
{
  "message": "Validation error",
  "error_code": "VALIDATION_ERROR",
  "details": {
    "field": "password",
    "error": "Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character"
  }
}
```

### 401 Unauthorized

Returned when authentication fails or credentials are missing.

```json
{
  "message": "Not authenticated",
  "error_code": "AUTHENTICATION_ERROR"
}
```

### 403 Forbidden

Returned when the authenticated user doesn't have permission to access a resource.

```json
{
  "message": "Permission denied",
  "error_code": "AUTHORIZATION_ERROR"
}
```

### 404 Not Found

Returned when the requested resource doesn't exist.

```json
{
  "message": "Resource not found",
  "error_code": "RESOURCE_NOT_FOUND"
}
```

### 429 Too Many Requests

Returned when rate limits are exceeded.

```json
{
  "message": "Rate limit exceeded",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```

### 500 Internal Server Error

Returned when an unexpected error occurs on the server.

```json
{
  "message": "An unexpected error occurred",
  "error_code": "INTERNAL_ERROR"
}
```

## Rate Limits

The API implements rate limiting to protect against abuse and ensure fair usage. Rate limits are implemented on critical endpoints:

1. **Authentication**:
   - `/token`: 5 requests per minute per client
   - `/token/refresh`: 5 requests per minute per client

2. **User Creation**:
   - `/users/`: 3 requests per hour per client

3. **Other Endpoints**:
   - Default: 100 requests per minute per user

When rate limits are exceeded, the API returns a 429 Too Many Requests response with the following headers:

- `Retry-After`: Seconds until the rate limit resets
- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: Timestamp when the rate limit will reset

Rate limits are identified based on:
1. IP address
2. User-Agent string
3. User ID (if authenticated)

This combination helps prevent abuse while allowing legitimate users to use the API effectively.

## Best Practices

1. **Authentication**:
   - Store tokens securely (e.g., in HttpOnly cookies or secure storage)
   - Refresh tokens before they expire to maintain session continuity
   - Implement token rotation for enhanced security

2. **Error Handling**:
   - Always check for error responses and handle them appropriately
   - Implement retry logic with exponential backoff for rate limiting

3. **Performance**:
   - Use batch endpoints when performing multiple operations
   - Implement client-side caching for frequently accessed resources
   - Use pagination parameters to limit response sizes

4. **Security**:
   - Always use HTTPS in production
   - Don't expose sensitive information in URLs
   - Validate all inputs on the client side before sending to the API