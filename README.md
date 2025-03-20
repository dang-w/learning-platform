# AI/ML Learning Platform

A web-based learning platform to help track progress, manage knowledge, and optimize learning while transitioning from software development to AI/ML engineering.

## Overview

This platform provides a structured approach to learning AI/ML concepts with:

- Personalized learning path tracking
- Knowledge management with spaced repetition
- Progress monitoring and analytics
- Focus and productivity tools
- Interactive data visualizations

## Documentation

The project documentation has been reorganized for better clarity and maintenance:

### Architecture and Design
- [Architecture Documentation](docs/architecture/ARCHITECTURE.md) - System design and architecture

### API Documentation
- [API Documentation](docs/api/API_DOCUMENTATION.md) - Comprehensive API endpoints documentation

### Testing
- [Comprehensive Testing Plan](docs/testing/COMPREHENSIVE_TESTING_PLAN.md) - Testing strategy and plans
- [Testing Guide](docs/testing/TESTING_GUIDE.md) - Guide for testing the application
- [E2E Testing Fixes](docs/testing/e2e-testing-fixes.md) - Fixes for E2E test issues
- [Test Results Template](docs/testing/TEST_RESULTS_TEMPLATE.md) - Template for documenting test results

### Development
- [Development Status](docs/development/DEVELOPMENT_STATUS.md) - Current status of development
- [Findings](docs/development/FINDINGS.md) - Recent findings and progress updates

### Project Analysis
- [Project Analysis](PROJECT_ANALYSIS.md) - Comprehensive analysis and improvement plan

## Current Implementation Status

### Completed
- ✅ Backend API with FastAPI
- ✅ MongoDB database integration
- ✅ Authentication system with JWT
- ✅ Frontend foundation with Next.js 15
- ✅ Resource management functionality
- ✅ URL metadata extraction integration
- ✅ Learning path tracking
- ✅ Knowledge management system with spaced repetition
- ✅ Basic UI components and layouts
- ✅ Progress analytics dashboard

### In Progress
- 🔄 Testing suite implementation
  - ✅ Backend unit tests with pytest
  - ✅ Frontend unit tests with Jest
  - 🔄 End-to-end tests with Cypress
  - ✅ Backend integration tests
  - ✅ Frontend integration tests

### Not Started
- ❌ Deployment configuration
- ❌ CI/CD pipeline setup
- ❌ Production environment configuration

## Features

### Resource Management
- Add and organize learning resources (articles, videos, courses, books)
- Track completion status and notes
- Extract metadata from URLs for easy resource addition

### Knowledge Management System
- Create and organize knowledge concepts with markdown support
- Review concepts based on a spaced repetition algorithm
- Filter concepts by topic and difficulty
- Track confidence levels over time
- Interactive markdown editor for content creation

### Data Visualization Dashboard
- Interactive charts for learning progress
- Study metrics visualization with time-based filtering
- Review statistics with confidence trends
- Learning path progress tracking
- Resource completion statistics by type
- Topic distribution analysis

### Progress Analytics
- Comprehensive study time analytics with pattern recognition
- Resource completion tracking and projections
- Knowledge retention metrics and visualization
- Learning path progress analysis
- Weekly report generation with performance comparisons
- Interactive date range selection and filtering
- Multiple chart types for different data visualization needs

### Learning Path Tracking
- Create custom learning paths
- Track progress through learning paths
- Visualize completion percentages
- Get recommendations for next resources to study

## Architecture

The platform has been transformed from a local script-based system to a modern web application with:

- **Frontend**: Next.js application (to be hosted on Vercel)
- **Backend**: FastAPI Python application
- **Database**: MongoDB for data storage

For detailed architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Repository Structure

```
learning-platform/
├── backend/                # Python FastAPI backend
│   ├── main.py             # Main application entry point
│   ├── requirements.txt    # Python dependencies
│   ├── auth.py             # Authentication logic
│   ├── database.py         # Database connection
│   ├── tests/              # Backend test suite
│   │   ├── api/            # API endpoint tests
│   │   ├── services/       # Service layer tests
│   │   └── utils/          # Utility function tests
│   ├── routers/            # API route handlers
│   │   ├── resources.py    # Learning resources API
│   │   ├── progress.py     # Progress tracking API
│   │   ├── reviews.py      # Spaced repetition API
│   │   └── learning_path.py # Learning goals and roadmap API
│   └── .env.example        # Example environment variables
├── frontend/               # Next.js frontend
│   ├── src/                # Source code
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # Reusable UI components
│   │   ├── lib/            # Utility functions and hooks
│   │   ├── types/          # TypeScript type definitions
│   │   └── __tests__/      # Frontend test suite
│   ├── cypress/            # End-to-end tests
│   │   └── e2e/            # E2E test specifications
│   └── jest.config.mjs     # Jest configuration
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

### Frontend Setup

1. **Install dependencies**

```bash
cd frontend
npm install
```

2. **Configure environment variables**

```bash
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

3. **Run the development server**

```bash
npm run dev
```

The frontend will be available at http://localhost:3000.

## Testing

### Backend Tests

The backend has comprehensive test coverage with both unit tests and integration tests:

#### Unit Tests

Run the backend unit tests with:

```bash
cd backend
pytest tests/api tests/services tests/utils
```

For test coverage report:

```bash
pytest --cov=app tests/api tests/services tests/utils
```