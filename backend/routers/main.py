from fastapi import FastAPI
from backend.routers.sessions import router as sessions_router  # Import session management router
from backend.routers.sessions import cleanup_expired_sessions
import asyncio

app = FastAPI()

# ... existing router registrations ...
app.include_router(sessions_router)  # Register session management endpoints

# ... existing code ...

@app.on_event("startup")
async def schedule_session_cleanup():
    async def cleanup_loop():
        while True:
            count = await cleanup_expired_sessions()
            if count:
                print(f"Cleaned up {count} expired sessions")
            await asyncio.sleep(3600)  # Run every hour
    asyncio.create_task(cleanup_loop())