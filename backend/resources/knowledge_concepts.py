"""
Knowledge concepts for the learning platform.

This module contains predefined knowledge concepts organized by domain
for the spaced repetition system in the learning platform.
"""

from datetime import datetime

# Machine Learning Concepts
ML_CONCEPTS = [
    {
        "title": "Supervised Learning",
        "content": "Supervised learning is a type of machine learning where the model is trained on labeled data. The model learns to predict outputs based on input features. Examples include classification and regression.",
        "topics": ["machine learning", "supervised learning"]
    },
    {
        "title": "Unsupervised Learning",
        "content": "Unsupervised learning is a type of machine learning where the model is trained on unlabeled data. The model learns to find patterns or structure in the data. Examples include clustering and dimensionality reduction.",
        "topics": ["machine learning", "unsupervised learning"]
    },
    {
        "title": "Reinforcement Learning",
        "content": "Reinforcement learning is a type of machine learning where an agent learns to make decisions by taking actions in an environment to maximize some notion of cumulative reward. It learns through trial and error.",
        "topics": ["machine learning", "reinforcement learning"]
    },
    {
        "title": "Bias-Variance Tradeoff",
        "content": "The bias-variance tradeoff is a central problem in supervised learning. High bias can cause underfitting, while high variance can cause overfitting. Finding the right balance is key to creating good models.",
        "topics": ["machine learning", "model evaluation"]
    },
    {
        "title": "Feature Engineering",
        "content": "Feature engineering is the process of transforming raw data into features that better represent the underlying problem, resulting in improved model accuracy. It includes feature creation, selection, and transformation.",
        "topics": ["machine learning", "data preprocessing"]
    }
]

# Deep Learning Concepts
DL_CONCEPTS = [
    {
        "title": "Neural Networks",
        "content": "Neural networks are computing systems inspired by the biological neural networks in animal brains. They consist of artificial neurons organized in layers that can learn complex patterns from data.",
        "topics": ["deep learning", "neural networks"]
    },
    {
        "title": "Backpropagation",
        "content": "Backpropagation is an algorithm used to train neural networks by adjusting weights based on the error rate. It calculates the gradient of the loss function with respect to each weight by the chain rule.",
        "topics": ["deep learning", "neural networks", "algorithms"]
    },
    {
        "title": "Convolutional Neural Networks",
        "content": "Convolutional Neural Networks (CNNs) are specialized neural networks designed for processing structured grid data like images. They use convolutional layers to automatically learn spatial hierarchies of features.",
        "topics": ["deep learning", "computer vision", "neural networks"]
    },
    {
        "title": "Recurrent Neural Networks",
        "content": "Recurrent Neural Networks (RNNs) are neural networks designed for sequential data by maintaining a state that captures information from previous inputs. They have connections that form directed cycles.",
        "topics": ["deep learning", "natural language processing", "neural networks"]
    },
    {
        "title": "Transformers",
        "content": "Transformers are a type of neural network architecture based on self-attention mechanisms. They process sequential data without using recurrence, enabling more parallelization and better handling of long-range dependencies.",
        "topics": ["deep learning", "natural language processing", "neural networks"]
    }
]

# Mathematics for ML Concepts
MATH_CONCEPTS = [
    {
        "title": "Linear Algebra",
        "content": "Linear algebra is the branch of mathematics that deals with vector spaces and linear mappings between them. It's fundamental to machine learning for representing and transforming data.",
        "topics": ["mathematics", "linear algebra"]
    },
    {
        "title": "Probability Theory",
        "content": "Probability theory is the branch of mathematics that deals with uncertainty. It provides the theoretical foundation for many machine learning algorithms, especially in Bayesian methods.",
        "topics": ["mathematics", "probability"]
    },
    {
        "title": "Calculus",
        "content": "Calculus is essential for understanding the optimization methods used in machine learning. Derivatives are used to find the direction of steepest ascent/descent in gradient-based algorithms.",
        "topics": ["mathematics", "calculus"]
    },
    {
        "title": "Information Theory",
        "content": "Information theory deals with the quantification of information. Concepts like entropy and mutual information are used in decision trees, feature selection, and many other ML algorithms.",
        "topics": ["mathematics", "information theory"]
    }
]

# Data Science Concepts
DS_CONCEPTS = [
    {
        "title": "Exploratory Data Analysis",
        "content": "Exploratory Data Analysis (EDA) is an approach to analyzing datasets to summarize their main characteristics, often with visual methods. It helps identify patterns, outliers, and relationships in data.",
        "topics": ["data science", "data analysis"]
    },
    {
        "title": "Data Cleaning",
        "content": "Data cleaning is the process of detecting and correcting or removing corrupt, inaccurate, or irrelevant records from a dataset. It's typically the most time-consuming part of the data science workflow.",
        "topics": ["data science", "data preprocessing"]
    },
    {
        "title": "Feature Selection",
        "content": "Feature selection is the process of selecting a subset of relevant features for use in model construction. It helps simplify models, reduce training times, and improve generalization.",
        "topics": ["data science", "feature engineering"]
    },
    {
        "title": "Cross-Validation",
        "content": "Cross-validation is a resampling procedure used to evaluate machine learning models on a limited data sample. It helps assess how the model will generalize to an independent dataset.",
        "topics": ["data science", "model evaluation"]
    }
]

def get_formatted_concepts():
    """
    Format concepts with consistent fields for the knowledge base

    Returns:
        list: List of formatted concepts
    """
    current_date = datetime.now().strftime("%Y-%m-%d")

    # Combine all concept categories
    all_concepts = ML_CONCEPTS + DL_CONCEPTS + MATH_CONCEPTS + DS_CONCEPTS

    # Format concepts
    formatted_concepts = []
    for idx, concept in enumerate(all_concepts):
        formatted_concepts.append({
            "id": str(idx + 1),
            "title": concept["title"],
            "content": concept["content"],
            "topics": concept["topics"],
            "reviews": [],
            "next_review": current_date
        })

    return formatted_concepts