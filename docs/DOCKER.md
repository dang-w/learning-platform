# Docker Setup Guide

This document provides comprehensive documentation for setting up, running, and maintaining the Learning Platform using Docker.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Getting Started](#getting-started)
4. [Configuration](#configuration)
5. [Docker in Development](#docker-in-development)
6. [Docker in Production](#docker-in-production)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)
9. [Updating](#updating)

## Overview

The Learning Platform is containerized using Docker, with the following services:

- **Frontend**: Next.js application (Node.js LTS version, e.g., 20.x)
- **Backend**: FastAPI application (Python 3.11+)
- **MongoDB**: Database (Version 7.0)
- **Redis**: Caching layer (Version 7.2)

## Prerequisites

- Docker 24.0+
- Docker Compose 2.20+
- 4GB RAM minimum (8GB recommended)
- 20GB free disk space

## Getting Started

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/learning-platform.git
cd learning-platform

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

### Building Individual Services

```bash
# Build and start only the backend
docker-compose up -d --build backend

# Build and start only the frontend
docker-compose up -d --build frontend
```

## Configuration

### Environment Variables

The `docker-compose.yml` file sets default environment variables directly for development purposes, including API keys, database connections (internal to the Docker network), and debug settings. You generally do not need a separate `.env` file just to run `docker-compose up`.

However, the MongoDB root username and password can be overridden if needed. If you wish to change the default MongoDB credentials (`admin`/`password`), you can create a `.env` file in the project root containing:

```
# Optional: Override default MongoDB root credentials
MONGO_INITDB_ROOT_USERNAME=your_mongo_admin
MONGO_INITDB_ROOT_PASSWORD=your_mongo_password
```

For production deployments, environment variables should be managed securely outside the compose file (e.g., using secrets management tools or platform-specific environment variable settings).

### Volumes

The docker-compose.yml defines several persistent volumes:

- `mongodb_data`: Stores MongoDB data
- `redis_data`: Stores Redis data
- `backend_deps`: Stores Python virtual environment

To manage volumes:

```bash
# List all volumes
docker volume ls

# Inspect a volume
docker volume inspect learning-platform_mongodb_data

# Remove unused volumes (be careful!)
docker volume prune
```

## Docker in Development

### Hot Reloading

Both the frontend and backend containers are configured with volume mounts for hot reloading:

- Frontend code changes will automatically trigger a rebuild
- Backend code changes will be reflected immediately due to the `--reload` flag in uvicorn

### Running Tests

```bash
# Run backend tests
docker-compose exec backend pytest

# Run frontend unit tests
docker-compose exec frontend npm test

# Run frontend E2E tests (headless)
docker-compose exec frontend npm run e2e:headless
```

### Accessing Container Shells

```bash
# Access the backend shell
docker-compose exec backend bash

# Access the frontend shell
docker-compose exec frontend sh

# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p password
```

## Docker in Production

For production deployments, we recommend:

1. Create a `docker-compose.prod.yml` file with production-specific settings
2. Use Docker Swarm or Kubernetes for orchestration
3. Set up proper TLS termination
4. Use a proper secrets management solution
5. Implement monitoring and logging

### Production Configuration

```yaml
# Example docker-compose.prod.yml
version: '3.8'

services:
  mongodb:
    # Use volumes managed by your orchestration system
    volumes:
      - mongodb_prod:/data/db
    # Additional security settings
    command: ["--auth", "--wiredTigerCacheSizeGB", "2"]
    deploy:
      resources:
        limits:
          memory: 4G

  backend:
    environment:
      - DEBUG=false
      - LOG_LEVEL=WARNING
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G

  frontend:
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
```

### Deployment Example with Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy the stack
docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml learning-platform

# Scale services
docker service scale learning-platform_backend=3 learning-platform_frontend=2

# Update services
docker service update --image your-registry/backend:v2 learning-platform_backend
```

## Troubleshooting

### Common Issues

#### Connection Issues

If services can't connect to each other:

1. Check if the services are running: `docker-compose ps`
2. Check logs for connection errors: `docker-compose logs backend`
3. Verify network settings: `docker network inspect learning-platform-network`

#### Container Crashes

1. Check container logs: `docker-compose logs -f backend`
2. Check system resources: `docker stats`
3. Verify volume permissions

#### Performance Issues

1. Check container resource usage: `docker stats`
2. Consider increasing resource limits in the compose file
3. Check MongoDB and Redis configuration for optimizations

### Debugging

```bash
# Run a container with debugging tools
docker-compose exec backend bash
pip install debugpy

# Modify uvicorn command in Dockerfile for remote debugging
CMD ["python", "-m", "debugpy", "--listen", "0.0.0.0:5678", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Maintenance

### Backup and Restore

#### Backing up MongoDB

```bash
# Create a MongoDB backup
docker-compose exec mongodb mongodump --username admin --password password --authenticationDatabase admin --db learning_platform --out /data/backup

# Copy backup to host
docker cp $(docker-compose ps -q mongodb):/data/backup ./backup
```

#### Restoring MongoDB

```bash
# Copy backup to container
docker cp ./backup $(docker-compose ps -q mongodb):/data/

# Restore backup
docker-compose exec mongodb mongorestore --username admin --password password --authenticationDatabase admin --db learning_platform /data/backup/learning_platform
```

### Monitoring

Set up monitoring using Prometheus and Grafana:

```yaml
# Add to docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    depends_on:
      - prometheus
    ports:
      - "3000:3000"
```

## Updating

### Updating Docker Images

```bash
# Pull latest images
docker-compose pull

# Rebuild with latest base images
docker-compose build --pull

# Restart with updated images
docker-compose up -d
```

### Updating Application Code

```bash
# Pull latest code
git pull

# Rebuild containers with new code
docker-compose build

# Apply the updates
docker-compose up -d
```

### Database Migrations

When the application requires database changes:

1. Create migration scripts in `backend/migrations/`
2. Run migrations before updating the application:

```bash
docker-compose exec backend python -m migrations.run
```