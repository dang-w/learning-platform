# AI/ML Learning Platform

A comprehensive platform for AI/ML students to organize learning resources, track progress, and manage knowledge using spaced repetition techniques.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Overview

The AI/ML Learning Platform helps students efficiently manage their journey through the complex field of artificial intelligence and machine learning. It provides tools for resource organization, progress tracking, knowledge management with spaced repetition, and data-driven insights into learning patterns.

## Features

- **Resource Management**: Organize articles, videos, courses, and books
- **Progress Tracking**: Monitor completion status and time spent on resources
- **Knowledge Management**: Create concept cards and review them using spaced repetition
- **Learning Paths**: Define learning goals and milestones
- **Analytics**: Visualize learning progress and resource usage
- **URL Processing**: Extract metadata from learning resource URLs

## Project Structure

The project is organized with a clear separation between frontend and backend components:

```
learning-platform/
├── frontend/               # Next.js frontend application
│   ├── src/                # Frontend source code
│   │   ├── app/            # Next.js app directory
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   └── types/          # TypeScript type definitions
│   ├── public/             # Static assets
│   └── e2e/                # End-to-end testing with Cypress
├── backend/                # FastAPI backend application
│   ├── app/                # Application code
│   │   ├── api/            # API routes
│   │   ├── models/         # Data models
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   └── tests/              # Backend tests
└── docs/                   # Project documentation
    ├── architecture/       # Architecture documentation
    ├── api/                # API documentation
    ├── testing/            # Testing documentation
    └── development/        # Development guides
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm for frontend
- Python 3.11+ for backend
- MongoDB 5.0+
- Docker and Docker Compose (optional, for containerized setup)

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at http://localhost:3000

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn main:app --reload
```

The API will be available at http://localhost:8000

### Docker Setup (Recommended)

The project includes Docker configuration for easy setup and deployment. We use Docker Compose to orchestrate all services.

#### Prerequisites

- Docker 24.0+
- Docker Compose 2.20+

#### Running with Docker

```bash
# Clone the repository
git clone https://github.com/yourusername/learning-platform.git
cd learning-platform

# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for a specific service
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop all services and remove volumes (will delete all data)
docker-compose down -v
```

This will start the following services:
- Frontend at http://localhost:3000
- Backend API at http://localhost:8000
- MongoDB at localhost:27017
- Redis at localhost:6379

#### Environment Configuration

You can customize the environment by editing the variables in the `docker-compose.yml` file or by creating a `.env` file in the project root.

```bash
# Example .env file content
MONGO_USERNAME=admin
MONGO_PASSWORD=secure_password
SECRET_KEY=your_production_secret_key
DEBUG=false
```

#### Docker in Production

For production deployments, consider the following best practices:

1. Use proper secrets management (not environment variables)
2. Set up proper logging and monitoring
3. Use a container orchestration system like Kubernetes
4. Configure TLS for all services
5. Set up proper backup systems for databases

## Documentation

We maintain comprehensive documentation for all aspects of the project:

- [**Documentation Hub**](/docs/README.md): Central index of all documentation
- [**Architecture Documentation**](/docs/architecture/ARCHITECTURE.md): System design and components
- [**API Documentation**](/docs/api/API_DOCUMENTATION.md): API endpoints and usage
- [**Docker Setup Guide**](/docs/DOCKER.md): Complete Docker configuration and usage
- [**Frontend Documentation**](/frontend/README.md): Frontend-specific documentation
- [**Backend Documentation**](/backend/README.md): Backend-specific documentation

## Testing

The platform includes comprehensive testing for both frontend and backend:

### Frontend Testing

- **End-to-End Tests**: Cypress tests simulating user interactions
- **Integration Tests**: Testing component interactions
- **Unit Tests**: Testing individual components

For detailed frontend testing information, see:
- [Frontend E2E Testing Documentation](/frontend/e2e/README.md)

### Backend Testing

- **API Tests**: Testing API endpoints
- **Integration Tests**: Testing service interactions
- **Unit Tests**: Testing individual functions

For detailed backend testing information, see:
- [Backend Testing Documentation](/backend/TESTING.md)

### Running Tests

```bash
# Frontend tests
cd frontend
npm run e2e:headless  # Run E2E tests headlessly (Corrected command)
npm test              # Run unit tests (Corrected command)

# Backend tests
cd backend
pytest                  # Run all backend tests
pytest --cov=app        # Run with coverage report
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.