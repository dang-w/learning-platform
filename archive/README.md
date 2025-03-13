# Archive Directory

This directory contains the original script-based implementation of the AI/ML Learning Platform. These files are preserved for reference purposes as the platform has been transformed into a modern web application with a Next.js frontend and FastAPI backend.

## Original Structure

The original implementation was organized as follows:

- `scripts/` - Python scripts for managing resources, analyzing progress, and scheduling reviews
- `learning-path/` - Templates for goals, roadmap, and milestones
- `knowledge-base/` - Templates for concept notes, journal entries, and resources
- `progress-tracking/` - Templates for weekly reviews and metrics tracking
- `projects/` - Templates for project documentation

## Migration to Web Application

The functionality provided by these scripts and templates has been implemented in the web application:

- The Python scripts have been converted to FastAPI endpoints
- The templates have been transformed into React components
- File-based storage has been replaced with MongoDB
- A user authentication system has been added
- A modern UI has been implemented with Next.js and Tailwind CSS

For more information about the new architecture, see the [ARCHITECTURE.md](../ARCHITECTURE.md) file in the root directory.