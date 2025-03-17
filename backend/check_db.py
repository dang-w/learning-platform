import asyncio
import motor.motor_asyncio

async def check_db():
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['test_learning_platform']
    users = await db.users.find().to_list(length=100)
    print('Users in database:', [u.get('username') for u in users])

    # Create a test user if it doesn't exist
    test_user = {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password123
        "disabled": False,
        "resources": [],
        "study_sessions": [],
        "review_sessions": [],
        "learning_paths": [],
        "reviews": [],
        "concepts": [],
        "goals": [],
        "milestones": []
    }

    result = await db.users.update_one(
        {"username": "testuser"},
        {"$set": test_user},
        upsert=True
    )

    print(f"Update result: matched={result.matched_count}, modified={result.modified_count}, upserted={result.upserted_id is not None}")

    # Check again
    users = await db.users.find().to_list(length=100)
    print('Users in database after update:', [u.get('username') for u in users])

if __name__ == "__main__":
    asyncio.run(check_db())