"""
Learning paths for the learning platform.

This module contains predefined learning paths organized by career goal.
Each path includes milestones, goals, and a roadmap structure.
"""

from datetime import datetime, timedelta

# Career Paths
CAREER_PATHS = {
    "ml_engineer": {
        "title": "Machine Learning Engineer",
        "description": "A comprehensive path to become a machine learning engineer, focusing on practical ML implementation skills."
    },
    "data_scientist": {
        "title": "Data Scientist",
        "description": "A path focused on data analysis, visualization, and machine learning for extracting insights from data."
    },
    "ai_researcher": {
        "title": "AI Researcher",
        "description": "A path focused on the theoretical foundations of AI and cutting-edge research topics."
    },
    "ml_ops_engineer": {
        "title": "MLOps Engineer",
        "description": "A path focused on deploying, scaling, and maintaining machine learning systems in production."
    }
}

# Standard milestones for machine learning engineer path
ML_ENGINEER_MILESTONES = [
    {
        "title": "Learn Python Fundamentals",
        "description": "Master Python programming language basics including syntax, data structures, and object-oriented programming.",
        "verification_method": "Complete a Python project with classes, functions, and proper error handling",
        "resources": [
            "pg-python-docs",
            "pg-python-tutorial",
            "pg-learnpython",
            "pg-codecademy-py",
            "pg-futurecoder"
        ],
        "estimated_days": 14
    },
    {
        "title": "Master Data Processing with Pandas",
        "description": "Learn to efficiently manipulate and analyze data using Pandas library",
        "verification_method": "Clean and analyze a real-world dataset with Pandas",
        "resources": [
            "pg-pandas-docs",
            "pg-pandas-cheatsheet"
        ],
        "estimated_days": 14
    },
    {
        "title": "Learn Machine Learning Fundamentals",
        "description": "Understand core ML concepts including supervised/unsupervised learning, feature engineering, and model evaluation",
        "verification_method": "Implement basic ML algorithms and explain how they work",
        "resources": [
            "course-ng-ml",
            "book-ml-yearning"
        ],
        "estimated_days": 30
    },
    {
        "title": "Master Scikit-learn",
        "description": "Become proficient with the most popular ML library for Python",
        "verification_method": "Build and evaluate multiple ML models using scikit-learn",
        "resources": ["pg-sklearn-docs"],
        "estimated_days": 21
    },
    {
        "title": "Learn Deep Learning Fundamentals",
        "description": "Understand neural networks, backpropagation, and deep learning architectures",
        "verification_method": "Implement a neural network from scratch",
        "resources": [
            "book-dl-goodfellow",
            "book-nielsen-nn",
            "course-mit-dl-intro", # This links to the course page which has videos too
            # "video-mit-dl-intro" # Redundant with course link
        ],
        "estimated_days": 30
    },
    {
        "title": "Master TensorFlow or PyTorch",
        "description": "Become proficient with a deep learning framework",
        "verification_method": "Build and train a complex neural network",
        "resources": [
            "pg-tf-tutorials",
            "pg-pytorch-tutorials",
            "book-d2l"
        ],
        "estimated_days": 30
    }
]

# Standard goals for machine learning engineer path
ML_ENGINEER_GOALS = [
    {
        "title": "Build an End-to-End ML Project",
        "description": "Create a complete machine learning project from data collection to deployment",
        "priority": 1,
        "category": "project",
        "estimated_days": 45
        # No specific external resources linked here, maybe internal project guides later
    },
    {
        "title": "Participate in a Kaggle Competition",
        "description": "Apply ML skills in a competitive environment to solve real problems",
        "priority": 2,
        "category": "practice",
        "estimated_days": 30,
        "resources": ["pg-kaggle-competitions"]
    },
    {
        "title": "Learn MLOps Fundamentals",
        "description": "Understand how to deploy, monitor, and maintain ML models in production",
        "priority": 2,
        "category": "technical",
        "estimated_days": 30,
        "resources": [
            "pg-gcp-mlops-guide",
            "pg-mlops-guide",
            "pg-awesome-mlops"
        ]
    },
    {
        "title": "Contribute to an Open Source ML Project",
        "description": "Make meaningful contributions to an open source ML library or tool",
        "priority": 3,
        "category": "community",
        "estimated_days": 60,
        "resources": ["pg-github-ml-topics"]
    },
    {
        "title": "Explore NLP Basics",
        "description": "Learn the fundamentals of Natural Language Processing.",
        "priority": 3,
        "category": "specialization",
        "estimated_days": 20,
        "resources": [
            "video-stanford-cs224n",
            "pg-dlaip-nlp-guide"
        ]
    },
    {
        "title": "Explore Computer Vision Basics",
        "description": "Learn the fundamentals of Computer Vision.",
        "priority": 3,
        "category": "specialization",
        "estimated_days": 20,
        "resources": [
            "video-stanford-cs231n",
            "pg-opencv-tutorials",
            "pg-pyimagesearch"
        ]
    },
    {
        "title": "Explore Reinforcement Learning Basics",
        "description": "Learn the fundamentals of Reinforcement Learning.",
        "priority": 3,
        "category": "specialization",
        "estimated_days": 20,
        "resources": [
            "video-silver-rl",
            "pg-hackernoon-rl"
        ]
    }
]

# ML Engineer roadmap phases
ML_ENGINEER_ROADMAP = [
    {
        "title": "Phase 1: Programming Fundamentals",
        "description": "Master the programming skills required for machine learning",
        "resources": [
            "pg-python-docs",
            "pg-python-tutorial",
            "pg-learnpython",
            "pg-pandas-docs",
            "pg-pandas-cheatsheet"
        ]
    },
    {
        "title": "Phase 2: Mathematics and Statistics",
        "description": "Learn the mathematical foundations of machine learning",
        "resources": [
            "course-math-ml",
            "pg-khan-lin-alg",
            "pg-khan-multi-calc",
            "pg-khan-stats-prob"
        ]
    },
    {
        "title": "Phase 3: Machine Learning",
        "description": "Master core machine learning algorithms and techniques",
        "resources": [
            "course-ng-ml",
            "pg-sklearn-docs",
            "book-ml-yearning"
        ]
    },
    {
        "title": "Phase 4: Deep Learning",
        "description": "Learn deep learning frameworks and neural network architectures",
        "resources": [
            "book-dl-goodfellow",
            "pg-tf-tutorials",
            "pg-pytorch-tutorials",
            "book-d2l",
            "course-mit-dl-intro" # Course page includes videos
        ]
    },
    {
        "title": "Phase 5: Specialization and Projects",
        "description": "Focus on specific areas like NLP, CV, or RL and build a portfolio",
        "resources": [
            "pg-kaggle-competitions",
            "pg-github-ml-topics",
            "video-stanford-cs224n", # NLP
            "pg-dlaip-nlp-guide", # NLP
            "video-stanford-cs231n", # CV
            "pg-opencv-tutorials", # CV
            "pg-pyimagesearch", # CV
            "video-silver-rl" # RL
        ]
    },
    {
        "title": "Phase 6: MLOps and Deployment",
        "description": "Learn to deploy and maintain ML models in production",
        "resources": [
            "pg-gcp-mlops-guide",
            "pg-mlops-guide",
            "pg-awesome-mlops"
        ]
    }
]

def get_formatted_learning_path(career_path="ml_engineer"):
    """
    Format a learning path with milestones, goals, and roadmap

    Args:
        career_path (str): The career path to generate (default: ml_engineer)

    Returns:
        dict: Dictionary containing the formatted learning path
    """
    today = datetime.now()

    if career_path not in CAREER_PATHS:
        career_path = "ml_engineer"  # Default to ML Engineer if path not found

    # Select the appropriate milestones, goals, and roadmap based on career path
    if career_path == "ml_engineer":
        milestones = ML_ENGINEER_MILESTONES
        goals = ML_ENGINEER_GOALS
        roadmap_phases = ML_ENGINEER_ROADMAP
    else:
        # For now, use ML Engineer for all paths
        # In a future update, we can add specialized paths for other careers
        milestones = ML_ENGINEER_MILESTONES
        goals = ML_ENGINEER_GOALS
        roadmap_phases = ML_ENGINEER_ROADMAP

    # Format milestones
    formatted_milestones = []
    for idx, milestone in enumerate(milestones):
        target_date = today + timedelta(days=milestone["estimated_days"])
        formatted_milestones.append({
            "id": str(idx + 1),
            "title": milestone["title"],
            "description": milestone["description"],
            "target_date": target_date.strftime("%Y-%m-%d"),
            "verification_method": milestone["verification_method"],
            "resources": milestone["resources"],
            "completed": False,
            "completion_date": None,
            "notes": ""
        })

    # Format goals
    formatted_goals = []
    for idx, goal in enumerate(goals):
        target_date = today + timedelta(days=goal["estimated_days"])
        formatted_goals.append({
            "id": str(idx + 1),
            "title": goal["title"],
            "description": goal["description"],
            "target_date": target_date.strftime("%Y-%m-%d"),
            "priority": goal["priority"],
            "category": goal["category"],
            "completed": False,
            "completion_date": None,
            "notes": ""
        })

    # Format roadmap
    formatted_roadmap = {
        "id": "1",
        "title": f"{CAREER_PATHS[career_path]['title']} Roadmap",
        "description": CAREER_PATHS[career_path]['description'],
        "phases": roadmap_phases,
        "created_at": today.strftime("%Y-%m-%d"),
        "updated_at": today.strftime("%Y-%m-%d")
    }

    # Combine everything into a learning path
    learning_path = {
        "milestones": formatted_milestones,
        "goals": formatted_goals,
        "roadmap": formatted_roadmap
    }

    return learning_path