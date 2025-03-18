"""
Utility modules for the learning platform backend.

This package contains various utility modules used throughout the backend application.
"""

from .db_utils import get_document_by_id, update_document, delete_document
from .monitoring import (
    log_auth_metrics,
    log_error,
    log_rate_limit,
    log_resource_metrics,
    log_session_event,
    get_metrics,
    reset_metrics,
    startup_monitoring,
    shutdown_monitoring
)