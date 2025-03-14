# AI/ML Learning Platform

A web-based learning platform to help track progress, manage knowledge, and optimize learning while transitioning from software development to AI/ML engineering.

## Overview

This platform provides a structured approach to learning AI/ML concepts with:

- Personalized learning path tracking
- Knowledge management with spaced repetition
- Progress monitoring and analytics
- Focus and productivity tools

## Architecture

The platform has been transformed from a local script-based system to a modern web application with:

- **Frontend**: Next.js application hosted on Vercel
- **Backend**: FastAPI Python application
- **Database**: MongoDB for data storage

For detailed architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Repository Structure

```
learning-platform/
├── backend/                # Python FastAPI backend
│   ├── main.py             # Main application entry point
│   ├── requirements.txt    # Python dependencies
│   ├── routers/            # API route handlers
│   │   ├── resources.py    # Learning resources API
│   │   ├── progress.py     # Progress tracking API
│   │   ├── reviews.py      # Spaced repetition API
│   │   └── learning_path.py # Learning goals and roadmap API
│   └── .env.example        # Example environment variables
├── frontend/               # Next.js frontend (to be implemented)
├── learning-path/          # Learning goals and roadmap templates
├── knowledge-base/         # Knowledge management templates
├── progress-tracking/      # Progress monitoring templates
├── projects/               # Hands-on projects templates
├── scripts/                # Original Python scripts (for reference)
├── ARCHITECTURE.md         # Detailed architecture documentation
└── README.md               # This file
```

## Getting Started

### Backend Setup

1. **Install dependencies**

```bash
cd backend
pip install -r requirements.txt
```

2. **Configure environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Run the development server**

```bash
uvicorn main:app --reload
```

The API will be available at http://localhost:8000. You can access the API documentation at http://localhost:8000/docs.

### Frontend Setup (Coming Soon)

The Next.js frontend will be implemented in the next phase. It will provide a modern, responsive UI for interacting with the platform.

## API Endpoints

The backend provides the following API endpoints:

### Authentication

- `POST /token` - Get access token
- `POST /users/` - Create new user
- `GET /users/me/` - Get current user info

### Resources

- `GET /api/resources/` - Get all resources
- `GET /api/resources/{resource_type}` - Get resources by type
- `POST /api/resources/{resource_type}` - Create a new resource
- `PUT /api/resources/{resource_type}/{resource_id}` - Update a resource
- `POST /api/resources/{resource_type}/{resource_id}/complete` - Mark resource as completed
- `DELETE /api/resources/{resource_type}/{resource_id}` - Delete a resource
- `GET /api/resources/next` - Get next resources to study
- `GET /api/resources/statistics` - Get resource statistics

### Progress

- `POST /api/progress/metrics` - Add daily study metrics
- `GET /api/progress/metrics` - Get study metrics
- `GET /api/progress/metrics/recent` - Get recent metrics summary
- `GET /api/progress/report/weekly` - Generate weekly report
- `DELETE /api/progress/metrics/{metric_id}` - Delete a metric

### Reviews

- `POST /api/reviews/concepts` - Create a new concept
- `GET /api/reviews/concepts` - Get all concepts
- `GET /api/reviews/concepts/{concept_id}` - Get a specific concept
- `PUT /api/reviews/concepts/{concept_id}` - Update a concept
- `DELETE /api/reviews/concepts/{concept_id}` - Delete a concept
- `POST /api/reviews/concepts/{concept_id}/review` - Mark concept as reviewed
- `GET /api/reviews/due` - Get concepts due for review
- `GET /api/reviews/new` - Get new concepts
- `GET /api/reviews/session` - Generate a review session
- `GET /api/reviews/statistics` - Get review statistics

### Learning Path

- `POST /api/learning-path/goals` - Create a new goal
- `GET /api/learning-path/goals` - Get all goals
- `GET /api/learning-path/goals/{goal_id}` - Get a specific goal
- `PUT /api/learning-path/goals/{goal_id}` - Update a goal
- `DELETE /api/learning-path/goals/{goal_id}` - Delete a goal
- `POST /api/learning-path/milestones` - Create a new milestone
- `GET /api/learning-path/milestones` - Get all milestones
- `GET /api/learning-path/milestones/{milestone_id}` - Get a specific milestone
- `PUT /api/learning-path/milestones/{milestone_id}` - Update a milestone
- `DELETE /api/learning-path/milestones/{milestone_id}` - Delete a milestone
- `POST /api/learning-path/roadmap` - Create or replace roadmap
- `GET /api/learning-path/roadmap` - Get the roadmap
- `PUT /api/learning-path/roadmap` - Update the roadmap
- `GET /api/learning-path/progress` - Get learning path progress

## Original Scripts

The original Python scripts are preserved in the `scripts/` directory for reference. These scripts provided the foundation for the functionality now implemented in the web application:

- `resource_manager.py` - Manage learning resources
- `progress_analyzer.py` - Analyze learning progress
- `review_scheduler.py` - Schedule spaced repetition

## Deployment

### Backend Deployment

The backend can be deployed to any cloud service that supports Python applications, such as:

- Railway
- Render
- Heroku
- AWS Elastic Beanstalk

### Frontend Deployment

The frontend will be deployable to Vercel with a simple connection to the GitHub repository.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Features

### Resource Management
- Curated collection of learning resources
- Resource categorization and filtering
- Progress tracking for each resource
- **URL Metadata Extraction**: Automatically extract title, description, and other metadata from resource URLs

### Knowledge Management
- **Concept Notes**: Create and organize knowledge concepts
- **Spaced Repetition**: Review concepts using scientifically-proven spaced repetition techniques
- **Confidence Tracking**: Rate your confidence level for each concept
- **Review Sessions**: Structured review sessions for efficient learning
- **Topic Organization**: Organize concepts by topics and difficulty levels

### Learning Path Management
- Goal setting and tracking
- Milestone creation and management
- Progress visualization
- Roadmap planning

### Authentication System
- Secure user authentication with JWT
- Profile management
- Password reset functionality