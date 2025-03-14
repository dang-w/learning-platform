import asyncio
import motor.motor_asyncio
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from passlib.context import CryptContext

# Load environment variables
load_dotenv()

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.learning_platform_db

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

async def init_db():
    """Initialize the database with collections and indexes."""
    print("🔍 Initializing database...")

    # Create collections if they don't exist
    collections = await db.list_collection_names()

    if "users" not in collections:
        await db.create_collection("users")
        print("✅ Created users collection")

    # Create indexes
    await db.users.create_index("username", unique=True)
    await db.users.create_index("email", unique=True)
    print("✅ Created indexes on users collection")

    print("✅ Database initialization completed!")

async def create_sample_user():
    """Create a sample user for testing."""
    print("🔍 Creating sample user...")

    # Check if sample user already exists
    sample_user = await db.users.find_one({"username": "sample_user"})

    if sample_user:
        print("✅ Sample user already exists")
        return

    # Create sample user
    hashed_password = get_password_hash("sample_password")
    user_dict = {
        "username": "sample_user",
        "email": "sample@example.com",
        "full_name": "Sample User",
        "hashed_password": hashed_password,
        "disabled": False,
        "resources": {
            "articles": [],
            "videos": [],
            "courses": [],
            "books": []
        },
        "metrics": [],
        "review_log": {}
    }

    await db.users.insert_one(user_dict)
    print("✅ Created sample user")

async def create_sample_resources():
    """Create sample resources for the sample user."""
    print("🔍 Creating sample resources...")

    # Get sample user
    sample_user = await db.users.find_one({"username": "sample_user"})

    if not sample_user:
        print("❌ Sample user not found")
        return

    # Check if sample user already has resources
    if sample_user["resources"]["articles"] or sample_user["resources"]["videos"]:
        print("✅ Sample resources already exist")
        return

    # Sample articles
    articles = [
        {
            "id": 1,
            "title": "Introduction to Machine Learning",
            "url": "https://example.com/intro-to-ml",
            "topics": ["machine learning", "ai", "introduction"],
            "difficulty": "beginner",
            "estimated_time": 30,
            "completed": False,
            "date_added": datetime.now().strftime("%Y-%m-%d"),
            "completion_date": None,
            "notes": ""
        },
        {
            "id": 2,
            "title": "Deep Learning Fundamentals",
            "url": "https://example.com/deep-learning",
            "topics": ["deep learning", "neural networks", "ai"],
            "difficulty": "intermediate",
            "estimated_time": 60,
            "completed": False,
            "date_added": datetime.now().strftime("%Y-%m-%d"),
            "completion_date": None,
            "notes": ""
        }
    ]

    # Sample videos
    videos = [
        {
            "id": 1,
            "title": "Python for Data Science",
            "url": "https://example.com/python-data-science",
            "topics": ["python", "data science", "programming"],
            "difficulty": "beginner",
            "estimated_time": 45,
            "completed": False,
            "date_added": datetime.now().strftime("%Y-%m-%d"),
            "completion_date": None,
            "notes": ""
        },
        {
            "id": 2,
            "title": "TensorFlow Tutorial",
            "url": "https://example.com/tensorflow-tutorial",
            "topics": ["tensorflow", "deep learning", "programming"],
            "difficulty": "intermediate",
            "estimated_time": 90,
            "completed": False,
            "date_added": datetime.now().strftime("%Y-%m-%d"),
            "completion_date": None,
            "notes": ""
        }
    ]

    # Update sample user with resources
    await db.users.update_one(
        {"username": "sample_user"},
        {"$set": {
            "resources.articles": articles,
            "resources.videos": videos
        }}
    )

    print("✅ Created sample resources")

async def create_sample_metrics():
    """Create sample metrics for the sample user."""
    print("🔍 Creating sample metrics...")

    # Get sample user
    sample_user = await db.users.find_one({"username": "sample_user"})

    if not sample_user:
        print("❌ Sample user not found")
        return

    # Check if sample user already has metrics
    if sample_user.get("metrics"):
        print("✅ Sample metrics already exist")
        return

    # Generate sample metrics for the past 7 days
    metrics = []
    today = datetime.now()

    for i in range(7):
        date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        metrics.append({
            "id": str(i + 1),
            "date": date,
            "study_hours": round(2 + i * 0.5, 1),  # Increasing study hours
            "topics": "python,machine learning,deep learning",
            "focus_score": min(5, 3 + i // 2),  # Increasing focus score (max 5)
            "notes": f"Study session on day {i+1}"
        })

    # Update sample user with metrics
    await db.users.update_one(
        {"username": "sample_user"},
        {"$set": {"metrics": metrics}}
    )

    print("✅ Created sample metrics")

async def create_sample_concepts():
    """Create sample concepts for the sample user."""
    print("🔍 Creating sample concepts...")

    # Get sample user
    sample_user = await db.users.find_one({"username": "sample_user"})

    if not sample_user:
        print("❌ Sample user not found")
        return

    # Check if sample user already has concepts
    if sample_user.get("review_log") and sample_user["review_log"].get("concepts"):
        print("✅ Sample concepts already exist")
        return

    # Sample concepts
    concepts = [
        {
            "id": "1",
            "title": "Supervised Learning",
            "content": "Supervised learning is a type of machine learning where the model is trained on labeled data.",
            "topics": ["machine learning", "supervised learning"],
            "reviews": [],
            "next_review": datetime.now().strftime("%Y-%m-%d")
        },
        {
            "id": "2",
            "title": "Neural Networks",
            "content": "Neural networks are computing systems inspired by the biological neural networks in animal brains.",
            "topics": ["deep learning", "neural networks"],
            "reviews": [],
            "next_review": datetime.now().strftime("%Y-%m-%d")
        },
        {
            "id": "3",
            "title": "Backpropagation",
            "content": "Backpropagation is an algorithm used to train neural networks by adjusting weights based on the error rate.",
            "topics": ["deep learning", "neural networks", "algorithms"],
            "reviews": [],
            "next_review": datetime.now().strftime("%Y-%m-%d")
        }
    ]

    # Update sample user with concepts
    await db.users.update_one(
        {"username": "sample_user"},
        {"$set": {"review_log.concepts": concepts}}
    )

    print("✅ Created sample concepts")

async def create_sample_learning_path():
    """Create sample learning path data for the sample user."""
    print("🔍 Creating sample learning path data...")

    # Get sample user
    sample_user = await db.users.find_one({"username": "sample_user"})

    if not sample_user:
        print("❌ Sample user not found")
        return

    # Check if sample user already has learning path data
    if sample_user.get("learning_path"):
        print("✅ Sample learning path data already exists")
        return

    # Sample milestones
    milestones = [
        {
            "id": "1",
            "title": "Complete Python Basics",
            "description": "Learn the fundamentals of Python programming",
            "target_date": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
            "verification_method": "Complete a Python project",
            "resources": ["https://example.com/python-basics"],
            "completed": False,
            "completion_date": None,
            "notes": ""
        },
        {
            "id": "2",
            "title": "Understand Machine Learning Fundamentals",
            "description": "Learn the core concepts of machine learning",
            "target_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "verification_method": "Build a simple ML model",
            "resources": ["https://example.com/ml-fundamentals"],
            "completed": False,
            "completion_date": None,
            "notes": ""
        }
    ]

    # Sample goals
    goals = [
        {
            "id": "1",
            "title": "Learn TensorFlow",
            "description": "Become proficient in using TensorFlow for deep learning",
            "target_date": (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d"),
            "priority": 1,
            "category": "technical",
            "completed": False,
            "completion_date": None,
            "notes": ""
        },
        {
            "id": "2",
            "title": "Complete a Data Science Project",
            "description": "Apply ML skills to a real-world data science project",
            "target_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"),
            "priority": 2,
            "category": "project",
            "completed": False,
            "completion_date": None,
            "notes": ""
        }
    ]

    # Sample roadmap
    roadmap = {
        "id": "1",
        "title": "Machine Learning Engineer Roadmap",
        "description": "A comprehensive roadmap to become a machine learning engineer",
        "phases": [
            {
                "title": "Phase 1: Programming Fundamentals",
                "description": "Learn the basics of programming with Python",
                "resources": ["https://example.com/python-basics"]
            },
            {
                "title": "Phase 2: Data Science Basics",
                "description": "Learn data manipulation, analysis, and visualization",
                "resources": ["https://example.com/data-science-basics"]
            },
            {
                "title": "Phase 3: Machine Learning",
                "description": "Learn machine learning algorithms and techniques",
                "resources": ["https://example.com/machine-learning"]
            },
            {
                "title": "Phase 4: Deep Learning",
                "description": "Learn deep learning frameworks and applications",
                "resources": ["https://example.com/deep-learning"]
            }
        ],
        "created_at": datetime.now().strftime("%Y-%m-%d"),
        "updated_at": datetime.now().strftime("%Y-%m-%d")
    }

    # Update sample user with learning path data
    await db.users.update_one(
        {"username": "sample_user"},
        {"$set": {
            "learning_path.milestones": milestones,
            "learning_path.goals": goals,
            "learning_path.roadmap": roadmap
        }}
    )

    print("✅ Created sample learning path data")

async def main():
    print("🔍 Initializing AI/ML Learning Platform database...")

    try:
        # Initialize database
        await init_db()

        # Create sample data
        await create_sample_user()
        await create_sample_resources()
        await create_sample_metrics()
        await create_sample_concepts()
        await create_sample_learning_path()

        print("\n✅ Database initialization completed successfully!")

    except Exception as e:
        print(f"\n❌ Error during database initialization: {str(e)}")

    finally:
        # Close the MongoDB connection
        client.close()

if __name__ == "__main__":
    asyncio.run(main())