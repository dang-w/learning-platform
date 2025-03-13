#!/usr/bin/env python3
"""
Review Scheduler for AI Learning Platform

This script implements a spaced repetition system for scheduling reviews
of learned concepts, helping to optimize knowledge retention.
"""

import json
import os
import random
from datetime import datetime, timedelta
import argparse

class ReviewScheduler:
    def __init__(self, concepts_dir):
        """
        Initialize the ReviewScheduler with the path to the concepts directory.

        Args:
            concepts_dir (str): Path to the directory containing concept markdown files
        """
        self.concepts_dir = concepts_dir
        self.review_log_file = os.path.join(os.path.dirname(concepts_dir), "review_log.json")
        self.review_log = self._load_review_log()

    def _load_review_log(self):
        """Load review log from the JSON file or create a new one if it doesn't exist."""
        if os.path.exists(self.review_log_file):
            with open(self.review_log_file, 'r') as f:
                return json.load(f)
        return {}

    def _save_review_log(self):
        """Save the review log to the JSON file."""
        # Ensure the directory exists
        os.makedirs(os.path.dirname(self.review_log_file), exist_ok=True)

        with open(self.review_log_file, 'w') as f:
            json.dump(self.review_log, f, indent=2)

    def _get_all_concepts(self):
        """
        Get a list of all concept IDs from the concepts directory.

        Returns:
            list: List of concept IDs (filenames without .md extension)
        """
        concepts = []
        if os.path.exists(self.concepts_dir):
            for filename in os.listdir(self.concepts_dir):
                if filename.endswith(".md") and filename != "concept_template.md":
                    concept_id = filename[:-3]  # Remove .md extension
                    concepts.append(concept_id)
        return concepts

    def _calculate_next_review_date(self, review_count):
        """
        Calculate the next review date based on the number of previous reviews.

        Implements a spaced repetition algorithm with increasing intervals:
        - First review: 1 day later
        - Second review: 3 days later
        - Third review: 7 days later
        - Fourth review: 14 days later
        - Fifth review: 30 days later
        - Sixth+ review: 60 days later

        Args:
            review_count (int): Number of times the concept has been reviewed

        Returns:
            datetime: Date and time for the next review
        """
        intervals = [1, 3, 7, 14, 30, 60]
        interval = intervals[min(review_count, len(intervals) - 1)]
        return datetime.now() + timedelta(days=interval)

    def mark_reviewed(self, concept_id, confidence_level=3):
        """
        Mark a concept as reviewed with a confidence level.

        Args:
            concept_id (str): ID of the concept (filename without .md extension)
            confidence_level (int, optional): Confidence level (1-5)

        Returns:
            dict: Updated review data for the concept
        """
        # Validate confidence level
        if not (1 <= confidence_level <= 5):
            raise ValueError("Confidence level must be between 1 and 5")

        # Check if concept exists
        concept_file = os.path.join(self.concepts_dir, f"{concept_id}.md")
        if not os.path.exists(concept_file):
            raise ValueError(f"Concept file not found: {concept_file}")

        # Initialize concept in review log if not present
        if concept_id not in self.review_log:
            self.review_log[concept_id] = {
                "reviews": [],
                "next_review": None
            }

        # Create review entry
        review_entry = {
            "date": datetime.now().isoformat(),
            "confidence": confidence_level
        }

        # Add to review history
        self.review_log[concept_id]["reviews"].append(review_entry)

        # Calculate next review date based on number of reviews and confidence
        review_count = len(self.review_log[concept_id]["reviews"])

        # Adjust interval based on confidence (lower confidence = earlier review)
        confidence_factor = max(0.5, confidence_level / 5)  # 0.5 to 1.0

        next_review_date = self._calculate_next_review_date(review_count)

        # Adjust based on confidence
        days_adjustment = (1 - confidence_factor) * 2  # 0 to 1 days earlier for low confidence
        next_review_date = next_review_date - timedelta(days=days_adjustment)

        # Update next review date
        self.review_log[concept_id]["next_review"] = next_review_date.isoformat()

        # Save changes
        self._save_review_log()

        # Update review history in the concept file
        self._update_concept_review_history(concept_id, review_entry)

        return self.review_log[concept_id]

    def _update_concept_review_history(self, concept_id, review_entry):
        """
        Update the review history section in the concept markdown file.

        Args:
            concept_id (str): ID of the concept
            review_entry (dict): Review entry to add
        """
        concept_file = os.path.join(self.concepts_dir, f"{concept_id}.md")
        if not os.path.exists(concept_file):
            return

        with open(concept_file, 'r') as f:
            content = f.read()

        # Parse the review date
        review_date = datetime.fromisoformat(review_entry["date"]).strftime("%Y-%m-%d")
        confidence = review_entry["confidence"]

        # Check if the file has a Review History section
        if "## Review History" in content:
            # Add the new review entry
            review_line = f"- [{review_date}] - Review (Confidence: {confidence}/5)\n"

            # Find the position to insert the new entry
            history_section_pos = content.find("## Review History")
            next_section_pos = content.find("##", history_section_pos + 1)

            if next_section_pos == -1:
                # No next section, append to the end
                updated_content = content + review_line
            else:
                # Insert before the next section
                updated_content = (
                    content[:next_section_pos].rstrip() +
                    "\n" + review_line + "\n\n" +
                    content[next_section_pos:]
                )
        else:
            # Add a new Review History section at the end
            review_section = f"\n\n## Review History\n- [{review_date}] - Review (Confidence: {confidence}/5)\n"
            updated_content = content + review_section

        # Write the updated content back to the file
        with open(concept_file, 'w') as f:
            f.write(updated_content)

    def get_due_reviews(self):
        """
        Get concepts that are due for review.

        Returns:
            list: List of concept IDs due for review
        """
        now = datetime.now()
        due_concepts = []

        for concept_id, data in self.review_log.items():
            if data["next_review"]:
                next_review = datetime.fromisoformat(data["next_review"])
                if next_review <= now:
                    due_concepts.append(concept_id)

        return due_concepts

    def get_new_concepts_for_review(self, count=3):
        """
        Get concepts that haven't been reviewed yet.

        Args:
            count (int, optional): Maximum number of concepts to return

        Returns:
            list: List of concept IDs that haven't been reviewed
        """
        all_concepts = self._get_all_concepts()
        reviewed_concepts = set(self.review_log.keys())
        new_concepts = [c for c in all_concepts if c not in reviewed_concepts]

        # Randomly select up to 'count' new concepts
        if len(new_concepts) <= count:
            return new_concepts
        return random.sample(new_concepts, count)

    def generate_daily_review_list(self, max_reviews=5):
        """
        Generate a list of concepts to review today, prioritizing due reviews.

        Args:
            max_reviews (int, optional): Maximum number of concepts to include

        Returns:
            list: List of concept IDs to review
        """
        due_reviews = self.get_due_reviews()

        # If we have more due reviews than our max, prioritize oldest ones
        if len(due_reviews) > max_reviews:
            # Sort by next review date (oldest first)
            due_reviews_with_dates = [
                (concept, datetime.fromisoformat(self.review_log[concept]["next_review"]))
                for concept in due_reviews
            ]
            due_reviews_with_dates.sort(key=lambda x: x[1])
            due_reviews = [concept for concept, _ in due_reviews_with_dates[:max_reviews]]
            return due_reviews

        # If we have fewer due reviews than max, add some new concepts
        remaining_slots = max_reviews - len(due_reviews)
        if remaining_slots > 0:
            new_concepts = self.get_new_concepts_for_review(remaining_slots)
            return due_reviews + new_concepts

        return due_reviews

    def get_concept_details(self, concept_id):
        """
        Get details about a concept.

        Args:
            concept_id (str): ID of the concept

        Returns:
            dict: Concept details including title, review history, etc.
        """
        concept_file = os.path.join(self.concepts_dir, f"{concept_id}.md")
        if not os.path.exists(concept_file):
            return None

        # Extract title from the file
        title = concept_id
        with open(concept_file, 'r') as f:
            first_line = f.readline().strip()
            if first_line.startswith('# '):
                title = first_line[2:]

        # Get review history
        review_history = []
        if concept_id in self.review_log:
            review_history = self.review_log[concept_id]["reviews"]
            next_review = self.review_log[concept_id]["next_review"]
        else:
            next_review = None

        return {
            "id": concept_id,
            "title": title,
            "file_path": concept_file,
            "review_history": review_history,
            "next_review": next_review,
            "review_count": len(review_history) if review_history else 0
        }

    def generate_review_session(self, output_file=None):
        """
        Generate a formatted review session plan.

        Args:
            output_file (str, optional): Path to save the session plan

        Returns:
            str: Formatted review session plan
        """
        review_list = self.generate_daily_review_list()

        if not review_list:
            return "No concepts due for review today!"

        # Generate session plan
        now = datetime.now()
        session_plan = f"# Daily Review Session\n\n"
        session_plan += f"Date: {now.strftime('%Y-%m-%d')}\n\n"
        session_plan += f"## Concepts to Review ({len(review_list)})\n\n"

        for i, concept_id in enumerate(review_list, 1):
            # Get concept details
            details = self.get_concept_details(concept_id)
            if not details:
                continue

            # Check if it's a new or existing concept
            is_new = concept_id not in self.review_log
            status = "NEW" if is_new else "REVIEW"

            # Add to session plan
            session_plan += f"{i}. [{status}] {details['title']} - `{concept_id}`\n"

            if not is_new:
                # Add review history summary
                last_review = datetime.fromisoformat(details['review_history'][-1]['date'])
                last_confidence = details['review_history'][-1]['confidence']
                days_ago = (now - last_review).days
                session_plan += f"   - Last reviewed: {days_ago} days ago (Confidence: {last_confidence}/5)\n"
                session_plan += f"   - Review count: {details['review_count']}\n"

        session_plan += "\n## After reviewing each concept:\n"
        session_plan += "1. Rate your confidence (1-5)\n"
        session_plan += "2. Mark as reviewed using the script\n"
        session_plan += "3. Make any necessary updates to the concept note\n\n"

        session_plan += "## Command to mark as reviewed:\n"
        session_plan += "```\n"
        session_plan += "python scripts/review_scheduler.py review CONCEPT_ID --confidence LEVEL\n"
        session_plan += "```\n"

        # Save session plan if output file specified
        if output_file:
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            with open(output_file, 'w') as f:
                f.write(session_plan)

        return session_plan

    def get_review_statistics(self):
        """
        Get statistics about the review system.

        Returns:
            dict: Statistics about reviews
        """
        stats = {
            "total_concepts": len(self._get_all_concepts()),
            "reviewed_concepts": len(self.review_log),
            "due_reviews": len(self.get_due_reviews()),
            "new_concepts": len(self._get_all_concepts()) - len(self.review_log),
            "review_counts": {},
            "average_confidence": 0,
            "review_history": {
                "last_7_days": 0,
                "last_30_days": 0,
                "all_time": 0
            }
        }

        # Count reviews by confidence level
        confidence_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        total_confidence = 0
        total_reviews = 0

        # Count reviews by time period
        now = datetime.now()
        last_7_days = now - timedelta(days=7)
        last_30_days = now - timedelta(days=30)

        for concept_id, data in self.review_log.items():
            # Count by review count
            review_count = len(data["reviews"])
            if review_count not in stats["review_counts"]:
                stats["review_counts"][review_count] = 0
            stats["review_counts"][review_count] += 1

            # Process individual reviews
            for review in data["reviews"]:
                total_reviews += 1

                # Count by confidence
                confidence = review["confidence"]
                confidence_counts[confidence] += 1
                total_confidence += confidence

                # Count by time period
                review_date = datetime.fromisoformat(review["date"])
                if review_date >= last_7_days:
                    stats["review_history"]["last_7_days"] += 1
                if review_date >= last_30_days:
                    stats["review_history"]["last_30_days"] += 1

        # Calculate average confidence
        stats["review_history"]["all_time"] = total_reviews
        if total_reviews > 0:
            stats["average_confidence"] = total_confidence / total_reviews

        # Add confidence distribution
        stats["confidence_distribution"] = confidence_counts

        return stats

def main():
    """Main function to handle command-line interface."""
    parser = argparse.ArgumentParser(description="Manage spaced repetition reviews")

    # Base path for concepts directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    default_concepts_dir = os.path.join(base_dir, "knowledge-base", "concepts")

    parser.add_argument("--concepts-dir", default=default_concepts_dir,
                       help="Path to concepts directory")

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Generate review session command
    session_parser = subparsers.add_parser("session", help="Generate a review session")
    session_parser.add_argument("--output",
                              help="Path to save the session plan")
    session_parser.add_argument("--max-reviews", type=int, default=5,
                              help="Maximum number of concepts to review")

    # Mark concept as reviewed command
    review_parser = subparsers.add_parser("review", help="Mark a concept as reviewed")
    review_parser.add_argument("concept_id", help="ID of the concept (filename without .md)")
    review_parser.add_argument("--confidence", type=int, default=3,
                             help="Confidence level (1-5)")

    # List due reviews command
    due_parser = subparsers.add_parser("due", help="List concepts due for review")

    # Show statistics command
    stats_parser = subparsers.add_parser("stats", help="Show review statistics")

    # Parse arguments
    args = parser.parse_args()

    # Initialize scheduler
    scheduler = ReviewScheduler(args.concepts_dir)

    # Execute command
    if args.command == "session":
        # Default output path if not specified
        if not args.output:
            session_dir = os.path.join(base_dir, "knowledge-base", "review-sessions")
            os.makedirs(session_dir, exist_ok=True)
            args.output = os.path.join(session_dir, f"{datetime.now().strftime('%Y-%m-%d')}_session.md")

        session_plan = scheduler.generate_review_session(args.output)
        print(f"Review session generated and saved to {args.output}")

    elif args.command == "review":
        try:
            result = scheduler.mark_reviewed(args.concept_id, args.confidence)
            next_review = datetime.fromisoformat(result["next_review"])
            print(f"Marked '{args.concept_id}' as reviewed with confidence {args.confidence}/5")
            print(f"Next review scheduled for: {next_review.strftime('%Y-%m-%d')}")
        except ValueError as e:
            print(f"Error: {e}")

    elif args.command == "due":
        due_reviews = scheduler.get_due_reviews()
        if not due_reviews:
            print("No concepts due for review")
        else:
            print(f"Concepts due for review ({len(due_reviews)}):")
            for concept_id in due_reviews:
                details = scheduler.get_concept_details(concept_id)
                if details:
                    print(f"- {details['title']} ({concept_id})")

    elif args.command == "stats":
        stats = scheduler.get_review_statistics()
        print("Review Statistics:")
        print(f"Total concepts: {stats['total_concepts']}")
        print(f"Reviewed concepts: {stats['reviewed_concepts']} ({stats['reviewed_concepts']/stats['total_concepts']*100:.1f}% of total)")
        print(f"Due for review: {stats['due_reviews']}")
        print(f"New (unreviewed): {stats['new_concepts']}")

        print("\nReview History:")
        print(f"Last 7 days: {stats['review_history']['last_7_days']} reviews")
        print(f"Last 30 days: {stats['review_history']['last_30_days']} reviews")
        print(f"All time: {stats['review_history']['all_time']} reviews")

        print("\nAverage confidence: {:.1f}/5".format(stats['average_confidence']))

        print("\nConfidence Distribution:")
        for level in range(1, 6):
            count = stats['confidence_distribution'][level]
            percentage = (count / stats['review_history']['all_time'] * 100) if stats['review_history']['all_time'] > 0 else 0
            print(f"Level {level}: {count} reviews ({percentage:.1f}%)")

    else:
        parser.print_help()

if __name__ == "__main__":
    main()