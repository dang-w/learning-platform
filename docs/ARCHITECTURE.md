# AI/ML Learning Platform Architecture

This document outlines the architecture of the AI/ML Learning Platform, which has been transformed from a local script-based system to a modern web application with a frontend built with Next.js and a Python backend.

## System Overview

The AI/ML Learning Platform is designed to help users track their progress, manage knowledge, and optimize learning while transitioning from software development to AI/ML engineering. The platform provides:

- Personalized learning path tracking
- Knowledge management with spaced repetition
- Progress monitoring and analytics
- Focus and productivity tools

## Architecture Diagram

```
┌─────────────────────────┐      ┌─────────────────────────┐
│                         │      │                         │
│    Frontend (Next.js)   │◄────►│    Backend (FastAPI)    │
│    (Hosted on Vercel)   │      │    (Hosted on Cloud)    │
│                         │      │                         │
└─────────────────────────┘      └───────────┬─────────────┘
                                             │
                                             │
                                  ┌──────────▼──────────┐
                                  │                     │
                                  │  MongoDB Database   │
                                  │                     │
                                  └─────────────────────┘
```

## Technology Stack

### Frontend

- **Framework**: Next.js 15.2.2 with App Router
- **Language**: TypeScript
- **UI Library**: React ^19
- **Styling**: Tailwind CSS ^4
- **State Management**: React Query for server state, Zustand for client state
- **Authentication**: JWT with HTTP-only cookies
- **Data Visualization**: Chart.js
- **Testing**: Jest for unit tests, Cypress for E2E tests
- **Deployment**: Vercel (planned)

### Backend

- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT with OAuth2
- **Data Processing**: Pandas, NumPy
- **Visualization Generation**: Matplotlib
- **Testing**: pytest with pytest-cov for coverage
- **Deployment**: Cloud service (planned)

### Database

- **Type**: MongoDB (NoSQL)
- **Data Model**: Document-based with user-centric collections
- **Hosting**: MongoDB Atlas or self-hosted

## Component Breakdown

### Frontend Components

1. **Authentication Module**
   - Login/Registration
   - Profile management
   - Session handling

2. **Dashboard**
   - Overview of learning progress
   - Recent activity
   - Quick access to key features

3. **Learning Path Management**
   - Goals tracking
   - Roadmap visualization
   - Milestone management

4. **Resource Library**
   - Resource categorization
   - Completion tracking
   - Resource recommendations
   - URL metadata extraction

5. **Knowledge Management**
   - Concept notes with markdown support
   - Spaced repetition system
   - Review scheduling
   - Interactive markdown editor for content

6. **Progress Analytics**
   - Study time tracking
   - Focus metrics
   - Topic distribution
   - Visual reports

### Backend API Structure

1. **Authentication API**
   - User registration
   - Login/logout
   - Token management

2. **Resources API**
   - CRUD operations for learning resources
   - Resource categorization
   - Completion tracking
   - Statistics

3. **Progress API**
   - Study metrics tracking
   - Analytics generation
   - Report creation
   - Data visualization

4. **Reviews API**
   - Concept management
   - Spaced repetition scheduling
   - Review session generation
   - Review statistics

5. **Learning Path API**
   - Goals management
   - Milestone tracking
   - Roadmap configuration
   - Progress statistics

6. **URL Extraction API**
   - Metadata extraction from URLs
   - Resource type detection
   - Topic extraction

## Data Models

> **Note:** The following data models provide a conceptual overview. While User, Resource, and Learning Path models are updated based on API documentation, the exact structure for Metric, Concept, Goal, and Milestone might differ slightly in the implementation.

### User

Based on the `/users/me/` API response:

```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "full_name": "string",
  "disabled": false,
  "is_active": true,
  "created_at": "string",
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
  "metrics": [],
  "concepts": [],
  "goals": [],
  "milestones": []
}
```

### Resource

Based on the `/api/resources/` API response:

```json
{
  "id": "string",
  "user_id": "string", // Added based on POST response
  "title": "string",
  "description": "string",
  "url": "string",
  "resource_type": "string", // e.g., article, video, course, book
  "tags": ["string"],
  "completion_status": "string", // e.g., not_started, in_progress, completed
  "created_at": "string",
  "updated_at": "string",
  "notes": "string"
}
```

### Metric

Conceptual representation:

```json
{
  "id": "string", // Assuming string ID
  "user_id": "string", // Assuming association with user
  "date": "string",
  "study_hours": 2.5,
  "topics": ["string"], // Assuming array based on context
  "focus_score": 8,
  "notes": "string"
}
```

### Concept

Conceptual representation:

```json
{
  "id": "string", // Assuming string ID
  "user_id": "string", // Assuming association with user
  "title": "string",
  "content": "markdown content",
  "topics": ["string"],
  "reviews": [
    {
      "date": "string",
      "confidence": 4 // Example field
    }
  ],
  "next_review": "string", // Date string
  "created_at": "string", // Likely exists
  "updated_at": "string" // Likely exists
}
```

### Goal

Conceptual representation:

```json
{
  "id": "string", // Assuming string ID
  "user_id": "string", // Assuming association with user
  "title": "string",
  "description": "string",
  "target_date": "string", // Date string
  "priority": 8,
  "category": "string",
  "completed": false,
  "completion_date": null,
  "notes": "string",
  "created_at": "string", // Likely exists
  "updated_at": "string" // Likely exists
}
```

### Milestone

Conceptual representation:

```json
{
  "id": "string", // Assuming string ID
  "user_id": "string", // Assuming association with user
  "title": "string",
  "description": "string",
  "target_date": "string", // Date string
  "verification_method": "string",
  "resources": ["string"], // Assuming array of resource IDs
  "completed": false,
  "completion_date": null,
  "notes": "string",
  "created_at": "string", // Likely exists
  "updated_at": "string" // Likely exists
}
```

### Learning Path

Based on the `/api/learning-path/` API response (replaces previous Roadmap model):

```json
{
  "id": "string",
  "user_id": "string", // Assuming association with user
  "title": "string",
  "description": "string",
  "resources": [ // Array of resource objects or IDs
    {
      "id": "string",
      "title": "string",
      "resource_type": "string"
    }
    // ... or potentially just resource IDs ["string", "string"]
  ],
  "progress": 0, // Percentage or count
  "created_at": "string",
  "updated_at": "string"
}
```

## Authentication Flow

1. User registers or logs in through the frontend
2. Backend validates credentials and issues a JWT token
3. Frontend stores the token and includes it in the Authorization header for subsequent requests
4. Backend validates the token for each protected API endpoint
5. When the token expires, the frontend requests a new token

## Deployment Strategy (Planned)

> **Note:** While the following sections outline potential cloud deployment strategies, the primary method for running the full application stack locally is currently via Docker Compose, as detailed in the [**Docker Setup Guide**](/docs/DOCKER.md). The strategies below represent potential future deployment targets.

### Frontend Deployment (Vercel)

1. Connect GitHub repository to Vercel
2. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `.next`
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL`: URL of the backend API
4. Deploy and configure custom domain if needed

### Backend Deployment (Cloud Service)

1. Choose a cloud service (Railway, Render, AWS, etc.)
2. Configure deployment:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Set environment variables:
   - `MONGODB_URL`: MongoDB connection string
   - `SECRET_KEY`: Secret key for JWT
   - `FRONTEND_URL`: Frontend URL for CORS
4. Deploy and configure custom domain if needed

### Database Deployment (MongoDB Atlas)

1. Create a MongoDB Atlas account
2. Set up a new cluster
3. Configure network access and database users
4. Get the connection string and use it in the backend environment variables

## Future Enhancements

1. **Real-time Collaboration**
   - Study groups
   - Shared resources
   - Peer reviews

2. **AI-Powered Recommendations**
   - Personalized learning path suggestions
   - Resource recommendations
   - Adaptive review scheduling

3. **Mobile Application**
   - Native mobile experience
   - Offline support
   - Push notifications

4. **Integration with External Services**
   - LMS integrations
   - Calendar synchronization
   - Job market analysis

5. **Enhanced Analytics**
   - Predictive analytics
   - Learning pattern recognition
   - Comparative benchmarking