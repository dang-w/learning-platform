#!/usr/bin/env python3
"""
Resource Manager for AI Learning Platform

This script helps manage learning resources (articles, videos, courses, books)
by providing functionality to add, update, and query resources.
"""

import json
import os
from datetime import datetime
import argparse

class ResourceManager:
    def __init__(self, resource_file):
        """Initialize the ResourceManager with the path to the resources JSON file."""
        self.resource_file = resource_file
        self.resources = self._load_resources()

    def _load_resources(self):
        """Load resources from the JSON file or create a new structure if it doesn't exist."""
        if os.path.exists(self.resource_file):
            with open(self.resource_file, 'r') as f:
                return json.load(f)
        return {"articles": [], "videos": [], "courses": [], "books": []}

    def _save_resources(self):
        """Save the current resources to the JSON file."""
        # Ensure the directory exists
        os.makedirs(os.path.dirname(self.resource_file), exist_ok=True)

        with open(self.resource_file, 'w') as f:
            json.dump(self.resources, f, indent=2)

    def add_resource(self, type, title, url, topics, difficulty, estimated_time):
        """
        Add a new resource to the collection.

        Args:
            type (str): Type of resource ('articles', 'videos', 'courses', 'books')
            title (str): Title of the resource
            url (str): URL or location of the resource
            topics (list): List of topics covered by the resource
            difficulty (str): Difficulty level ('beginner', 'intermediate', 'advanced')
            estimated_time (int): Estimated time to complete in minutes

        Returns:
            int: ID of the newly added resource
        """
        if type not in self.resources:
            raise ValueError(f"Invalid resource type: {type}. Must be one of: {', '.join(self.resources.keys())}")

        # Generate a new ID (simple incremental approach)
        new_id = len(self.resources[type]) + 1

        # Create the resource object
        resource = {
            "id": new_id,
            "title": title,
            "url": url,
            "topics": topics,
            "difficulty": difficulty,
            "estimated_time": estimated_time,
            "completed": False,
            "date_added": datetime.now().isoformat(),
            "completion_date": None,
            "notes": ""
        }

        # Add to the collection
        self.resources[type].append(resource)
        self._save_resources()

        return new_id

    def mark_completed(self, type, id, notes=""):
        """
        Mark a resource as completed.

        Args:
            type (str): Type of resource
            id (int): ID of the resource
            notes (str, optional): Notes about the resource after completion

        Returns:
            bool: True if successful, False if resource not found
        """
        if type not in self.resources:
            raise ValueError(f"Invalid resource type: {type}")

        for resource in self.resources[type]:
            if resource["id"] == id:
                resource["completed"] = True
                resource["completion_date"] = datetime.now().isoformat()
                resource["notes"] = notes
                self._save_resources()
                return True

        return False

    def get_resources_by_topic(self, topic):
        """
        Get all resources related to a specific topic.

        Args:
            topic (str): Topic to search for

        Returns:
            list: List of resources matching the topic
        """
        result = []
        for type in self.resources:
            for resource in self.resources[type]:
                if topic.lower() in [t.lower() for t in resource["topics"]]:
                    result.append(resource)

        return result

    def get_next_resources(self, count=5):
        """
        Get the next N uncompleted resources.

        Args:
            count (int, optional): Number of resources to return

        Returns:
            list: List of uncompleted resources
        """
        result = []
        for type in self.resources:
            for resource in self.resources[type]:
                if not resource["completed"]:
                    result.append(resource)
                    if len(result) >= count:
                        return result

        return result

    def list_resources(self, type=None, completed=None):
        """
        List resources with optional filtering.

        Args:
            type (str, optional): Filter by resource type
            completed (bool, optional): Filter by completion status

        Returns:
            list: Filtered list of resources
        """
        result = []

        # Determine which types to include
        types_to_include = [type] if type else self.resources.keys()

        for t in types_to_include:
            if t not in self.resources:
                continue

            for resource in self.resources[t]:
                # Filter by completion status if specified
                if completed is not None and resource["completed"] != completed:
                    continue

                result.append(resource)

        return result

    def get_resource_by_id(self, type, id):
        """
        Get a specific resource by ID.

        Args:
            type (str): Resource type
            id (int): Resource ID

        Returns:
            dict: Resource data or None if not found
        """
        if type not in self.resources:
            return None

        for resource in self.resources[type]:
            if resource["id"] == id:
                return resource

        return None

    def update_resource(self, type, id, **kwargs):
        """
        Update a resource's attributes.

        Args:
            type (str): Resource type
            id (int): Resource ID
            **kwargs: Attributes to update

        Returns:
            bool: True if successful, False if resource not found
        """
        if type not in self.resources:
            return False

        for resource in self.resources[type]:
            if resource["id"] == id:
                # Update only valid attributes
                valid_attrs = ["title", "url", "topics", "difficulty", "estimated_time", "notes"]
                for attr, value in kwargs.items():
                    if attr in valid_attrs:
                        resource[attr] = value

                self._save_resources()
                return True

        return False

    def delete_resource(self, type, id):
        """
        Delete a resource.

        Args:
            type (str): Resource type
            id (int): Resource ID

        Returns:
            bool: True if successful, False if resource not found
        """
        if type not in self.resources:
            return False

        for i, resource in enumerate(self.resources[type]):
            if resource["id"] == id:
                del self.resources[type][i]
                self._save_resources()
                return True

        return False

    def get_statistics(self):
        """
        Get statistics about the resources.

        Returns:
            dict: Statistics about resources
        """
        stats = {
            "total": 0,
            "completed": 0,
            "by_type": {},
            "by_difficulty": {
                "beginner": 0,
                "intermediate": 0,
                "advanced": 0
            },
            "by_topic": {},
            "estimated_time": {
                "total": 0,
                "completed": 0,
                "remaining": 0
            }
        }

        for type in self.resources:
            type_count = len(self.resources[type])
            type_completed = sum(1 for r in self.resources[type] if r["completed"])

            stats["total"] += type_count
            stats["completed"] += type_completed

            stats["by_type"][type] = {
                "total": type_count,
                "completed": type_completed
            }

            # Accumulate time statistics
            for resource in self.resources[type]:
                time = resource["estimated_time"]
                stats["estimated_time"]["total"] += time

                if resource["completed"]:
                    stats["estimated_time"]["completed"] += time
                else:
                    stats["estimated_time"]["remaining"] += time

                # Count by difficulty
                difficulty = resource["difficulty"]
                if difficulty in stats["by_difficulty"]:
                    stats["by_difficulty"][difficulty] += 1

                # Count by topic
                for topic in resource["topics"]:
                    if topic not in stats["by_topic"]:
                        stats["by_topic"][topic] = 0
                    stats["by_topic"][topic] += 1

        # Calculate completion percentage
        if stats["total"] > 0:
            stats["completion_percentage"] = (stats["completed"] / stats["total"]) * 100
        else:
            stats["completion_percentage"] = 0

        return stats

def print_resource(resource, detailed=False):
    """Print a resource in a readable format."""
    status = "✓" if resource["completed"] else "□"
    print(f"{status} [{resource['id']}] {resource['title']} ({resource['difficulty']}, {resource['estimated_time']} min)")

    if detailed:
        print(f"  URL: {resource['url']}")
        print(f"  Topics: {', '.join(resource['topics'])}")
        print(f"  Added: {resource['date_added']}")
        if resource["completed"]:
            print(f"  Completed: {resource['completion_date']}")
        if resource["notes"]:
            print(f"  Notes: {resource['notes']}")
        print()

def main():
    """Main function to handle command-line interface."""
    parser = argparse.ArgumentParser(description="Manage learning resources")

    # Base path for resources file
    default_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                               "knowledge-base", "resources", "resources.json")

    parser.add_argument("--file", default=default_path, help="Path to resources JSON file")

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Add resource command
    add_parser = subparsers.add_parser("add", help="Add a new resource")
    add_parser.add_argument("type", choices=["articles", "videos", "courses", "books"], help="Type of resource")
    add_parser.add_argument("title", help="Title of the resource")
    add_parser.add_argument("url", help="URL or location of the resource")
    add_parser.add_argument("--topics", required=True, help="Comma-separated list of topics")
    add_parser.add_argument("--difficulty", choices=["beginner", "intermediate", "advanced"],
                           required=True, help="Difficulty level")
    add_parser.add_argument("--time", type=int, required=True, help="Estimated time in minutes")

    # Mark completed command
    complete_parser = subparsers.add_parser("complete", help="Mark a resource as completed")
    complete_parser.add_argument("type", choices=["articles", "videos", "courses", "books"], help="Type of resource")
    complete_parser.add_argument("id", type=int, help="ID of the resource")
    complete_parser.add_argument("--notes", help="Notes about the resource")

    # List resources command
    list_parser = subparsers.add_parser("list", help="List resources")
    list_parser.add_argument("--type", choices=["articles", "videos", "courses", "books"], help="Filter by type")
    list_parser.add_argument("--completed", action="store_true", help="Show only completed resources")
    list_parser.add_argument("--pending", action="store_true", help="Show only pending resources")
    list_parser.add_argument("--topic", help="Filter by topic")
    list_parser.add_argument("--detailed", action="store_true", help="Show detailed information")

    # Get next resources command
    next_parser = subparsers.add_parser("next", help="Get next resources to study")
    next_parser.add_argument("--count", type=int, default=5, help="Number of resources to show")

    # Show statistics command
    subparsers.add_parser("stats", help="Show statistics about resources")

    # Parse arguments
    args = parser.parse_args()

    # Initialize resource manager
    manager = ResourceManager(args.file)

    # Execute command
    if args.command == "add":
        topics = [t.strip() for t in args.topics.split(",")]
        resource_id = manager.add_resource(args.type, args.title, args.url, topics, args.difficulty, args.time)
        print(f"Added {args.type[:-1]} with ID {resource_id}")

    elif args.command == "complete":
        success = manager.mark_completed(args.type, args.id, args.notes or "")
        if success:
            print(f"Marked {args.type[:-1]} with ID {args.id} as completed")
        else:
            print(f"Resource not found: {args.type} with ID {args.id}")

    elif args.command == "list":
        # Determine completion filter
        completed = None
        if args.completed:
            completed = True
        elif args.pending:
            completed = False

        resources = manager.list_resources(args.type, completed)

        # Filter by topic if specified
        if args.topic:
            resources = [r for r in resources if args.topic.lower() in [t.lower() for t in r["topics"]]]

        if not resources:
            print("No resources found matching the criteria")
        else:
            print(f"Found {len(resources)} resources:")
            for resource in resources:
                print_resource(resource, args.detailed)

    elif args.command == "next":
        resources = manager.get_next_resources(args.count)
        if not resources:
            print("No pending resources found")
        else:
            print(f"Next {len(resources)} resources to study:")
            for resource in resources:
                print_resource(resource, True)

    elif args.command == "stats":
        stats = manager.get_statistics()
        print("Resource Statistics:")
        print(f"Total resources: {stats['total']}")
        print(f"Completed: {stats['completed']} ({stats['completion_percentage']:.1f}%)")
        print(f"Estimated time: {stats['estimated_time']['total']} minutes total")
        print(f"  - Completed: {stats['estimated_time']['completed']} minutes")
        print(f"  - Remaining: {stats['estimated_time']['remaining']} minutes")

        print("\nBy Type:")
        for type, data in stats["by_type"].items():
            print(f"  - {type}: {data['total']} total, {data['completed']} completed")

        print("\nBy Difficulty:")
        for difficulty, count in stats["by_difficulty"].items():
            print(f"  - {difficulty}: {count}")

        print("\nTop Topics:")
        sorted_topics = sorted(stats["by_topic"].items(), key=lambda x: x[1], reverse=True)
        for topic, count in sorted_topics[:10]:  # Show top 10
            print(f"  - {topic}: {count}")

    else:
        parser.print_help()

if __name__ == "__main__":
    main()