# Progress Analytics

This directory contains the analytics features for the learning platform, providing comprehensive visualizations and reporting tools to help users track and optimize their learning journey.

## Overview

The Progress Analytics section offers detailed insights into various aspects of the learning process:

- Study time patterns and focus scores
- Resource completion statistics
- Knowledge retention metrics
- Learning path progress
- Weekly reports generation

## Components

### Analytics Hub

The main analytics page (`page.tsx`) serves as a central hub for accessing different analytics modules. It provides:

- Quick access cards to specialized analytics views
- Tab-based navigation between different analytics sections
- Clear descriptions of each analytics module's purpose

### Study Time Analytics

The Study Time Analytics page (`study-time/page.tsx`) visualizes study patterns and focus scores:

- Interactive date range selection (7/30/90 days or custom range)
- Study hours trend visualization with line charts
- Focus score tracking over time
- Topic distribution analysis with bar charts
- Weekly pattern analysis with radar charts
- Time of day distribution with doughnut charts
- Detailed metrics table for all study sessions

### Resource Completion Analytics

The Resource Analytics page (`resources/page.tsx`) tracks progress through learning resources:

- Resource completion statistics by type (articles, videos, courses, books)
- Monthly completion rate visualization
- Topic and difficulty distribution analysis
- Estimated time to complete remaining resources
- Recent completions list with details

### Weekly Report Generation

The Report Generation page (`reports/generate/page.tsx`) creates detailed weekly reports:

- Week selection with intuitive navigation
- Comprehensive weekly statistics (total hours, average focus)
- Daily breakdown of study hours and focus scores
- Topic distribution analysis
- Comparison to previous week's performance
- Visualizations with embedded charts
- Export options for sharing and archiving

## Implementation Details

### Data Visualization

- **Chart.js**: Used for all interactive charts with the react-chartjs-2 wrapper
- **Multiple Chart Types**: Line, bar, radar, and doughnut charts for different data types
- **Interactive Elements**: Tooltips, hover effects, and dynamic filtering
- **Responsive Design**: All charts and layouts adapt to different screen sizes

### Data Processing

- **Date Handling**: Comprehensive date manipulation with date-fns
- **Aggregation**: Data aggregation for different time periods and categories
- **Filtering**: Dynamic filtering based on user selections
- **Calculations**: Derived metrics like completion percentages and time estimates

### User Experience

- **Loading States**: Clear loading indicators during data fetching
- **Empty States**: Helpful messages when no data is available
- **Interactive Controls**: Intuitive controls for date ranges and filters
- **Consistent Design**: Unified card-based layout across all analytics pages

## API Integration

The analytics components interact with several backend endpoints:

- `/api/progress/metrics`: Study time and focus data
- `/api/progress/metrics/recent`: Recent metrics summary
- `/api/resources/statistics`: Resource completion statistics
- `/api/reviews/statistics`: Knowledge retention metrics
- `/api/learning-path/progress`: Learning path progress data
- `/api/progress/report/weekly`: Weekly report generation

## Future Enhancements

Planned improvements for the analytics section:

- **Goal Tracking**: Visualize progress toward learning goals
- **Predictive Analytics**: Suggest optimal study patterns based on past performance
- **Comparative Analytics**: Compare performance across different time periods
- **Custom Reports**: Allow users to create custom reports with selected metrics
- **Data Export**: Additional export formats for reports and raw data
- **Social Sharing**: Share progress and achievements on social platforms