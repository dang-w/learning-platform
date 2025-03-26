from typing import Optional
import redis.asyncio as redis
import os
from dotenv import load_dotenv

load_dotenv()

_redis_client: Optional[redis.Redis] = None

def get_redis_connection() -> Optional[redis.Redis]:
    """Get Redis connection singleton."""
    global _redis_client

    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        _redis_client = redis.from_url(redis_url, decode_responses=True)

    return _redis_client