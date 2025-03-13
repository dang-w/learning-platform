#!/usr/bin/env python3
"""
Progress Analyzer for AI Learning Platform

This script analyzes learning progress by processing resource completion data
and study time metrics, generating reports and visualizations.
"""

import json
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import argparse

class ProgressAnalyzer:
    def __init__(self, resource_file, metrics_file):
        """
        Initialize the ProgressAnalyzer with paths to resource and metrics files.

        Args:
            resource_file (str): Path to the resources JSON file
            metrics_file (str): Path to the metrics Excel file
        """
        self.resource_file = resource_file
        self.metrics_file = metrics_file
        self.resources = self._load_resources()
        self.metrics = self._load_metrics()

    def _load_resources(self):
        """Load resources from the JSON file."""
        if os.path.exists(self.resource_file):
            with open(self.resource_file, 'r') as f:
                return json.load(f)
        return {}

    def _load_metrics(self):
        """Load metrics from the Excel file or create a new DataFrame if it doesn't exist."""
        if os.path.exists(self.metrics_file):
            return pd.read_excel(self.metrics_file)
        return pd.DataFrame(columns=['date', 'study_hours', 'topics', 'focus_score', 'notes'])

    def _save_metrics(self):
        """Save metrics to the Excel file."""
        # Ensure the directory exists
        os.makedirs(os.path.dirname(self.metrics_file), exist_ok=True)

        # Save to Excel
        self.metrics.to_excel(self.metrics_file, index=False)

    def add_daily_metrics(self, date, study_hours, topics, focus_score, notes=""):
        """
        Add a new daily metrics entry.

        Args:
            date (str): Date in YYYY-MM-DD format
            study_hours (float): Hours spent studying
            topics (str): Comma-separated list of topics studied
            focus_score (int): Focus quality score (1-10)
            notes (str, optional): Additional notes

        Returns:
            bool: True if successful
        """
        # Convert date string to datetime if needed
        if isinstance(date, str):
            try:
                date = datetime.strptime(date, "%Y-%m-%d").strftime("%Y-%m-%d")
            except ValueError:
                raise ValueError("Date must be in YYYY-MM-DD format")

        # Validate inputs
        if not (0 < study_hours < 24):
            raise ValueError("Study hours must be between 0 and 24")

        if not (1 <= focus_score <= 10):
            raise ValueError("Focus score must be between 1 and 10")

        # Create new entry
        new_entry = pd.DataFrame({
            'date': [date],
            'study_hours': [float(study_hours)],
            'topics': [topics],
            'focus_score': [int(focus_score)],
            'notes': [notes]
        })

        # Check if entry for this date already exists
        existing = self.metrics[self.metrics['date'] == date]
        if not existing.empty:
            # Update existing entry
            self.metrics.loc[self.metrics['date'] == date, 'study_hours'] += study_hours

            # Combine topics
            existing_topics = set(self.metrics.loc[self.metrics['date'] == date, 'topics'].iloc[0].split(','))
            new_topics = set(topics.split(','))
            combined_topics = ','.join(existing_topics.union(new_topics))
            self.metrics.loc[self.metrics['date'] == date, 'topics'] = combined_topics

            # Update focus score (average)
            current_score = self.metrics.loc[self.metrics['date'] == date, 'focus_score'].iloc[0]
            new_score = (current_score + focus_score) / 2
            self.metrics.loc[self.metrics['date'] == date, 'focus_score'] = new_score

            # Append notes
            if notes:
                current_notes = self.metrics.loc[self.metrics['date'] == date, 'notes'].iloc[0]
                if current_notes:
                    combined_notes = f"{current_notes}; {notes}"
                else:
                    combined_notes = notes
                self.metrics.loc[self.metrics['date'] == date, 'notes'] = combined_notes
        else:
            # Add new entry
            self.metrics = pd.concat([self.metrics, new_entry], ignore_index=True)

        # Sort by date
        self.metrics['date'] = pd.to_datetime(self.metrics['date'])
        self.metrics = self.metrics.sort_values('date')
        self.metrics['date'] = self.metrics['date'].dt.strftime("%Y-%m-%d")

        # Save changes
        self._save_metrics()

        return True

    def calculate_completion_rate(self):
        """
        Calculate the overall resource completion rate.

        Returns:
            float: Completion rate as a decimal (0-1)
        """
        total = 0
        completed = 0

        for type in self.resources:
            for resource in self.resources[type]:
                total += 1
                if resource.get("completed", False):
                    completed += 1

        return (completed / total) if total > 0 else 0

    def calculate_study_time_last_n_days(self, n=7):
        """
        Calculate total study time for the last N days.

        Args:
            n (int, optional): Number of days to look back

        Returns:
            float: Total study hours
        """
        if self.metrics.empty:
            return 0

        end_date = datetime.now()
        start_date = end_date - timedelta(days=n)

        # Convert date column to datetime for comparison
        self.metrics['date_dt'] = pd.to_datetime(self.metrics['date'])

        filtered_metrics = self.metrics[
            (self.metrics['date_dt'] >= start_date) &
            (self.metrics['date_dt'] <= end_date)
        ]

        # Clean up temporary column
        self.metrics = self.metrics.drop('date_dt', axis=1)

        return filtered_metrics['study_hours'].sum()

    def get_topic_distribution(self):
        """
        Get distribution of completed resources by topic.

        Returns:
            dict: Topic counts for completed resources
        """
        topic_count = {}

        for type in self.resources:
            for resource in self.resources[type]:
                if resource.get("completed", False):
                    for topic in resource.get("topics", []):
                        topic_count[topic] = topic_count.get(topic, 0) + 1

        return topic_count

    def get_recent_topics(self, days=7):
        """
        Get topics studied in the last N days.

        Args:
            days (int, optional): Number of days to look back

        Returns:
            dict: Topic frequency in recent study sessions
        """
        if self.metrics.empty:
            return {}

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Convert date column to datetime for comparison
        self.metrics['date_dt'] = pd.to_datetime(self.metrics['date'])

        filtered_metrics = self.metrics[
            (self.metrics['date_dt'] >= start_date) &
            (self.metrics['date_dt'] <= end_date)
        ]

        # Clean up temporary column
        self.metrics = self.metrics.drop('date_dt', axis=1)

        if filtered_metrics.empty:
            return {}

        # Count topic frequency
        topic_freq = {}
        for _, row in filtered_metrics.iterrows():
            topics = row['topics'].split(',')
            for topic in topics:
                topic = topic.strip()
                if topic:
                    topic_freq[topic] = topic_freq.get(topic, 0) + 1

        return topic_freq

    def generate_weekly_report(self, output_file=None):
        """
        Generate a weekly learning progress report.

        Args:
            output_file (str, optional): Path to save the report

        Returns:
            str: Report content
        """
        # Calculate metrics
        completion_rate = self.calculate_completion_rate() * 100
        study_time_week = self.calculate_study_time_last_n_days(7)
        topic_distribution = self.get_topic_distribution()
        recent_topics = self.get_recent_topics(7)

        # Sort topics by count
        sorted_topics = sorted(topic_distribution.items(), key=lambda x: x[1], reverse=True)
        top_topics = sorted_topics[:5] if len(sorted_topics) > 5 else sorted_topics

        # Sort recent topics by frequency
        sorted_recent = sorted(recent_topics.items(), key=lambda x: x[1], reverse=True)
        top_recent = sorted_recent[:5] if len(sorted_recent) > 5 else sorted_recent

        # Generate report
        now = datetime.now()
        week_start = (now - timedelta(days=7)).strftime('%Y-%m-%d')
        week_end = now.strftime('%Y-%m-%d')

        report = f"""
# Weekly Learning Progress Report

Generated: {now.strftime('%Y-%m-%d %H:%M')}
Period: {week_start} to {week_end}

## Summary Metrics
- Overall completion rate: {completion_rate:.1f}%
- Study time this week: {study_time_week:.1f} hours
- Top topics covered: {', '.join([t[0] for t in top_recent]) if top_recent else 'None'}

## Topic Distribution (All-time)
"""

        if top_topics:
            for topic, count in top_topics:
                report += f"- {topic}: {count} resources\n"
        else:
            report += "No completed resources yet.\n"

        report += "\n## Recent Study Focus\n"

        if top_recent:
            for topic, count in top_recent:
                report += f"- {topic}: {count} sessions\n"
        else:
            report += "No study sessions recorded in the past week.\n"

        report += "\n## Study Patterns\n"

        # Analyze study patterns if we have data
        if not self.metrics.empty:
            # Convert to datetime for analysis
            self.metrics['date_dt'] = pd.to_datetime(self.metrics['date'])

            # Filter to last 30 days for pattern analysis
            last_30_days = datetime.now() - timedelta(days=30)
            recent_metrics = self.metrics[self.metrics['date_dt'] >= last_30_days]

            if not recent_metrics.empty:
                # Study consistency
                study_days = recent_metrics['date_dt'].dt.date.nunique()
                consistency = (study_days / 30) * 100
                report += f"- Study consistency: {consistency:.1f}% of days\n"

                # Average daily study time
                avg_daily = recent_metrics.groupby(recent_metrics['date_dt'].dt.date)['study_hours'].sum().mean()
                report += f"- Average daily study time: {avg_daily:.2f} hours\n"

                # Average focus score
                avg_focus = recent_metrics['focus_score'].mean()
                report += f"- Average focus score: {avg_focus:.1f}/10\n"
            else:
                report += "Insufficient data for pattern analysis.\n"

            # Clean up temporary column
            self.metrics = self.metrics.drop('date_dt', axis=1)
        else:
            report += "No study data available for pattern analysis.\n"

        report += "\n## Recommendations\n"

        # Generate recommendations based on data
        if top_topics and top_recent:
            # Find topics that are in the overall distribution but not recent focus
            all_time_topics = set([t[0] for t in sorted_topics])
            recent_focus = set([t[0] for t in sorted_recent])
            neglected = all_time_topics - recent_focus

            if neglected:
                report += f"- Consider revisiting: {', '.join(list(neglected)[:3])}\n"

            # Recommend continuing with most recent topic
            if top_recent:
                report += f"- Continue focusing on: {top_recent[0][0]}\n"
        else:
            report += "- Start tracking your learning to get personalized recommendations.\n"

        # Save report if output file specified
        if output_file:
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            with open(output_file, 'w') as f:
                f.write(report)

        return report

    def plot_study_time_trend(self, days=30, output_file=None):
        """
        Generate a plot of study time trends.

        Args:
            days (int, optional): Number of days to include
            output_file (str, optional): Path to save the plot

        Returns:
            str: Path to saved plot or message
        """
        if self.metrics.empty:
            return "No data available for plotting"

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Convert date column to datetime for comparison
        self.metrics['date_dt'] = pd.to_datetime(self.metrics['date'])

        filtered_metrics = self.metrics[
            (self.metrics['date_dt'] >= start_date) &
            (self.metrics['date_dt'] <= end_date)
        ]

        # Clean up temporary column
        self.metrics = self.metrics.drop('date_dt', axis=1)

        if filtered_metrics.empty:
            return f"No data available for the last {days} days"

        # Create a date range for all days in the period
        date_range = pd.date_range(start=start_date, end=end_date)
        date_df = pd.DataFrame({'date_dt': date_range})
        date_df['date'] = date_df['date_dt'].dt.strftime('%Y-%m-%d')

        # Convert filtered_metrics date to string for merging
        filtered_metrics['date'] = filtered_metrics['date_dt'].dt.strftime('%Y-%m-%d')

        # Merge to include all days
        merged = pd.merge(date_df, filtered_metrics, on='date', how='left')
        merged['study_hours'] = merged['study_hours'].fillna(0)

        # Group by date and sum study hours
        daily_hours = merged.groupby('date')['study_hours'].sum()

        # Plot
        plt.figure(figsize=(12, 6))
        ax = daily_hours.plot(kind='bar', color='skyblue')
        plt.title(f'Daily Study Hours - Last {days} Days')
        plt.xlabel('Date')
        plt.ylabel('Hours')
        plt.xticks(rotation=45)
        plt.tight_layout()

        # Add 7-day moving average
        if len(daily_hours) > 7:
            rolling_avg = daily_hours.rolling(window=7).mean()
            ax2 = ax.twinx()
            rolling_avg.plot(ax=ax2, color='red', label='7-day average')
            ax2.set_ylabel('7-day Average (hours)', color='red')
            ax2.tick_params(axis='y', colors='red')
            ax2.legend(loc='upper right')

        # Save the plot
        if output_file:
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            plt.savefig(output_file)
            plt.close()
            return f"Plot saved to {output_file}"
        else:
            # Default location
            default_path = os.path.join(os.path.dirname(self.metrics_file), 'study_time_trend.png')
            os.makedirs(os.path.dirname(default_path), exist_ok=True)
            plt.savefig(default_path)
            plt.close()
            return f"Plot saved to {default_path}"

    def plot_focus_vs_time(self, days=30, output_file=None):
        """
        Generate a scatter plot of focus score vs. study time.

        Args:
            days (int, optional): Number of days to include
            output_file (str, optional): Path to save the plot

        Returns:
            str: Path to saved plot or message
        """
        if self.metrics.empty:
            return "No data available for plotting"

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Convert date column to datetime for comparison
        self.metrics['date_dt'] = pd.to_datetime(self.metrics['date'])

        filtered_metrics = self.metrics[
            (self.metrics['date_dt'] >= start_date) &
            (self.metrics['date_dt'] <= end_date)
        ]

        # Clean up temporary column
        self.metrics = self.metrics.drop('date_dt', axis=1)

        if filtered_metrics.empty:
            return f"No data available for the last {days} days"

        # Plot
        plt.figure(figsize=(10, 6))
        plt.scatter(filtered_metrics['focus_score'], filtered_metrics['study_hours'],
                   alpha=0.7, s=100, c=range(len(filtered_metrics)), cmap='viridis')

        # Add trend line
        if len(filtered_metrics) > 1:
            z = np.polyfit(filtered_metrics['focus_score'], filtered_metrics['study_hours'], 1)
            p = np.poly1d(z)
            plt.plot(sorted(filtered_metrics['focus_score']),
                    p(sorted(filtered_metrics['focus_score'])),
                    "r--", alpha=0.8)

        plt.title(f'Focus Score vs. Study Time - Last {days} Days')
        plt.xlabel('Focus Score (1-10)')
        plt.ylabel('Study Hours')
        plt.grid(True, alpha=0.3)
        plt.colorbar(label='Days Ago')

        # Save the plot
        if output_file:
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            plt.savefig(output_file)
            plt.close()
            return f"Plot saved to {output_file}"
        else:
            # Default location
            default_path = os.path.join(os.path.dirname(self.metrics_file), 'focus_vs_time.png')
            os.makedirs(os.path.dirname(default_path), exist_ok=True)
            plt.savefig(default_path)
            plt.close()
            return f"Plot saved to {default_path}"

    def plot_topic_distribution(self, output_file=None):
        """
        Generate a pie chart of topic distribution.

        Args:
            output_file (str, optional): Path to save the plot

        Returns:
            str: Path to saved plot or message
        """
        topic_dist = self.get_topic_distribution()

        if not topic_dist:
            return "No completed resources available for topic distribution"

        # Sort topics by count and take top 10
        sorted_topics = sorted(topic_dist.items(), key=lambda x: x[1], reverse=True)
        top_topics = sorted_topics[:10] if len(sorted_topics) > 10 else sorted_topics

        # Combine remaining topics if there are more than 10
        if len(sorted_topics) > 10:
            other_count = sum(count for _, count in sorted_topics[10:])
            top_topics.append(("Other", other_count))

        # Extract labels and sizes
        labels = [topic for topic, _ in top_topics]
        sizes = [count for _, count in top_topics]

        # Plot
        plt.figure(figsize=(10, 8))
        plt.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=140,
               shadow=False, explode=[0.05] * len(labels))
        plt.axis('equal')
        plt.title('Topic Distribution of Completed Resources')
        plt.tight_layout()

        # Save the plot
        if output_file:
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            plt.savefig(output_file)
            plt.close()
            return f"Plot saved to {output_file}"
        else:
            # Default location
            default_path = os.path.join(os.path.dirname(self.metrics_file), 'topic_distribution.png')
            os.makedirs(os.path.dirname(default_path), exist_ok=True)
            plt.savefig(default_path)
            plt.close()
            return f"Plot saved to {default_path}"

def main():
    """Main function to handle command-line interface."""
    parser = argparse.ArgumentParser(description="Analyze learning progress")

    # Base paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    default_resource_path = os.path.join(base_dir, "knowledge-base", "resources", "resources.json")
    default_metrics_path = os.path.join(base_dir, "progress-tracking", "metrics.xlsx")

    parser.add_argument("--resource-file", default=default_resource_path,
                       help="Path to resources JSON file")
    parser.add_argument("--metrics-file", default=default_metrics_path,
                       help="Path to metrics Excel file")

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Add metrics command
    add_parser = subparsers.add_parser("add", help="Add daily metrics")
    add_parser.add_argument("--date", default=datetime.now().strftime("%Y-%m-%d"),
                           help="Date (YYYY-MM-DD format)")
    add_parser.add_argument("--hours", type=float, required=True,
                           help="Hours spent studying")
    add_parser.add_argument("--topics", required=True,
                           help="Comma-separated list of topics studied")
    add_parser.add_argument("--focus", type=int, required=True,
                           help="Focus score (1-10)")
    add_parser.add_argument("--notes", default="",
                           help="Additional notes")

    # Generate report command
    report_parser = subparsers.add_parser("report", help="Generate weekly report")
    report_parser.add_argument("--output",
                              help="Path to save the report (default: progress-tracking/weekly-reviews/YYYY-MM-DD_report.md)")

    # Plot study time trend command
    plot_parser = subparsers.add_parser("plot", help="Generate plots")
    plot_parser.add_argument("--type", choices=["time", "focus", "topics"], default="time",
                            help="Type of plot to generate")
    plot_parser.add_argument("--days", type=int, default=30,
                            help="Number of days to include in the plot")
    plot_parser.add_argument("--output",
                            help="Path to save the plot")

    # Parse arguments
    args = parser.parse_args()

    # Initialize analyzer
    analyzer = ProgressAnalyzer(args.resource_file, args.metrics_file)

    # Execute command
    if args.command == "add":
        try:
            success = analyzer.add_daily_metrics(
                args.date, args.hours, args.topics, args.focus, args.notes
            )
            if success:
                print(f"Added metrics for {args.date}: {args.hours} hours, focus score {args.focus}")
        except ValueError as e:
            print(f"Error: {e}")

    elif args.command == "report":
        # Default output path if not specified
        if not args.output:
            report_dir = os.path.join(base_dir, "progress-tracking", "weekly-reviews")
            os.makedirs(report_dir, exist_ok=True)
            args.output = os.path.join(report_dir, f"{datetime.now().strftime('%Y-%m-%d')}_report.md")

        report = analyzer.generate_weekly_report(args.output)
        print(f"Report generated and saved to {args.output}")

        # Also generate plots for the report
        time_plot = analyzer.plot_study_time_trend()
        focus_plot = analyzer.plot_focus_vs_time()
        topic_plot = analyzer.plot_topic_distribution()

        print(f"Generated supporting plots:")
        print(f"- {time_plot}")
        print(f"- {focus_plot}")
        print(f"- {topic_plot}")

    elif args.command == "plot":
        if args.type == "time":
            result = analyzer.plot_study_time_trend(args.days, args.output)
        elif args.type == "focus":
            result = analyzer.plot_focus_vs_time(args.days, args.output)
        elif args.type == "topics":
            result = analyzer.plot_topic_distribution(args.output)

        print(result)

    else:
        parser.print_help()

if __name__ == "__main__":
    main()