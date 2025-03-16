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

# Add these models for study sessions and reviews
class StudySessionBase(BaseModel):
    date: str
    duration: int
    topics: List[str]
    resources: List[Dict[str, Any]] = []
    notes: Optional[str] = ""

class StudySessionCreate(StudySessionBase):
    pass

class StudySession(StudySessionBase):
    id: str

class ReviewSessionBase(BaseModel):
    date: str
    topics: List[str]
    resources: List[Dict[str, Any]] = []
    confidence: int
    notes: Optional[str] = ""

class ReviewSessionCreate(ReviewSessionBase):
    pass

class ReviewSession(ReviewSessionBase):
    id: str

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
    metric_dict = metric.model_dump()
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

# Add these routes for study sessions, reviews, and progress summary
@router.post("/study-session", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def add_study_session(
    session: StudySessionCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Add a study session."""
    # Check if user exists
    user = await db.users.find_one({"username": current_user.username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Create session object
    session_dict = session.model_dump()
    session_dict["id"] = f"session_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # Add to user's study sessions
    try:
        result = await db.users.update_one(
            {"username": current_user.username},
            {"$push": {"study_sessions": session_dict}}
        )

        if result.modified_count == 0:
            # If the study_sessions array doesn't exist yet, create it
            result = await db.users.update_one(
                {"username": current_user.username},
                {"$set": {"study_sessions": [session_dict]}}
            )

            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to add study session"
                )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add study session: {str(e)}"
        )

    return session_dict

@router.get("/", response_model=Dict[str, List])
async def get_progress(current_user: User = Depends(get_current_active_user)):
    """Get all progress data for the current user."""
    user = await db.users.find_one({"username": current_user.username})
    if not user:
        return {"metrics": [], "reviews": []}

    # Return metrics and reviews
    return {
        "metrics": user.get("metrics", []),
        "reviews": user.get("review_sessions", [])
    }

@router.get("/study-sessions", response_model=List[Dict[str, Any]])
async def get_study_sessions_alt(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    date: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Alternative endpoint for getting study sessions with optional date filtering."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "study_sessions" not in user:
        return []

    sessions = user["study_sessions"]

    # Filter by specific date if provided
    if date:
        filtered_sessions = []
        for session in sessions:
            session_date = session.get("date", "")
            if session_date.startswith(date):
                filtered_sessions.append(session)
        return filtered_sessions

    # Filter by date range if specified
    if start_date or end_date:
        filtered_sessions = []
        for session in sessions:
            session_date = session.get("date", "")

            if start_date and session_date < start_date:
                continue

            if end_date and session_date > end_date:
                continue

            filtered_sessions.append(session)

        return filtered_sessions

    return sessions

@router.post("/review", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def add_review_session(
    session: ReviewSessionCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Add a review session."""
    # Check if user exists
    user = await db.users.find_one({"username": current_user.username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Create session object
    session_dict = session.model_dump()
    session_dict["id"] = f"review_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # Add to user's review sessions
    try:
        result = await db.users.update_one(
            {"username": current_user.username},
            {"$push": {"review_sessions": session_dict}}
        )

        if result.modified_count == 0:
            # If the review_sessions array doesn't exist yet, create it
            result = await db.users.update_one(
                {"username": current_user.username},
                {"$set": {"review_sessions": [session_dict]}}
            )

            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to add review session"
                )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add review session: {str(e)}"
        )

    return session_dict

@router.get("/reviews", response_model=List[Dict[str, Any]])
async def get_review_sessions_alt(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Alternative endpoint for getting review sessions with optional date filtering."""
    return await get_review_sessions(start_date, end_date, current_user)

@router.get("/review", response_model=List[Dict[str, Any]])
async def get_review_sessions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get review sessions with optional date filtering."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "review_sessions" not in user:
        return []

    sessions = user["review_sessions"]

    # Filter by date range if specified
    if start_date or end_date:
        filtered_sessions = []
        for session in sessions:
            session_date = session.get("date", "")

            if start_date and session_date < start_date:
                continue

            if end_date and session_date > end_date:
                continue

            filtered_sessions.append(session)

        return filtered_sessions

    return sessions

@router.get("/summary", response_model=Dict[str, Any])
async def get_progress_summary(
    current_user: User = Depends(get_current_active_user)
):
    """Get a summary of the user's progress."""
    user = await db.users.find_one({"username": current_user.username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Initialize summary
    summary = {
        "total_study_time": 0,
        "study_time": {
            "total_hours": 0,
            "last_7_days": 0,
            "last_30_days": 0
        },
        "consistency": {
            "streak": 0,
            "days_studied_last_30": 0
        },
        "topics": [],
        "average_confidence": 0
    }

    # Calculate study time
    study_sessions = user.get("study_sessions", [])
    now = datetime.now()

    for session in study_sessions:
        duration = session.get("duration", 0)
        summary["total_study_time"] += duration

        # Convert to hours for the summary
        hours = duration / 60
        summary["study_time"]["total_hours"] += hours

        # Check if session is within last 7 or 30 days
        try:
            session_date = datetime.fromisoformat(session.get("date", ""))
            days_ago = (now - session_date).days

            if days_ago <= 7:
                summary["study_time"]["last_7_days"] += hours

            if days_ago <= 30:
                summary["study_time"]["last_30_days"] += hours
        except (ValueError, TypeError):
            # Skip if date is invalid
            pass

    # Calculate topics
    all_topics = {}
    for session in study_sessions:
        for topic in session.get("topics", []):
            if topic in all_topics:
                all_topics[topic] += 1
            else:
                all_topics[topic] = 1

    # Get top topics
    summary["topics"] = [
        {"name": topic, "count": count}
        for topic, count in sorted(all_topics.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    # Calculate average confidence from review sessions
    review_sessions = user.get("review_sessions", [])
    if review_sessions:
        total_confidence = sum(session.get("confidence", 0) for session in review_sessions)
        summary["average_confidence"] = total_confidence / len(review_sessions)

    # Calculate consistency
    # This is a simplified version - could be more sophisticated
    study_dates = set()
    for session in study_sessions:
        try:
            date_str = datetime.fromisoformat(session.get("date", "")).strftime("%Y-%m-%d")
            study_dates.add(date_str)
        except (ValueError, TypeError):
            pass

    # Count days studied in last 30 days
    last_30_days = set()
    for i in range(30):
        date_str = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        if date_str in study_dates:
            last_30_days.add(date_str)

    summary["consistency"]["days_studied_last_30"] = len(last_30_days)

    # Calculate streak (simplified)
    streak = 0
    for i in range(30):
        date_str = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        if date_str in study_dates:
            streak += 1
        else:
            break

    summary["consistency"]["streak"] = streak

    return summary

@router.get("/recommended-reviews", response_model=List[Dict[str, Any]])
async def get_recommended_reviews(
    current_user: User = Depends(get_current_active_user)
):
    """Get topics recommended for review based on study history."""
    user = await db.users.find_one({"username": current_user.username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    study_sessions = user.get("study_sessions", [])
    if not study_sessions:
        return []

    # Group sessions by topic and find the oldest session for each topic
    topics = {}
    now = datetime.now()

    for session in study_sessions:
        session_date_str = session.get("date", "")
        try:
            session_date = datetime.fromisoformat(session_date_str)
            days_since = (now - session_date).days

            for topic in session.get("topics", []):
                if topic not in topics or days_since > topics[topic]["days_since"]:
                    topics[topic] = {
                        "topic": topic,
                        "days_since": days_since,
                        "last_studied": session_date_str
                    }
        except (ValueError, TypeError):
            # Skip if date is invalid
            pass

    # Sort by days since last studied (descending)
    recommendations = sorted(
        topics.values(),
        key=lambda x: x["days_since"],
        reverse=True
    )

    # Only recommend topics that haven't been studied in at least 7 days
    return [r for r in recommendations if r["days_since"] >= 7]

@router.get("/study-session", response_model=List[Dict[str, Any]])
async def get_study_sessions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get study sessions with optional date filtering."""
    user = await db.users.find_one({"username": current_user.username})
    if not user or "study_sessions" not in user:
        return []

    sessions = user["study_sessions"]

    # Filter by date range if specified
    if start_date or end_date:
        filtered_sessions = []
        for session in sessions:
            session_date = session.get("date", "")

            if start_date and session_date < start_date:
                continue

            if end_date and session_date > end_date:
                continue

            filtered_sessions.append(session)

        return filtered_sessions

    return sessions