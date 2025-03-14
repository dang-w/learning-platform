from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import io
import base64
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import os
from dotenv import load_dotenv
import motor.motor_asyncio

# Load environment variables
load_dotenv()

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.learning_platform_db

# Create router
router = APIRouter()

# Import authentication functions from main
# This will be imported in main.py after the router is created
# to avoid circular imports
from main import get_current_active_user, User

# Models
class MetricBase(BaseModel):
    date: str
    study_hours: float
    topics: str
    focus_score: int
    notes: Optional[str] = ""

class MetricCreate(MetricBase):
    pass

class Metric(MetricBase):
    id: str

class WeeklyReport(BaseModel):
    report_content: str
    time_plot_url: Optional[str] = None
    focus_plot_url: Optional[str] = None
    topic_plot_url: Optional[str] = None

# Helper functions
def fig_to_base64(fig):
    """Convert matplotlib figure to base64 string for embedding in HTML/frontend."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png')
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return f"data:image/png;base64,{img_str}"

# Routes
@router.post("/metrics", response_model=Metric, status_code=status.HTTP_201_CREATED)
async def add_daily_metrics(
    metric: MetricCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Add daily study metrics."""
    # Validate date format
    try:
        date = datetime.strptime(metric.date, "%Y-%m-%d").strftime("%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date must be in YYYY-MM-DD format"
        )

    # Validate study hours
    if not (0 < metric.study_hours < 24):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Study hours must be between 0 and 24"
        )

    # Validate focus score
    if not (1 <= metric.focus_score <= 10):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Focus score must be between 1 and 10"
        )

    # Create metric object
    metric_dict = metric.dict()
    metric_dict["id"] = f"{date}_{datetime.now().strftime('%H%M%S')}"

    # Check if entry for this date already exists
    user = await db.users.find_one({"username": current_user.username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    metrics = user.get("metrics", [])
    existing_metrics = [m for m in metrics if m.get("date") == date]

    if existing_metrics:
        # Update existing entry
        existing = existing_metrics[0]
        existing["study_hours"] += metric.study_hours

        # Combine topics
        existing_topics = set(existing["topics"].split(','))
        new_topics = set(metric.topics.split(','))
        combined_topics = ','.join(existing_topics.union(new_topics))
        existing["topics"] = combined_topics

        # Update focus score (average)
        existing["focus_score"] = (existing["focus_score"] + metric.focus_score) / 2

        # Append notes
        if metric.notes:
            if existing.get("notes"):
                existing["notes"] = f"{existing['notes']}; {metric.notes}"
            else:
                existing["notes"] = metric.notes

        # Save updated metrics
        result = await db.users.update_one(
            {"username": current_user.username},
            {"$set": {"metrics": metrics}}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update metrics"
            )

        return existing
    else:
        # Add new entry
        result = await db.users.update_one(
            {"username": current_user.username},
            {"$push": {"metrics": metric_dict}}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add metrics"
            )

        return metric_dict

@router.get("/metrics", response_model=List[Metric])
async def get_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get study metrics with optional date filtering."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "metrics" not in user:
        return []

    metrics = user["metrics"]

    # Filter by date range if specified
    if start_date or end_date:
        filtered_metrics = []
        for metric in metrics:
            metric_date = metric.get("date", "")

            if start_date and metric_date < start_date:
                continue

            if end_date and metric_date > end_date:
                continue

            filtered_metrics.append(metric)

        return filtered_metrics

    return metrics

@router.get("/metrics/recent", response_model=Dict[str, Any])
async def get_recent_metrics(
    days: int = 7,
    current_user: User = Depends(get_current_active_user)
):
    """Get metrics summary for the last N days."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "metrics" not in user:
        return {
            "total_hours": 0,
            "avg_focus": 0,
            "study_days": 0,
            "consistency": 0,
            "top_topics": []
        }

    metrics = user["metrics"]

    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    start_date_str = start_date.strftime("%Y-%m-%d")

    # Filter metrics by date
    recent_metrics = [
        m for m in metrics
        if m.get("date", "") >= start_date_str
    ]

    if not recent_metrics:
        return {
            "total_hours": 0,
            "avg_focus": 0,
            "study_days": 0,
            "consistency": 0,
            "top_topics": []
        }

    # Calculate statistics
    total_hours = sum(m.get("study_hours", 0) for m in recent_metrics)
    avg_focus = sum(m.get("focus_score", 0) for m in recent_metrics) / len(recent_metrics)
    study_days = len(set(m.get("date", "") for m in recent_metrics))
    consistency = (study_days / days) * 100

    # Count topic frequency
    topic_freq = {}
    for metric in recent_metrics:
        topics = metric.get("topics", "").split(',')
        for topic in topics:
            topic = topic.strip()
            if topic:
                topic_freq[topic] = topic_freq.get(topic, 0) + 1

    # Get top topics
    sorted_topics = sorted(topic_freq.items(), key=lambda x: x[1], reverse=True)
    top_topics = sorted_topics[:5] if len(sorted_topics) > 5 else sorted_topics

    return {
        "total_hours": total_hours,
        "avg_focus": avg_focus,
        "study_days": study_days,
        "consistency": consistency,
        "top_topics": [{"topic": t[0], "count": t[1]} for t in top_topics]
    }

@router.get("/report/weekly", response_model=WeeklyReport)
async def generate_weekly_report(
    current_user: User = Depends(get_current_active_user)
):
    """Generate a weekly learning progress report with visualizations."""
    user = await db.users.find_one({"username": current_user.username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Get user data
    metrics = user.get("metrics", [])
    resources = user.get("resources", {})

    # Calculate date range for the week
    now = datetime.now()
    week_start = (now - timedelta(days=7)).strftime('%Y-%m-%d')
    week_end = now.strftime('%Y-%m-%d')

    # Filter metrics for the week
    weekly_metrics = [m for m in metrics if week_start <= m.get("date", "") <= week_end]

    # Calculate metrics
    study_time_week = sum(m.get("study_hours", 0) for m in weekly_metrics)

    # Count completed resources
    total_resources = 0
    completed_resources = 0
    for resource_type in resources:
        for resource in resources[resource_type]:
            total_resources += 1
            if resource.get("completed", False):
                completed_resources += 1

    completion_rate = (completed_resources / total_resources * 100) if total_resources > 0 else 0

    # Get topic distribution from resources
    topic_count = {}
    for resource_type in resources:
        for resource in resources[resource_type]:
            if resource.get("completed", False):
                for topic in resource.get("topics", []):
                    topic_count[topic] = topic_count.get(topic, 0) + 1

    sorted_topics = sorted(topic_count.items(), key=lambda x: x[1], reverse=True)
    top_topics = sorted_topics[:5] if len(sorted_topics) > 5 else sorted_topics

    # Get recent topics from metrics
    recent_topics = {}
    for metric in weekly_metrics:
        topics = metric.get("topics", "").split(',')
        for topic in topics:
            topic = topic.strip()
            if topic:
                recent_topics[topic] = recent_topics.get(topic, 0) + 1

    sorted_recent = sorted(recent_topics.items(), key=lambda x: x[1], reverse=True)
    top_recent = sorted_recent[:5] if len(sorted_recent) > 5 else sorted_recent

    # Generate report content
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

    # Analyze study patterns
    if metrics:
        # Convert to pandas for analysis
        df = pd.DataFrame(metrics)
        df['date'] = pd.to_datetime(df['date'])

        # Filter to last 30 days
        last_30_days = now - timedelta(days=30)
        recent_df = df[df['date'] >= last_30_days.strftime('%Y-%m-%d')]

        if not recent_df.empty:
            # Study consistency
            study_days = recent_df['date'].nunique()
            consistency = (study_days / 30) * 100
            report += f"- Study consistency: {consistency:.1f}% of days\n"

            # Average daily study time
            avg_daily = recent_df.groupby('date')['study_hours'].sum().mean()
            report += f"- Average daily study time: {avg_daily:.2f} hours\n"

            # Average focus score
            avg_focus = recent_df['focus_score'].mean()
            report += f"- Average focus score: {avg_focus:.1f}/10\n"
        else:
            report += "Insufficient data for pattern analysis.\n"
    else:
        report += "No study data available for pattern analysis.\n"

    report += "\n## Recommendations\n"

    # Generate recommendations
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

    # Generate plots
    time_plot_url = None
    focus_plot_url = None
    topic_plot_url = None

    if metrics:
        # Study time trend plot
        try:
            df = pd.DataFrame(metrics)
            df['date'] = pd.to_datetime(df['date'])

            # Filter to last 30 days
            last_30_days = now - timedelta(days=30)
            df = df[df['date'] >= last_30_days.strftime('%Y-%m-%d')]

            if not df.empty:
                # Create date range for all days
                date_range = pd.date_range(start=last_30_days, end=now)
                date_df = pd.DataFrame({'date': date_range})

                # Merge to include all days
                df_merged = pd.merge(date_df, df, on='date', how='left')
                df_merged['study_hours'] = df_merged['study_hours'].fillna(0)

                # Group by date and sum study hours
                daily_hours = df_merged.groupby('date')['study_hours'].sum()

                # Plot
                fig, ax = plt.subplots(figsize=(10, 5))
                daily_hours.plot(kind='bar', ax=ax, color='skyblue')
                plt.title('Daily Study Hours - Last 30 Days')
                plt.xlabel('Date')
                plt.ylabel('Hours')
                plt.xticks(rotation=45)
                plt.tight_layout()

                # Add 7-day moving average if enough data
                if len(daily_hours) > 7:
                    rolling_avg = daily_hours.rolling(window=7).mean()
                    ax2 = ax.twinx()
                    rolling_avg.plot(ax=ax2, color='red', label='7-day average')
                    ax2.set_ylabel('7-day Average (hours)', color='red')
                    ax2.tick_params(axis='y', colors='red')
                    ax2.legend(loc='upper right')

                time_plot_url = fig_to_base64(fig)

                # Focus vs time plot
                if 'focus_score' in df.columns:
                    fig, ax = plt.subplots(figsize=(8, 5))
                    plt.scatter(df['focus_score'], df['study_hours'],
                               alpha=0.7, s=100, c=range(len(df)), cmap='viridis')

                    # Add trend line if enough data
                    if len(df) > 1:
                        z = np.polyfit(df['focus_score'], df['study_hours'], 1)
                        p = np.poly1d(z)
                        plt.plot(sorted(df['focus_score']),
                                p(sorted(df['focus_score'])),
                                "r--", alpha=0.8)

                    plt.title('Focus Score vs. Study Time - Last 30 Days')
                    plt.xlabel('Focus Score (1-10)')
                    plt.ylabel('Study Hours')
                    plt.grid(True, alpha=0.3)
                    plt.colorbar(label='Days Ago')
                    plt.tight_layout()

                    focus_plot_url = fig_to_base64(fig)
        except Exception as e:
            print(f"Error generating time plots: {e}")

    # Topic distribution plot
    if topic_count:
        try:
            # Sort topics by count and take top 10
            sorted_topics = sorted(topic_count.items(), key=lambda x: x[1], reverse=True)
            top_topics = sorted_topics[:10] if len(sorted_topics) > 10 else sorted_topics

            # Combine remaining topics if there are more than 10
            if len(sorted_topics) > 10:
                other_count = sum(count for _, count in sorted_topics[10:])
                top_topics.append(("Other", other_count))

            # Extract labels and sizes
            labels = [topic for topic, _ in top_topics]
            sizes = [count for _, count in top_topics]

            # Plot
            fig, ax = plt.subplots(figsize=(8, 6))
            plt.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=140,
                   shadow=False, explode=[0.05] * len(labels))
            plt.axis('equal')
            plt.title('Topic Distribution of Completed Resources')
            plt.tight_layout()

            topic_plot_url = fig_to_base64(fig)
        except Exception as e:
            print(f"Error generating topic plot: {e}")

    return {
        "report_content": report,
        "time_plot_url": time_plot_url,
        "focus_plot_url": focus_plot_url,
        "topic_plot_url": topic_plot_url
    }

@router.delete("/metrics/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_metric(
    metric_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a metric entry."""
    result = await db.users.update_one(
        {"username": current_user.username},
        {"$pull": {"metrics": {"id": metric_id}}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Metric with ID {metric_id} not found"
        )