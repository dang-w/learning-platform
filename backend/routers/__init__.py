"""Routers initialization module."""

# Import routers directly
from .users import router as users
from .resources import router as resources
from .progress import router as progress
from .learning_path import router as learning_path
from .reviews import router as reviews
from .sessions import router as sessions
from .lessons import router as lessons
from .url_extractor import router as url_extractor
from .auth import router as auth
from .notes import router as notes

# Export all routers
__all__ = [
    "users",
    "resources",
    "progress",
    "learning_path",
    "reviews",
    "sessions",
    "lessons",
    "url_extractor",
    "auth",
    "notes"
]