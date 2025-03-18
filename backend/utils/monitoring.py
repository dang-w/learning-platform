import os
import time
import logging
import asyncio
from datetime import datetime
from fastapi import Request, Response
from typing import Dict, Any, Optional, List, Callable
import json
from contextlib import asynccontextmanager

# Configure logging
logger = logging.getLogger("monitoring")
logger.setLevel(logging.INFO)

# Metrics storage (in-memory for now, could be replaced with a proper time-series DB)
metrics = {
    "requests": {
        "total": 0,
        "by_path": {},
        "by_method": {},
        "by_status": {},
    },
    "auth": {
        "login_attempts": 0,
        "login_success": 0,
        "login_failure": 0,
        "token_refresh": 0,
        "token_refresh_failure": 0,
    },
    "resources": {
        "created": 0,
        "updated": 0,
        "deleted": 0,
        "viewed": 0,
    },
    "performance": {
        "response_times": [],
        "slow_requests": [],
    },
    "errors": {
        "total": 0,
        "by_path": {},
        "by_type": {},
    },
    "rate_limits": {
        "total_exceeded": 0,
        "by_endpoint": {},
    },
    "sessions": {
        "created": 0,
        "terminated": 0,
        "expired": 0,
    }
}

# Configuration
SLOW_REQUEST_THRESHOLD = float(os.getenv("SLOW_REQUEST_THRESHOLD", "0.5"))  # seconds
MAX_RESPONSE_TIMES = 1000  # Limit the size of response_times list
MAX_SLOW_REQUESTS = 100    # Limit the size of slow_requests list

# Alerts configuration (webhook URLs or other notification channels)
ALERT_WEBHOOKS = os.getenv("ALERT_WEBHOOKS", "").split(",")
ALERT_ENABLED = os.getenv("ALERT_ENABLED", "False").lower() == "true"

async def log_request_metrics(request: Request, response: Response, duration: float) -> None:
    """Log metrics for a request"""
    path = request.url.path
    method = request.method
    status = response.status_code

    # Update total request count
    metrics["requests"]["total"] += 1

    # Update by path
    metrics["requests"]["by_path"][path] = metrics["requests"]["by_path"].get(path, 0) + 1

    # Update by method
    metrics["requests"]["by_method"][method] = metrics["requests"]["by_method"].get(method, 0) + 1

    # Update by status
    status_str = str(status)
    metrics["requests"]["by_status"][status_str] = metrics["requests"]["by_status"].get(status_str, 0) + 1

    # Track performance
    metrics["performance"]["response_times"].append(duration)
    if len(metrics["performance"]["response_times"]) > MAX_RESPONSE_TIMES:
        metrics["performance"]["response_times"].pop(0)

    # Track slow requests
    if duration > SLOW_REQUEST_THRESHOLD:
        slow_request = {
            "path": path,
            "method": method,
            "duration": duration,
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "client_ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("User-Agent", "unknown"),
        }
        metrics["performance"]["slow_requests"].append(slow_request)
        if len(metrics["performance"]["slow_requests"]) > MAX_SLOW_REQUESTS:
            metrics["performance"]["slow_requests"].pop(0)

        # Log slow request
        logger.warning(f"Slow request: {path} - {duration:.2f}s - {status} - {method}")

async def log_auth_metrics(event_type: str) -> None:
    """Log authentication-related metrics"""
    if event_type in metrics["auth"]:
        metrics["auth"][event_type] += 1

    # Additional logic for specific events
    if event_type == "login_failure":
        # Check for potential brute force attempts
        recent_failures = metrics["auth"]["login_failure"]
        recent_success = metrics["auth"]["login_success"]

        if recent_failures > 10 and recent_success == 0:
            await send_alert("Potential brute force attack detected", {
                "login_failures": recent_failures,
                "login_success": recent_success,
                "timestamp": datetime.now().isoformat()
            })

async def log_resource_metrics(event_type: str) -> None:
    """Log resource-related metrics"""
    if event_type in metrics["resources"]:
        metrics["resources"][event_type] += 1

async def log_error(path: str, error_type: str, details: Dict[str, Any]) -> None:
    """Log an error occurrence"""
    metrics["errors"]["total"] += 1

    # Update by path
    metrics["errors"]["by_path"][path] = metrics["errors"]["by_path"].get(path, 0) + 1

    # Update by type
    metrics["errors"]["by_type"][error_type] = metrics["errors"]["by_type"].get(error_type, 0) + 1

    # Log the error
    logger.error(f"Error in {path}: {error_type} - {json.dumps(details)}")

    # Send alert for critical errors
    if error_type in ["DatabaseConnectionError", "AuthenticationError", "ServerError"]:
        await send_alert(f"Critical error: {error_type}", {
            "path": path,
            "error_type": error_type,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

async def log_rate_limit(endpoint: str) -> None:
    """Log rate limit exceeded events"""
    metrics["rate_limits"]["total_exceeded"] += 1
    metrics["rate_limits"]["by_endpoint"][endpoint] = metrics["rate_limits"]["by_endpoint"].get(endpoint, 0) + 1

async def log_session_event(event_type: str) -> None:
    """Log session-related events"""
    if event_type in metrics["sessions"]:
        metrics["sessions"][event_type] += 1

async def send_alert(title: str, data: Dict[str, Any]) -> None:
    """Send an alert to configured channels"""
    if not ALERT_ENABLED or not ALERT_WEBHOOKS:
        return

    alert_data = {
        "title": title,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }

    logger.warning(f"ALERT: {title} - {json.dumps(data)}")

    # In a real implementation, this would send to actual services
    # For now, just log it
    pass

def get_metrics() -> Dict[str, Any]:
    """Get current metrics"""
    # Calculate some derived metrics
    avg_response_time = 0
    if metrics["performance"]["response_times"]:
        avg_response_time = sum(metrics["performance"]["response_times"]) / len(metrics["performance"]["response_times"])

    # Clean up the metrics before returning
    result = {
        "requests": {
            "total": metrics["requests"]["total"],
            "by_path": dict(sorted(metrics["requests"]["by_path"].items(), key=lambda x: x[1], reverse=True)[:10]),
            "by_method": metrics["requests"]["by_method"],
            "by_status": metrics["requests"]["by_status"],
        },
        "auth": metrics["auth"],
        "resources": metrics["resources"],
        "performance": {
            "avg_response_time": avg_response_time,
            "slow_requests_count": len(metrics["performance"]["slow_requests"]),
            "recent_slow_requests": metrics["performance"]["slow_requests"][-5:] if metrics["performance"]["slow_requests"] else [],
        },
        "errors": {
            "total": metrics["errors"]["total"],
            "by_path": dict(sorted(metrics["errors"]["by_path"].items(), key=lambda x: x[1], reverse=True)[:10]),
            "by_type": metrics["errors"]["by_type"],
        },
        "rate_limits": {
            "total_exceeded": metrics["rate_limits"]["total_exceeded"],
            "by_endpoint": dict(sorted(metrics["rate_limits"]["by_endpoint"].items(), key=lambda x: x[1], reverse=True)[:10]),
        },
        "sessions": metrics["sessions"],
        "timestamp": datetime.now().isoformat(),
    }

    return result

def reset_metrics() -> None:
    """Reset metrics (for testing or rotating metrics)"""
    global metrics
    metrics = {
        "requests": {
            "total": 0,
            "by_path": {},
            "by_method": {},
            "by_status": {},
        },
        "auth": {
            "login_attempts": 0,
            "login_success": 0,
            "login_failure": 0,
            "token_refresh": 0,
            "token_refresh_failure": 0,
        },
        "resources": {
            "created": 0,
            "updated": 0,
            "deleted": 0,
            "viewed": 0,
        },
        "performance": {
            "response_times": [],
            "slow_requests": [],
        },
        "errors": {
            "total": 0,
            "by_path": {},
            "by_type": {},
        },
        "rate_limits": {
            "total_exceeded": 0,
            "by_endpoint": {},
        },
        "sessions": {
            "created": 0,
            "terminated": 0,
            "expired": 0,
        }
    }

@asynccontextmanager
async def track_request_performance(request: Request, call_next: Callable) -> Response:
    """Context manager to track request performance"""
    start_time = time.time()
    try:
        response = await call_next(request)
        return response
    finally:
        duration = time.time() - start_time
        # Run this in the background to avoid slowing down the response
        asyncio.create_task(log_request_metrics(request, response, duration))

async def startup_monitoring():
    """Initialize monitoring on application startup"""
    logger.info("Initializing monitoring system")
    # Here we could connect to external monitoring services if needed
    reset_metrics()

async def shutdown_monitoring():
    """Cleanup monitoring on application shutdown"""
    logger.info("Shutting down monitoring system")
    # Here we could persist metrics or perform cleanup if needed