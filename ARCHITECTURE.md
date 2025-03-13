# AI/ML Learning Platform Architecture

This document outlines the architecture of the AI/ML Learning Platform, which has been transformed from a local script-based system to a modern web application with a frontend hosted on Vercel and a Python backend.

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

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI Library**: React
- **Styling**: Tailwind CSS
- **State Management**: React Query for server state, Zustand for client state
- **Authentication**: JWT with HTTP-only cookies
- **Data Visualization**: Chart.js / D3.js
- **Deployment**: Vercel

### Backend

- **Framework**: FastAPI
- **Language**: Python 3.10+
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT with OAuth2
- **Data Processing**: Pandas, NumPy
- **Visualization Generation**: Matplotlib
- **Deployment**: Cloud service (e.g., Railway, Render, or AWS)

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

5. **Knowledge Management**
   - Concept notes
   - Spaced repetition system
   - Review scheduling

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

## Data Models

### User

```json
{
  "username": "string",
  "email": "string",
  "hashed_password": "string",
  "full_name": "string",
  "disabled": false,
  "resources": {
    "articles": [],
    "videos": [],
    "courses": [],
    "books": []
  },
  "metrics": [],
  "concepts": [],
  "goals": [],
  "milestones": [],
  "roadmap": {}
}
```

### Resource

```json
{
  "id": 1,
  "title": "string",
  "url": "string",
  "topics": ["string"],
  "difficulty": "beginner|intermediate|advanced",
  "estimated_time": 60,
  "completed": false,
  "date_added": "2023-03-15T10:30:00",
  "completion_date": null,
  "notes": "string"
}
```

### Metric

```json
{
  "id": "20230315_103000",
  "date": "2023-03-15",
  "study_hours": 2.5,
  "topics": "linear algebra,neural networks",
  "focus_score": 8,
  "notes": "string"
}
```

### Concept

```json
{
  "id": "20230315_103000_neural_networks",
  "title": "Neural Networks",
  "content": "markdown content",
  "topics": ["deep learning", "neural networks"],
  "reviews": [
    {
      "date": "2023-03-15T10:30:00",
      "confidence": 4
    }
  ],
  "next_review": "2023-03-18T10:30:00"
}
```

### Goal

```json
{
  "id": "goal_20230315103000",
  "title": "Master Neural Networks",
  "description": "string",
  "target_date": "2023-06-15",
  "priority": 8,
  "category": "Deep Learning",
  "completed": false,
  "completion_date": null,
  "notes": "string"
}
```

### Milestone

```json
{
  "id": "milestone_20230315103000",
  "title": "Complete Deep Learning Specialization",
  "description": "string",
  "target_date": "2023-06-15",
  "verification_method": "Certificate",
  "resources": ["course_1", "course_2"],
  "completed": false,
  "completion_date": null,
  "notes": "string"
}
```

### Roadmap

```json
{
  "id": "roadmap_20230315103000",
  "title": "AI/ML Engineer Roadmap",
  "description": "string",
  "phases": [
    {
      "title": "Foundation",
      "description": "string",
      "items": [
        {
          "title": "Linear Algebra",
          "completed": true
        }
      ]
    }
  ],
  "created_at": "2023-03-15T10:30:00",
  "updated_at": "2023-03-15T10:30:00"
}
```

## Authentication Flow

1. User registers or logs in through the frontend
2. Backend validates credentials and issues a JWT token
3. Frontend stores the token and includes it in the Authorization header for subsequent requests
4. Backend validates the token for each protected API endpoint
5. When the token expires, the frontend requests a new token

## Deployment Strategy

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

## Migration from Local Scripts

The original local script-based system has been transformed into a web application by:

1. Converting Python scripts into FastAPI endpoints
2. Moving file-based storage to MongoDB
3. Creating a user authentication system
4. Developing a Next.js frontend for the UI
5. Implementing proper API security and validation

The core functionality of the original scripts has been preserved, but with the added benefits of:

- Multi-user support
- Web accessibility from any device
- Real-time data synchronization
- Enhanced visualization and UI
- Improved security and data integrity

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