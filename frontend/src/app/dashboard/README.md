# Dashboard Data Visualization

This directory contains the dashboard page for the learning platform, which has been enhanced with interactive data visualizations to provide users with insights into their learning progress, study habits, and knowledge management.

## Components

### Core Dashboard Components

- **LearningProgress**: Displays a doughnut chart showing the completion status of learning resources.
- **ResourceStats**: Shows a bar chart of resource statistics by type (articles, videos, courses, books).
- **ActivityFeed**: Displays recent learning activities with icons and timestamps.
- **QuickActions**: Provides quick access to common actions like adding resources or starting reviews.

### Enhanced Data Visualization Components

- **StudyMetrics**: Visualizes study hours and focus scores over time, with interactive time range selection.
  - Line charts for study hours and focus scores
  - Bar chart for top studied topics
  - Summary statistics (total hours, average focus, streak)

- **ReviewStats**: Displays statistics about knowledge concept reviews.
  - Line chart for confidence trend over time
  - Doughnut charts for concept status distribution and topic distribution
  - Toggle between viewing concepts by status or by topic

- **LearningPathProgress**: Shows progress on learning paths with horizontal bar charts.
  - Visual indication of completion percentage for each path
  - List of next resources to study in each path
  - Completion status indicators

## Implementation Details

### Technologies Used

- **Chart.js**: Core charting library
- **react-chartjs-2**: React wrapper for Chart.js
- **TanStack Query**: Data fetching and caching
- **Tailwind CSS**: Styling and responsive design

### Data Flow

1. The dashboard page fetches data from various API endpoints
2. Data is processed and transformed for visualization
3. Charts are rendered with appropriate configurations
4. Interactive elements allow users to filter and explore their data

### Responsive Design

- Charts automatically resize based on viewport size
- Grid layout adjusts from 1 column on mobile to 3 columns on desktop
- Loading states with spinners for better user experience

## API Endpoints

The dashboard components interact with the following API endpoints:

- `/api/resources/statistics`: Resource completion statistics
- `/api/resources/stats`: Resource type statistics
- `/api/progress`: Learning progress data
- `/api/progress/metrics`: Study metrics data
- `/api/progress/metrics/recent`: Recent metrics summary
- `/api/reviews/statistics`: Review and concept statistics
- `/api/learning-path/progress`: Learning path progress data

## Future Enhancements

- Add export functionality for charts and data
- Implement more advanced filtering options
- Add predictive analytics for study recommendations
- Create printable/shareable reports
- Add goal tracking visualizations