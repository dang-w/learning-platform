"""
AI/ML resources for the learning platform.

This module contains curated AI/ML learning resources organized by type.
Resources are stored in Python dictionaries that can be easily imported
into the database initialization script.
"""

from datetime import datetime

def generate_id(suffix):
    """Generate a unique ID for a resource based on timestamp + suffix"""
    return str(datetime.now().timestamp())[:10] + str(suffix)

# AI/ML courses
COURSES = [
    {
        "title": "Mathematics for Machine Learning",
        "url": "https://www.coursera.org/specializations/mathematics-machine-learning",
        "topics": ["mathematics", "machine learning", "foundations"],
        "difficulty": "intermediate",
        "estimated_time": 120,
        "notes": "Coursera course by Imperial College London"
    },
    {
        "title": "Deep Learning Specialization",
        "url": "https://www.coursera.org/specializations/deep-learning",
        "topics": ["deep learning", "neural networks", "ai"],
        "difficulty": "intermediate",
        "estimated_time": 180,
        "notes": "Coursera specialization by Andrew Ng"
    },
    {
        "title": "Practical Deep Learning for Coders",
        "url": "https://course.fast.ai/",
        "topics": ["deep learning", "coding", "practical"],
        "difficulty": "intermediate",
        "estimated_time": 160,
        "notes": "Fast.ai course by Jeremy Howard"
    },
    {
        "title": "Machine Learning",
        "url": "https://www.coursera.org/learn/machine-learning",
        "topics": ["machine learning", "ai", "foundations"],
        "difficulty": "beginner",
        "estimated_time": 120,
        "notes": "Classic Coursera course by Andrew Ng from Stanford"
    },
    {
        "title": "MIT OpenCourseWare: Introduction to Deep Learning",
        "url": "http://introtodeeplearning.com/",
        "topics": ["deep learning", "introduction", "MIT"],
        "difficulty": "intermediate",
        "estimated_time": 100,
        "notes": "Comprehensive deep learning course by MIT"
    }
]

# AI/ML books
BOOKS = [
    {
        "title": "Deep Learning",
        "url": "https://www.deeplearningbook.org/",
        "topics": ["deep learning", "theory", "foundations"],
        "difficulty": "advanced",
        "estimated_time": 600,
        "notes": "By Ian Goodfellow, Yoshua Bengio, and Aaron Courville"
    },
    {
        "title": "Machine Learning Yearning",
        "url": "https://www.deeplearning.ai/machine-learning-yearning/",
        "topics": ["machine learning", "best practices", "project management"],
        "difficulty": "intermediate",
        "estimated_time": 240,
        "notes": "By Andrew Ng"
    },
    {
        "title": "Neural Networks and Deep Learning",
        "url": "http://neuralnetworksanddeeplearning.com/",
        "topics": ["neural networks", "deep learning", "foundations"],
        "difficulty": "intermediate",
        "estimated_time": 200,
        "notes": "By Michael Nielsen"
    },
    {
        "title": "Dive into Deep Learning",
        "url": "https://d2l.ai/",
        "topics": ["deep learning", "pytorch", "tensorflow", "practical"],
        "difficulty": "intermediate",
        "estimated_time": 300,
        "notes": "Interactive deep learning book with code examples"
    }
]

# AI/ML articles
ARTICLES = [
    {
        "title": "ML for Software Engineers - GitHub Guide",
        "url": "https://github.com/ZuzooVn/machine-learning-for-software-engineers",
        "topics": ["machine learning", "software engineering", "guide"],
        "difficulty": "beginner",
        "estimated_time": 60,
        "notes": "Comprehensive GitHub guide for software engineers transitioning to ML"
    },
    {
        "title": "Software Engineering for Machine Learning",
        "url": "https://se-ml.github.io/practices/",
        "topics": ["software engineering", "machine learning", "best practices"],
        "difficulty": "intermediate",
        "estimated_time": 45,
        "notes": "Best practices guide for ML engineering"
    },
    {
        "title": "ML From Scratch",
        "url": "https://github.com/eriklindernoren/ML-From-Scratch",
        "topics": ["machine learning", "algorithms", "implementation"],
        "difficulty": "intermediate",
        "estimated_time": 90,
        "notes": "Implementations of ML algorithms from scratch"
    },
    {
        "title": "Distill: Why Momentum Really Works",
        "url": "https://distill.pub/2017/momentum/",
        "topics": ["deep learning", "optimization", "visualization"],
        "difficulty": "intermediate",
        "estimated_time": 30,
        "notes": "Beautiful visual explanation of momentum in optimization"
    }
]

# AI/ML videos
VIDEOS = [
    {
        "title": "MIT OpenCourseWare: Introduction to Deep Learning Videos",
        "url": "http://introtodeeplearning.com/",
        "topics": ["deep learning", "introduction", "MIT"],
        "difficulty": "beginner",
        "estimated_time": 180,
        "notes": "Video lectures from MIT's course on deep learning"
    },
    {
        "title": "RL Course by David Silver",
        "url": "https://www.youtube.com/playlist?list=PLqYmG7hTraZDM-OYHWgPebj2MfCFzFObQ",
        "topics": ["reinforcement learning", "DeepMind", "advanced"],
        "difficulty": "advanced",
        "estimated_time": 240,
        "notes": "DeepMind's reinforcement learning course by David Silver"
    },
    {
        "title": "Stanford CS231n: CNNs for Visual Recognition",
        "url": "http://cs231n.stanford.edu/",
        "topics": ["computer vision", "CNN", "deep learning"],
        "difficulty": "advanced",
        "estimated_time": 200,
        "notes": "Stanford's renowned computer vision course"
    },
    {
        "title": "Stanford CS224N: NLP with Deep Learning",
        "url": "https://web.stanford.edu/class/cs224n/",
        "topics": ["NLP", "deep learning", "transformers"],
        "difficulty": "advanced",
        "estimated_time": 220,
        "notes": "Stanford's comprehensive NLP course"
    }
]

# Create formatted resources with standardized fields
def get_formatted_resources():
    """
    Format all resources with consistent fields and generated IDs

    Returns:
        dict: Dictionary containing all resources with proper formatting
    """
    current_date = datetime.now().strftime("%Y-%m-%d")

    # Generate resources with consistent formatting
    formatted_resources = {
        "courses": [],
        "books": [],
        "articles": [],
        "videos": []
    }

    # Format courses
    for idx, course in enumerate(COURSES):
        formatted_resources["courses"].append({
            "id": generate_id(f"c{idx+1}"),
            "title": course["title"],
            "url": course["url"],
            "topics": course["topics"],
            "difficulty": course["difficulty"],
            "estimated_time": course["estimated_time"],
            "completed": False,
            "date_added": current_date,
            "completion_date": None,
            "notes": course["notes"]
        })

    # Format books
    for idx, book in enumerate(BOOKS):
        formatted_resources["books"].append({
            "id": generate_id(f"b{idx+1}"),
            "title": book["title"],
            "url": book["url"],
            "topics": book["topics"],
            "difficulty": book["difficulty"],
            "estimated_time": book["estimated_time"],
            "completed": False,
            "date_added": current_date,
            "completion_date": None,
            "notes": book["notes"]
        })

    # Format articles
    for idx, article in enumerate(ARTICLES):
        formatted_resources["articles"].append({
            "id": generate_id(f"a{idx+1}"),
            "title": article["title"],
            "url": article["url"],
            "topics": article["topics"],
            "difficulty": article["difficulty"],
            "estimated_time": article["estimated_time"],
            "completed": False,
            "date_added": current_date,
            "completion_date": None,
            "notes": article["notes"]
        })

    # Format videos
    for idx, video in enumerate(VIDEOS):
        formatted_resources["videos"].append({
            "id": generate_id(f"v{idx+1}"),
            "title": video["title"],
            "url": video["url"],
            "topics": video["topics"],
            "difficulty": video["difficulty"],
            "estimated_time": video["estimated_time"],
            "completed": False,
            "date_added": current_date,
            "completion_date": None,
            "notes": video["notes"]
        })

    return formatted_resources