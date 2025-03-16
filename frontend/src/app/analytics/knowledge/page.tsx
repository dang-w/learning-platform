'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/cards';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { format, subDays, parseISO } from 'date-fns';
import { CalendarIcon, ArrowPathIcon, ChevronLeftIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import apiClient from '@/lib/api/client';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler
);

// Date range options
type DateRange = '7days' | '30days' | '90days' | 'custom';

// Types for knowledge retention data
interface ReviewSession {
  id: string;
  date: string;
  topics: string[];
  confidence: number;
  notes: string;
}

interface ConceptStats {
  total_concepts: number;
  mastered_concepts: number;
  learning_concepts: number;
  new_concepts: number;
  average_confidence: number;
  review_sessions_count: number;
  topic_distribution: Record<string, number>;
  confidence_over_time: {
    date: string;
    average_confidence: number;
  }[];
  retention_rate: number;
}

export default function KnowledgeRetentionAnalyticsPage() {
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

  // Fetch review sessions for the selected date range
  const { data: reviewSessions = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: ['reviewSessions', startDate, endDate],
    queryFn: async () => {
      const response = await apiClient.get<ReviewSession[]>(`/api/progress/reviews?start_date=${startDate}&end_date=${endDate}`);
      return response.data;
    },
  });

  // Fetch concept statistics
  const { data: conceptStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['conceptStats'],
    queryFn: async () => {
      const response = await apiClient.get<ConceptStats>('/api/reviews/statistics');
      return response.data;
    },
  });

  // Process data for confidence over time chart
  const confidenceData: ChartData<'line'> = {
    labels: conceptStats?.confidence_over_time?.map(item => format(parseISO(item.date), 'MMM dd')) || [],
    datasets: [
      {
        label: 'Average Confidence',
        data: conceptStats?.confidence_over_time?.map(item => item.average_confidence) || [],
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  // Process data for topic distribution chart
  const topicDistributionData: ChartData<'bar'> = {
    labels: conceptStats?.topic_distribution ? Object.keys(conceptStats.topic_distribution) : [],
    datasets: [
      {
        label: 'Number of Concepts',
        data: conceptStats?.topic_distribution ? Object.values(conceptStats.topic_distribution) : [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(236, 72, 153, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(239, 68, 68, 0.7)',
        ],
      },
    ],
  };

  // Process data for concept status chart
  const conceptStatusData: ChartData<'doughnut'> = {
    labels: ['Mastered', 'Learning', 'New'],
    datasets: [
      {
        data: [
          conceptStats?.mastered_concepts || 0,
          conceptStats?.learning_concepts || 0,
          conceptStats?.new_concepts || 0,
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(245, 158, 11, 0.7)',
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(59, 130, 246)',
          'rgb(245, 158, 11)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
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
        min: 0,
        max: 10,
        title: {
          display: true,
          text: 'Confidence Level',
        },
      },
    },
  };

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
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

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  const isLoading = isLoadingReviews || isLoadingStats;

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
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center">
            <CalendarIcon className="w-5 h-5 text-gray-500 mr-2" />
            <span className="font-medium">Date Range:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDateRange('7days')}
              className={`px-3 py-1 rounded-md ${
                dateRange === '7days'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateRange('30days')}
              className={`px-3 py-1 rounded-md ${
                dateRange === '30days'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setDateRange('90days')}
              className={`px-3 py-1 rounded-md ${
                dateRange === '90days'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              90 Days
            </button>
            <button
              onClick={() => setDateRange('custom')}
              className={`px-3 py-1 rounded-md ${
                dateRange === 'custom'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Custom
            </button>
          </div>
          {dateRange === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1 border rounded-md"
              />
              <span className="self-center">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1 border rounded-md"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Concepts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{conceptStats?.total_concepts || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Average Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{conceptStats?.average_confidence?.toFixed(1) || 0}/10</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Review Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{conceptStats?.review_sessions_count || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Retention Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{conceptStats?.retention_rate ? `${(conceptStats.retention_rate * 100).toFixed(1)}%` : '0%'}</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Confidence Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Line data={confidenceData} options={lineOptions} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Concept Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex justify-center">
                  <div className="w-3/4">
                    <Doughnut data={conceptStatusData} options={doughnutOptions} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between text-sm text-gray-500">
                <div>Mastered: {conceptStats?.mastered_concepts || 0}</div>
                <div>Learning: {conceptStats?.learning_concepts || 0}</div>
                <div>New: {conceptStats?.new_concepts || 0}</div>
              </CardFooter>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Topic Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar data={topicDistributionData} options={barOptions} />
              </div>
            </CardContent>
          </Card>

          {/* Recent Review Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Review Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {reviewSessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Topics</th>
                        <th className="text-left py-3 px-4">Confidence</th>
                        <th className="text-left py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewSessions.map((session) => (
                        <tr key={session.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{format(parseISO(session.date), 'MMM dd, yyyy')}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {session.topics.map((topic, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <span className="font-medium">{session.confidence}/10</span>
                              <div className="ml-2 w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${(session.confidence / 10) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">{session.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AcademicCapIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p>No review sessions found for the selected date range.</p>
                  <p className="mt-2">Start reviewing concepts to track your knowledge retention.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}