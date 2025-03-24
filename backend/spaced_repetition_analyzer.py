#!/usr/bin/env python
"""
Spaced Repetition Implementation Analyzer and Fixer

This script analyzes the current implementation of spaced repetition in the learning platform
and provides suggestions for improvements. It also includes implementations for proper
SM2 and Leitner spaced repetition algorithms.
"""

import os
import json
import re
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Dict, Any, Optional, Tuple, Union

class SpacedRepetitionAlgorithm(str, Enum):
    SM2 = "sm2"
    LEITNER = "leitner"
    CUSTOM = "custom"

# Implementation of proper SM2 algorithm
def sm2_algorithm(previous_interval: float, previous_ef: float, quality: int) -> Tuple[float, float]:
    """
    Implements the SuperMemo 2 algorithm for spaced repetition.

    Args:
        previous_interval: The previous interval in days
        previous_ef: The previous E-Factor (easiness factor)
        quality: The quality of response (0-5)

    Returns:
        Tuple of (new_interval, new_ef)
    """
    # Ensure quality is within valid range
    quality = max(0, min(5, quality))

    # Calculate new EF (easiness factor)
    # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    new_ef = previous_ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    new_ef = max(1.3, new_ef)  # EF should not be lower than 1.3

    # Calculate new interval
    if quality < 3:
        new_interval = 1  # If response was poor, reset interval to 1 day
    elif previous_interval == 0:
        new_interval = 1  # First time
    elif previous_interval == 1:
        new_interval = 6  # Second time
    else:
        new_interval = previous_interval * new_ef

    return (new_interval, new_ef)

# Implementation of Leitner system
def leitner_algorithm(current_box: int, quality: int, max_boxes: int = 5) -> int:
    """
    Implements the Leitner system for spaced repetition.

    Args:
        current_box: The current box number (1-based)
        quality: The quality of response (1-5)
        max_boxes: The maximum number of boxes

    Returns:
        The new box number
    """
    # Convert 1-5 quality to simplified correct/incorrect
    correct = quality >= 3

    # Calculate new box
    if correct:
        # Move to next box if answer is correct
        return min(current_box + 1, max_boxes)
    else:
        # Move back to box 1 if answer is incorrect
        return 1

# Function to calculate review intervals based on box number
def leitner_intervals(box: int) -> int:
    """
    Calculate review interval in days based on box number.

    Args:
        box: The box number (1-based)

    Returns:
        The interval in days
    """
    # Common Leitner schedule: Box 1 = 1 day, Box 2 = 3 days, Box 3 = 7 days, etc.
    intervals = [1, 3, 7, 14, 30, 60, 120]
    return intervals[min(box - 1, len(intervals) - 1)]

# Function to analyze current implementation
def analyze_spaced_repetition_implementation():
    """
    Analyze the current spaced repetition implementation and provide recommendations.

    Returns:
        Dict containing analysis results and recommendations
    """
    results = {
        "issues": [],
        "recommendations": [],
        "implementation_status": {
            "sm2": False,
            "leitner": False,
            "custom": False
        }
    }

    # Check implementation of calculate_next_review_date function in reviews.py
    try:
        with open('backend/routers/reviews.py', 'r') as f:
            reviews_content = f.read()

        # Check if calculate_next_review_date uses a proper algorithm
        if re.search(r'def\s+calculate_next_review_date', reviews_content):
            results["implementation_status"]["custom"] = True

            # Check implementation details
            if 'confidence_factor = max(0.5, confidence_level / 5)' in reviews_content:
                results["issues"].append(
                    "The confidence factor calculation is simplistic and doesn't follow proper SM2 algorithm."
                )

            if 'intervals = [1, 3, 7, 14, 30, 60]' in reviews_content:
                results["issues"].append(
                    "The intervals are hardcoded and don't follow the exponential growth pattern of SM2 algorithm."
                )

            if not re.search(r'ef\s*=|easiness_factor\s*=', reviews_content, re.IGNORECASE):
                results["issues"].append(
                    "No implementation of easiness factor (EF) which is key to the SM2 algorithm."
                )

            if 'class ReviewSettings' in reviews_content and 'algorithm' not in reviews_content:
                results["issues"].append(
                    "ReviewSettings model doesn't have an algorithm field to switch between different algorithms."
                )
        else:
            results["issues"].append(
                "Missing calculate_next_review_date function in reviews.py"
            )
    except FileNotFoundError:
        results["issues"].append("backend/routers/reviews.py file not found")

    # Check frontend types for consistency
    try:
        with open('frontend/src/types/knowledge.ts', 'r') as f:
            knowledge_types = f.read()

        # Check if SpacedRepetitionAlgorithm enum exists
        if 'enum SpacedRepetitionAlgorithm' in knowledge_types:
            if 'SM2 = ' in knowledge_types:
                results["implementation_status"]["sm2"] = True
            if 'LEITNER = ' in knowledge_types:
                results["implementation_status"]["leitner"] = True

            # Check for interface inconsistencies
            if 'interface SpacedRepetitionSettings' in knowledge_types:
                if 'algorithm: SpacedRepetitionAlgorithm' in knowledge_types and 'daily_review_target: number' not in knowledge_types:
                    results["issues"].append(
                        "Inconsistency between frontend SpacedRepetitionSettings interface and backend ReviewSettings model"
                    )
    except FileNotFoundError:
        results["issues"].append("frontend/src/types/knowledge.ts file not found")

    # Generate recommendations
    if results["implementation_status"]["sm2"] and not results["implementation_status"]["custom"]:
        results["recommendations"].append(
            "Implement proper SM2 algorithm in the backend as indicated in frontend types"
        )

    if results["implementation_status"]["leitner"] and not results["implementation_status"]["custom"]:
        results["recommendations"].append(
            "Implement proper Leitner system in the backend as indicated in frontend types"
        )

    if len(results["issues"]) > 0:
        results["recommendations"].append(
            "Ensure consistency between frontend types and backend models for spaced repetition settings"
        )

    results["recommendations"].append(
        "Implement proper algorithm selection mechanism to switch between SM2, Leitner, and custom algorithms"
    )

    return results

# Function to generate fixes for the issues
def generate_fixes():
    """
    Generate code fixes for the identified issues.

    Returns:
        Dict containing code fixes
    """
    fixes = {
        "backend_fixes": {
            "reviews.py": {
                "calculate_next_review_date": "",
                "ReviewSettings": "",
                "Concept": ""
            }
        },
        "frontend_fixes": {}
    }

    # Fix for calculate_next_review_date function
    fixes["backend_fixes"]["reviews.py"]["calculate_next_review_date"] = '''
def calculate_next_review_date(review_count, confidence_level=3, algorithm="sm2", ef=2.5, box=1):
    """
    Calculate the next review date based on the algorithm, previous reviews, and confidence level.

    Args:
        review_count (int): Number of times the concept has been reviewed
        confidence_level (int): Confidence level (1-5)
        algorithm (str): Algorithm to use - "sm2", "leitner", or "custom"
        ef (float): Easiness factor for SM2 algorithm
        box (int): Current box for Leitner system

    Returns:
        tuple: (datetime for next review, updated ef, updated box)
    """
    now = datetime.now()

    if algorithm.lower() == "sm2":
        # Use SM2 algorithm
        previous_interval = 0 if review_count == 0 else (
            1 if review_count == 1 else ef
        )
        new_interval, new_ef = sm2_algorithm(previous_interval, ef, confidence_level)
        return now + timedelta(days=new_interval), new_ef, box

    elif algorithm.lower() == "leitner":
        # Use Leitner system
        new_box = leitner_algorithm(box, confidence_level)
        interval_days = leitner_intervals(new_box)
        return now + timedelta(days=interval_days), ef, new_box

    else:
        # Use custom algorithm (current implementation)
        intervals = [1, 3, 7, 14, 30, 60]
        base_interval = intervals[min(review_count, len(intervals) - 1)]
        confidence_factor = max(0.5, confidence_level / 5)  # 0.5 to 1.0
        adjusted_interval = base_interval * confidence_factor
        return now + timedelta(days=adjusted_interval), ef, box
'''

    # Fix for ReviewSettings model
    fixes["backend_fixes"]["reviews.py"]["ReviewSettings"] = '''
class ReviewSettings(BaseModel):
    """Review settings model."""
    daily_review_target: int = 5
    notification_frequency: str = "daily"
    review_reminder_time: str = "18:00"
    enable_spaced_repetition: bool = True
    auto_schedule_reviews: bool = True
    show_hints: bool = True
    difficulty_threshold: int = 3
    algorithm: str = "sm2"  # "sm2", "leitner", or "custom"
    new_concepts_per_day: int = 3
    include_new_concepts: bool = True
'''

    # Fix for the Concept model to include necessary fields for spaced repetition algorithms
    fixes["backend_fixes"]["reviews.py"]["Concept"] = '''
class Concept(ConceptBase):
    id: str
    reviews: List[Review] = []
    next_review: Optional[str] = None
    ef: float = 2.5  # Easiness factor for SM2 algorithm
    box: int = 1  # Box number for Leitner system
    review_count: int = 0  # Number of times concept has been reviewed
'''

    return fixes

# Function to write fixes to report file
def write_fixes_report():
    """Write an analysis and fixes report to a file."""

    analysis = analyze_spaced_repetition_implementation()
    fixes = generate_fixes()

    report = {
        "timestamp": datetime.now().isoformat(),
        "analysis": analysis,
        "fixes": fixes
    }

    with open('spaced_repetition_analysis.json', 'w') as f:
        json.dump(report, f, indent=2)

    print("Analysis complete. Report written to spaced_repetition_analysis.json")

    # Print summary to console
    print("\n=== Spaced Repetition Implementation Analysis ===")
    print(f"Issues found: {len(analysis['issues'])}")
    for i, issue in enumerate(analysis['issues']):
        print(f"{i + 1}. {issue}")

    print("\nRecommendations:")
    for i, rec in enumerate(analysis['recommendations']):
        print(f"{i + 1}. {rec}")

    print("\nImplementation Status:")
    for algo, status in analysis['implementation_status'].items():
        print(f"- {algo.upper()}: {'Implemented' if status else 'Not implemented'}")

    print("\nFixes have been generated in the report file.")

if __name__ == "__main__":
    write_fixes_report()