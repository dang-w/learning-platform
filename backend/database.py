import os
import motor.motor_asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get MongoDB connection string from environment variables
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "learning_platform")

# Create MongoDB client
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]

# Create indexes
async def create_indexes():
    # Create unique index on username
    await db.users.create_index("username", unique=True)

    # Create indexes for resources
    await db.resources.create_index("type")
    await db.resources.create_index("user_id")

    # Create indexes for reviews
    await db.reviews.create_index("resource_id")
    await db.reviews.create_index("user_id")

# Initialize database
async def init_db():
    try:
        await create_indexes()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Error initializing database: {e}")