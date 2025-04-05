"""
AI/ML resources for the learning platform.

This module contains curated AI/ML learning resources organized by type.
Resources are stored in Python dictionaries that can be easily imported
into the database initialization script.
"""

from datetime import datetime

# ADD ADDITIONAL LLM LEARNING RESOURCE

# AI/ML courses
COURSES = [
    {
        "id": "course-math-ml",
        "title": "Mathematics for Machine Learning",
        "url": "https://www.coursera.org/specializations/mathematics-machine-learning",
        "topics": ["mathematics", "machine learning", "foundations"],
        "difficulty": "intermediate",
        "estimated_time": 120,
        "notes": "Coursera course by Imperial College London",
        "type": "course"
    },
    {
        "id": "course-dl-spec",
        "title": "Deep Learning Specialization",
        "url": "https://www.coursera.org/specializations/deep-learning",
        "topics": ["deep learning", "neural networks", "ai"],
        "difficulty": "intermediate",
        "estimated_time": 180,
        "notes": "Coursera specialization by Andrew Ng",
        "type": "course"
    },
    {
        "id": "course-fastai-dl",
        "title": "Practical Deep Learning for Coders",
        "url": "https://course.fast.ai/",
        "topics": ["deep learning", "coding", "practical"],
        "difficulty": "intermediate",
        "estimated_time": 160,
        "notes": "Fast.ai course by Jeremy Howard",
        "type": "course"
    },
    {
        "id": "course-ng-ml",
        "title": "Machine Learning",
        "url": "https://www.coursera.org/learn/machine-learning",
        "topics": ["machine learning", "ai", "foundations"],
        "difficulty": "beginner",
        "estimated_time": 120,
        "notes": "Classic Coursera course by Andrew Ng from Stanford",
        "type": "course"
    },
    {
        "id": "course-mit-dl-intro",
        "title": "MIT OpenCourseWare: Introduction to Deep Learning",
        "url": "http://introtodeeplearning.com/",
        "topics": ["deep learning", "introduction", "MIT", "course"], # Added topic
        "difficulty": "intermediate",
        "estimated_time": 100,
        "notes": "Comprehensive deep learning course by MIT",
        "type": "course"
    }
]

# AI/ML books
BOOKS = [
    {
        "id": "book-dl-goodfellow",
        "title": "Deep Learning",
        "url": "https://www.deeplearningbook.org/",
        "topics": ["deep learning", "theory", "foundations"],
        "difficulty": "advanced",
        "estimated_time": 600,
        "notes": "By Ian Goodfellow, Yoshua Bengio, and Aaron Courville",
        "type": "book"
    },
    {
        "id": "book-ml-yearning",
        "title": "Machine Learning Yearning",
        "url": "https://www.deeplearning.ai/machine-learning-yearning/",
        "topics": ["machine learning", "best practices", "project management"],
        "difficulty": "intermediate",
        "estimated_time": 240,
        "notes": "By Andrew Ng",
        "type": "book"
    },
    {
        "id": "book-nielsen-nn",
        "title": "Neural Networks and Deep Learning",
        "url": "http://neuralnetworksanddeeplearning.com/",
        "topics": ["neural networks", "deep learning", "foundations"],
        "difficulty": "intermediate",
        "estimated_time": 200,
        "notes": "By Michael Nielsen",
        "type": "book"
    },
    {
        "id": "book-d2l",
        "title": "Dive into Deep Learning",
        "url": "https://d2l.ai/",
        "topics": ["deep learning", "pytorch", "tensorflow", "practical"],
        "difficulty": "intermediate",
        "estimated_time": 300,
        "notes": "Interactive deep learning book with code examples",
        "type": "book"
    }
]

# AI/ML articles
ARTICLES = [
    {
        "id": "article-ml-swe-guide",
        "title": "ML for Software Engineers - GitHub Guide",
        "url": "https://github.com/ZuzooVn/machine-learning-for-software-engineers",
        "topics": ["machine learning", "software engineering", "guide"],
        "difficulty": "beginner",
        "estimated_time": 60,
        "notes": "Comprehensive GitHub guide for software engineers transitioning to ML",
        "type": "article"
    },
    {
        "id": "article-se-ml-practices",
        "title": "Software Engineering for Machine Learning",
        "url": "https://se-ml.github.io/practices/",
        "topics": ["software engineering", "machine learning", "best practices"],
        "difficulty": "intermediate",
        "estimated_time": 45,
        "notes": "Best practices guide for ML engineering",
        "type": "article"
    },
    {
        "id": "article-ml-from-scratch",
        "title": "ML From Scratch",
        "url": "https://github.com/eriklindernoren/ML-From-Scratch",
        "topics": ["machine learning", "algorithms", "implementation"],
        "difficulty": "intermediate",
        "estimated_time": 90,
        "notes": "Implementations of ML algorithms from scratch",
        "type": "article"
    },
    {
        "id": "article-distill-momentum",
        "title": "Distill: Why Momentum Really Works",
        "url": "https://distill.pub/2017/momentum/",
        "topics": ["deep learning", "optimization", "visualization"],
        "difficulty": "intermediate",
        "estimated_time": 30,
        "notes": "Beautiful visual explanation of momentum in optimization",
        "type": "article"
    }
]

# AI/ML videos
VIDEOS = [
    {
        "id": "video-mit-dl-intro",
        "title": "MIT OpenCourseWare: Introduction to Deep Learning Videos",
        "url": "http://introtodeeplearning.com/", # Note: Same URL as course-mit-dl-intro
        "topics": ["deep learning", "introduction", "MIT", "video"], # Added topic
        "difficulty": "beginner",
        "estimated_time": 180,
        "notes": "Video lectures from MIT's course on deep learning",
        "type": "video"
    },
    {
        "id": "video-silver-rl",
        "title": "RL Course by David Silver",
        "url": "https://www.youtube.com/playlist?list=PLqYmG7hTraZDM-OYHWgPebj2MfCFzFObQ",
        "topics": ["reinforcement learning", "DeepMind", "advanced"],
        "difficulty": "advanced",
        "estimated_time": 240,
        "notes": "DeepMind's reinforcement learning course by David Silver",
        "type": "video"
    },
    {
        "id": "video-stanford-cs231n",
        "title": "Stanford CS231n: CNNs for Visual Recognition",
        "url": "http://cs231n.stanford.edu/",
        "topics": ["computer vision", "CNN", "deep learning", "stanford", "course", "video"], # Added topic
        "difficulty": "advanced",
        "estimated_time": 200,
        "notes": "Stanford's renowned computer vision course",
        "type": "video"
    },
    {
        "id": "video-stanford-cs224n",
        "title": "Stanford CS224N: NLP with Deep Learning",
        "url": "https://web.stanford.edu/class/cs224n/",
        "topics": ["NLP", "deep learning", "transformers", "stanford", "course", "video"], # Added topic
        "difficulty": "advanced",
        "estimated_time": 220,
        "notes": "Stanford's comprehensive NLP course",
        "type": "video"
    }
]

# AI/ML Platforms and Guides
PLATFORMS_GUIDES = [
    {
        "id": "pg-learnpython",
        "title": "LearnPython.org - Interactive Tutorial",
        "url": "https://www.learnpython.org/",
        "topics": ["python", "interactive", "tutorial", "beginner"],
        "difficulty": "beginner",
        "estimated_time": 40, # Estimated time for core concepts
        "notes": "Free interactive Python tutorial covering basics to advanced.",
        "type": "platform"
    },
    {
        "id": "pg-codecademy-py",
        "title": "Codecademy Python Catalog",
        "url": "https://www.codecademy.com/catalog/language/python",
        "topics": ["python", "interactive", "courses", "data science", "OOP"],
        "difficulty": "beginner",
        "estimated_time": 100, # Estimated time for free introductory content
        "notes": "Offers various free introductory Python modules and courses.",
        "type": "platform"
    },
    {
        "id": "pg-futurecoder",
        "title": "futurecoder - Interactive Python",
        "url": "https://futurecoder.io/",
        "topics": ["python", "interactive", "tutorial", "beginner"],
        "difficulty": "beginner",
        "estimated_time": 30, # Estimated time for basics
        "notes": "Free, open-source platform for learning Python from scratch.",
        "type": "platform"
    },
    {
        "id": "pg-python-docs",
        "title": "Python Official Documentation",
        "url": "https://www.python.org/doc/",
        "topics": ["python", "documentation", "reference"],
        "difficulty": "beginner",
        "estimated_time": 0, # Reference material
        "notes": "The official Python documentation.",
        "type": "platform"
    },
    {
        "id": "pg-python-tutorial",
        "title": "Python Official Tutorial",
        "url": "https://docs.python.org/3/tutorial/index.html",
        "topics": ["python", "tutorial", "beginner", "documentation"],
        "difficulty": "beginner",
        "estimated_time": 20,
        "notes": "The official Python tutorial for beginners.",
        "type": "platform"
    },
    {
        "id": "pg-pandas-docs",
        "title": "Pandas User Guide",
        "url": "https://pandas.pydata.org/docs/user_guide/index.html",
        "topics": ["pandas", "documentation", "data analysis", "python"],
        "difficulty": "intermediate",
        "estimated_time": 0, # Reference material
        "notes": "Official Pandas user guide.",
        "type": "platform"
    },
    {
        "id": "pg-pandas-cheatsheet",
        "title": "Pandas Cheat Sheet (nbviewer)",
        "url": "https://nbviewer.org/github/pybokeh/jupyter_notebooks/blob/main/pandas/PandasCheatSheet.ipynb",
        "topics": ["pandas", "cheat sheet", "data analysis", "python"],
        "difficulty": "intermediate",
        "estimated_time": 5, # Time to review/use as reference
        "notes": "Detailed Jupyter Notebook covering common Pandas tasks.",
        "type": "platform"
    },
    {
        "id": "pg-sklearn-docs",
        "title": "Scikit-learn User Guide",
        "url": "https://scikit-learn.org/stable/user_guide.html",
        "topics": ["scikit-learn", "machine learning", "documentation", "python"],
        "difficulty": "intermediate",
        "estimated_time": 0, # Reference material
        "notes": "Official Scikit-learn user guide.",
        "type": "platform"
    },
    {
        "id": "pg-tf-tutorials",
        "title": "TensorFlow Tutorials",
        "url": "https://www.tensorflow.org/tutorials",
        "topics": ["tensorflow", "deep learning", "tutorial", "python"],
        "difficulty": "intermediate",
        "estimated_time": 50, # Estimate for core tutorials
        "notes": "Official TensorFlow tutorials.",
        "type": "platform"
    },
    {
        "id": "pg-pytorch-tutorials",
        "title": "PyTorch Tutorials",
        "url": "https://pytorch.org/tutorials/",
        "topics": ["pytorch", "deep learning", "tutorial", "python"],
        "difficulty": "intermediate",
        "estimated_time": 50, # Estimate for core tutorials
        "notes": "Official PyTorch tutorials.",
        "type": "platform"
    },
    {
        "id": "pg-hackernoon-rl",
        "title": "HackerNoon RL Course (Part 1)",
        "url": "https://hackernoon.com/reinforcement-learning-course-part-1",
        "topics": ["reinforcement learning", "tutorial", "beginner", "python"],
        "difficulty": "beginner",
        "estimated_time": 2, # Estimated read/understand time
        "notes": "Beginner-friendly introduction to RL concepts with Python examples.",
        "type": "platform"
    },
    {
        "id": "pg-dlaip-nlp-guide",
        "title": "DeepLearning.AI NLP Guide",
        "url": "https://www.deeplearning.ai/resources/natural-language-processing/",
        "topics": ["NLP", "guide", "introduction", "deep learning"],
        "difficulty": "intermediate",
        "estimated_time": 3, # Estimated read/understand time
        "notes": "Comprehensive guide covering NLP concepts, techniques, and tools.",
        "type": "platform"
    },
    {
        "id": "pg-khan-lin-alg",
        "title": "Khan Academy: Linear Algebra",
        "url": "https://www.khanacademy.org/math/linear-algebra",
        "topics": ["mathematics", "linear algebra", "foundations"],
        "difficulty": "beginner",
        "estimated_time": 60, # Estimated time for core ML-relevant concepts
        "notes": "Covers vectors, matrices, transformations relevant to ML.",
        "type": "platform"
    },
    {
        "id": "pg-khan-multi-calc",
        "title": "Khan Academy: Multivariable Calculus",
        "url": "https://www.khanacademy.org/math/multivariable-calculus",
        "topics": ["mathematics", "calculus", "foundations", "optimization"],
        "difficulty": "intermediate",
        "estimated_time": 80, # Estimated time for core ML-relevant concepts
        "notes": "Covers derivatives, gradients needed for optimization.",
        "type": "platform"
    },
    {
        "id": "pg-khan-stats-prob",
        "title": "Khan Academy: Statistics and Probability",
        "url": "https://www.khanacademy.org/math/statistics-probability",
        "topics": ["mathematics", "statistics", "probability", "foundations"],
        "difficulty": "beginner",
        "estimated_time": 70, # Estimated time for core ML-relevant concepts
        "notes": "Covers probability, distributions, regression basics for ML.",
        "type": "platform"
    },
    {
        "id": "pg-mlops-guide",
        "title": "MLOps Guide (ml-ops.org)",
        "url": "https://ml-ops.org/content/ MLOps", # Note: Space might be typo, check later
        "topics": ["mlops", "guide", "principles", "architecture"],
        "difficulty": "intermediate",
        "estimated_time": 10, # Estimated read/understand time
        "notes": "Community-driven guide covering MLOps principles and practices.",
        "type": "platform"
    },
    {
        "id": "pg-awesome-mlops",
        "title": "Awesome MLOps (GitHub List)",
        "url": "https://github.com/visenger/awesome-mlops",
        "topics": ["mlops", "resources", "tools", "community"],
        "difficulty": "intermediate",
        "estimated_time": 2, # Time to browse
        "notes": "Curated list of MLOps resources, tools, articles, etc.",
        "type": "platform"
    },
    {
        "id": "pg-gcp-mlops-guide", # Added this resource
        "title": "Google Cloud MLOps Guide",
        "url": "https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning",
        "topics": ["mlops", "gcp", "ci/cd", "deployment", "guide"],
        "difficulty": "intermediate",
        "estimated_time": 5, # Estimated read time
        "notes": "Detailed guide on MLOps pipelines on Google Cloud.",
        "type": "platform"
    },
    {
        "id": "pg-opencv-tutorials",
        "title": "OpenCV Tutorials",
        "url": "https://docs.opencv.org/4.x/d6/d00/tutorial_table_of_content_core.html",
        "topics": ["computer vision", "opencv", "tutorial", "image processing"],
        "difficulty": "intermediate",
        "estimated_time": 100, # Estimated time for core tutorials
        "notes": "Official tutorials for the fundamental CV library, OpenCV.",
        "type": "platform"
    },
    {
        "id": "pg-pyimagesearch",
        "title": "PyImageSearch Tutorials",
        "url": "https://pyimagesearch.com/start-here/",
        "topics": ["computer vision", "python", "opencv", "deep learning", "projects"],
        "difficulty": "intermediate",
        "estimated_time": 150, # Estimated time for several introductory tutorials
        "notes": "Large collection of free, practical CV tutorials and projects.",
        "type": "platform"
    },
    {
        "id": "pg-github-ml-topics",
        "title": "GitHub Machine Learning Topic",
        "url": "https://github.com/topics/machine-learning",
        "topics": ["github", "machine learning", "projects", "community"],
        "difficulty": "intermediate",
        "estimated_time": 0, # Exploration
        "notes": "Explore open-source ML projects on GitHub.",
        "type": "platform"
    },
    {
        "id": "pg-kaggle-competitions",
        "title": "Kaggle Competitions",
        "url": "https://www.kaggle.com/competitions",
        "topics": ["kaggle", "competitions", "machine learning", "practice"],
        "difficulty": "intermediate",
        "estimated_time": 0, # Variable
        "notes": "Platform for data science competitions.",
        "type": "platform"
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

    # Combine all resource lists
    all_resources_typed = {
        "courses": COURSES,
        "books": BOOKS,
        "articles": ARTICLES,
        "videos": VIDEOS,
        "platforms_guides": PLATFORMS_GUIDES
    }

    formatted_resources = {
        "courses": [],
        "books": [],
        "articles": [],
        "videos": [],
        "platforms_guides": []
    }

    # Format resources, adding common fields
    for resource_type, resource_list in all_resources_typed.items():
        for resource in resource_list:
            # Copy existing resource data and add standard fields
            formatted_resource = resource.copy() # Use copy to avoid modifying constants
            formatted_resource["completed"] = False
            formatted_resource["date_added"] = current_date
            formatted_resource["completion_date"] = None
            # Ensure estimated_time exists, default to 0 if not
            formatted_resource["estimated_time"] = resource.get("estimated_time", 0)
            formatted_resources[resource_type].append(formatted_resource)

    return formatted_resources