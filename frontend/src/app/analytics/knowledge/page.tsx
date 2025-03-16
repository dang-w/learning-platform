'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/cards';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { format, subDays, parseISO } from 'date-fns';
import { ArrowPathIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import reviewsApi from '@/lib/api/reviews';
import progressApi from '@/lib/api/progress';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

// Date range options
type DateRange = '7days' | '30days' | '90days' | 'custom';

// Define a review session type for our analytics
interface ReviewSessionAnalytics {
  date: string;
  confidence: number;
  topics: string[];
}

export default function KnowledgeAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Update date range when selection changes
  useEffect(() => {
    const today = new Date();

    switch (dateRange) {
      case '7days':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case '30days':
        setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case '90days':
        setStartDate(format(subDays(today, 90), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      // For custom range, don't update dates automatically
    }
  }, [dateRange]);

  // Fetch review statistics
  const { data: reviewStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['reviewStats'],
    queryFn: () => reviewsApi.getReviewStatistics(),
  });

  // Fetch concepts
  const { data: concepts = [], isLoading: isLoadingConcepts } = useQuery({
    queryKey: ['concepts'],
    queryFn: () => reviewsApi.getConcepts(),
  });

  // Fetch review sessions
  const { data: reviewSessions = [], isLoading: isLoadingReviews } = useQuery<ReviewSessionAnalytics[]>({
    queryKey: ['reviewSessions', startDate, endDate],
    queryFn: async () => {
      // For this demo, we'll generate mock review session data based on date range
      // In a real app, you would call an API endpoint that returns review sessions for the date range
      const response = await progressApi.getMetrics(startDate, endDate);
      // Transform metrics into review sessions for visualization
      return response.map(metric => ({
        date: metric.date,
        confidence: Math.min(Math.round(metric.focus_score * 0.8), 10), // Convert focus score to confidence
        topics: metric.topics.split(',').map(t => t.trim()).filter(Boolean),
      }));
    },
  });

  const isLoading = isLoadingStats || isLoadingConcepts || isLoadingReviews;

  // Process data for confidence trend chart
  const confidenceTrendData: ChartData<'line'> = {
    labels: reviewSessions.map(session => format(parseISO(session.date), 'MMM dd')),
    datasets: [
      {
        label: 'Average Confidence',
        data: reviewSessions.map(session => session.confidence),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  // Process topic distribution data
  const topicData = concepts.reduce((acc: Record<string, number>, concept) => {
    concept.topics.forEach(topic => {
      if (topic) {
        acc[topic] = (acc[topic] || 0) + 1;
      }
    });
    return acc;
  }, {});

  // Sort topics by concept count (descending)
  const sortedTopics = Object.entries(topicData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8); // Limit to top 8 topics

  const topicChartData: ChartData<'bar'> = {
    labels: sortedTopics.map(([topic]) => topic),
    datasets: [
      {
        label: 'Number of Concepts',
        data: sortedTopics.map(([, count]) => count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(239, 68, 68, 0.7)',
          'rgba(236, 72, 153, 0.7)',
          'rgba(79, 70, 229, 0.7)',
          'rgba(14, 165, 233, 0.7)',
        ],
      },
    ],
  };

  // Process retention status data
  const retentionStatusData: ChartData<'doughnut'> = {
    labels: ['Well Retained', 'Needs Review', 'New Concepts'],
    datasets: [
      {
        data: [
          reviewStats?.reviewed_concepts || 0,
          reviewStats?.due_reviews || 0,
          reviewStats?.new_concepts || 0,
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)', // green
          'rgba(245, 158, 11, 0.7)', // amber
          'rgba(59, 130, 246, 0.7)', // blue
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(59, 130, 246)',
        ],
      },
    ],
  };

  // Chart options
  const lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        title: {
          display: true,
          text: 'Confidence Level (1-10)',
        },
      },
    },
  };

  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Concepts',
        },
      },
    },
  };

  const doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/analytics" className="text-gray-500 hover:text-gray-700">
              <ChevronLeftIcon className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">Knowledge Retention Analytics</h1>
          </div>
          <p className="text-gray-500 mt-2">
            Track your knowledge growth and retention through spaced repetition
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          {dateRange === 'custom' && (
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Confidence Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <Line data={confidenceTrendData} options={lineChartOptions} />
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle>Retention Status</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <Doughnut data={retentionStatusData} options={doughnutChartOptions} />
            </CardContent>
          </Card>

          <Card className="h-full lg:col-span-2">
            <CardHeader>
              <CardTitle>Concepts by Topic</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <Bar data={topicChartData} options={barChartOptions} />
            </CardContent>
          </Card>

          <Card className="h-full lg:col-span-2">
            <CardHeader>
              <CardTitle>Knowledge Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Total Concepts</p>
                  <p className="text-3xl font-bold">{reviewStats?.total_concepts || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Well Retained</p>
                  <p className="text-3xl font-bold">{reviewStats?.reviewed_concepts || 0}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <p className="text-sm text-amber-600 font-medium">Due for Review</p>
                  <p className="text-3xl font-bold">{reviewStats?.due_reviews || 0}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Average Confidence</p>
                  <p className="text-3xl font-bold">{reviewStats?.average_confidence?.toFixed(1) || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}