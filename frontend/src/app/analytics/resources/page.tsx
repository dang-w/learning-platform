'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/cards';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { resourcesApi } from '@/lib/api/resources';
import { Resource } from '@/types/resources';
import { format, parseISO, subMonths } from 'date-fns';
import { ChevronLeftIcon, BookOpenIcon, ClockIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Define an extended Resource type that includes resource_type
interface CompletedResource extends Omit<Resource, 'type'> {
  resource_type: string;
}

// Update the ResourceStatistics interface to use the extended Resource type
export interface ResourceStatistics {
  total: number;
  completed: number;
  completion_percentage: number;
  by_type: Record<'articles' | 'videos' | 'courses' | 'books', {
    total: number;
    completed: number;
    completion_percentage: number;
  }>;
  by_difficulty: Record<'beginner' | 'intermediate' | 'advanced', {
    total: number;
    completed: number;
    completion_percentage: number;
  }>;
  by_topic: Record<string, {
    total: number;
    completed: number;
    completion_percentage: number;
  }>;
  recent_completions: CompletedResource[];
}

export default function ResourceAnalyticsPage() {
  const [selectedType, setSelectedType] = useState<'all' | 'articles' | 'videos' | 'courses' | 'books'>('all');

  // Fetch resource statistics
  const { data: stats, isLoading } = useQuery<ResourceStatistics>({
    queryKey: ['resourceStatistics'],
    queryFn: () => resourcesApi.getResourceStatistics(),
  });

  // Calculate completion rate by month (last 6 months)
  const getCompletionByMonth = () => {
    if (!stats?.recent_completions) return { labels: [] as string[], data: [] as number[] };

    const today = new Date();
    const monthLabels = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(today, i);
      return format(date, 'MMM yyyy');
    }).reverse();

    const monthCounts = Array(6).fill(0);

    stats.recent_completions.forEach(resource => {
      if (resource.completion_date) {
        const completionDate = parseISO(resource.completion_date);
        const monthsAgo = Math.floor((today.getTime() - completionDate.getTime()) / (30 * 24 * 60 * 60 * 1000));

        if (monthsAgo >= 0 && monthsAgo < 6) {
          monthCounts[5 - monthsAgo]++;
        }
      }
    });

    return {
      labels: monthLabels,
      data: monthCounts,
    };
  };

  const monthlyCompletion = getCompletionByMonth();

  // Prepare data for completion by type chart
  const completionByTypeData: ChartData<'bar'> = {
    labels: ['Articles', 'Videos', 'Courses', 'Books'],
    datasets: [
      {
        label: 'Completed',
        data: stats ? [
          stats.by_type.articles?.completed || 0,
          stats.by_type.videos?.completed || 0,
          stats.by_type.courses?.completed || 0,
          stats.by_type.books?.completed || 0,
        ] : [0, 0, 0, 0],
        backgroundColor: 'rgba(16, 185, 129, 0.7)', // green
      },
      {
        label: 'In Progress',
        data: stats ? [
          (stats.by_type.articles?.total || 0) - (stats.by_type.articles?.completed || 0),
          (stats.by_type.videos?.total || 0) - (stats.by_type.videos?.completed || 0),
          (stats.by_type.courses?.total || 0) - (stats.by_type.courses?.completed || 0),
          (stats.by_type.books?.total || 0) - (stats.by_type.books?.completed || 0),
        ] : [0, 0, 0, 0],
        backgroundColor: 'rgba(59, 130, 246, 0.7)', // blue
      },
    ],
  };

  // Prepare data for completion by difficulty chart
  const completionByDifficultyData: ChartData<'doughnut'> = {
    labels: ['Beginner', 'Intermediate', 'Advanced'],
    datasets: [
      {
        data: stats ? [
          stats.by_difficulty.beginner?.completed || 0,
          stats.by_difficulty.intermediate?.completed || 0,
          stats.by_difficulty.advanced?.completed || 0,
        ] : [0, 0, 0],
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)', // green
          'rgba(245, 158, 11, 0.7)', // amber
          'rgba(239, 68, 68, 0.7)', // red
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
        ],
      },
    ],
  };

  // Prepare data for completion by topic chart
  const getTopicData = () => {
    if (!stats?.by_topic) return { labels: [] as string[], completed: [] as number[], total: [] as number[] };

    // Get top 8 topics by total resources
    const topTopics = Object.entries(stats.by_topic)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8);

    return {
      labels: topTopics.map(([topic]) => topic),
      completed: topTopics.map(([, data]) => data.completed),
      total: topTopics.map(([, data]) => data.total),
    };
  };

  const topicData = getTopicData();

  const completionByTopicData: ChartData<'bar'> = {
    labels: topicData.labels,
    datasets: [
      {
        label: 'Completed',
        data: topicData.completed,
        backgroundColor: 'rgba(16, 185, 129, 0.7)', // green
      },
      {
        label: 'Total',
        data: topicData.total,
        backgroundColor: 'rgba(209, 213, 219, 0.7)', // gray-300
      },
    ],
  };

  // Prepare data for monthly completion chart
  const monthlyCompletionData: ChartData<'bar'> = {
    labels: monthlyCompletion.labels,
    datasets: [
      {
        label: 'Resources Completed',
        data: monthlyCompletion.data,
        backgroundColor: 'rgba(59, 130, 246, 0.7)', // blue
      },
    ],
  };

  // Chart options
  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      x: {
        stacked: false,
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Resources',
        },
      },
    },
  };

  const stackedBarChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Resources',
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

  // Calculate estimated time to complete remaining resources
  const calculateEstimatedTimeToComplete = () => {
    if (!stats) return { hours: 0, days: 0 };

    // Calculate total estimated hours for incomplete resources
    let totalHours = 0;

    // This is a simplified calculation - in a real app, you'd use actual estimated_time values
    // from each resource
    const averageTimePerResource = {
      articles: 0.5, // 30 minutes
      videos: 1, // 1 hour
      courses: 10, // 10 hours
      books: 8, // 8 hours
    };

    Object.entries(stats.by_type).forEach(([type, data]) => {
      const incompleteCount = data.total - data.completed;
      const avgTime = averageTimePerResource[type as keyof typeof averageTimePerResource] || 1;
      totalHours += incompleteCount * avgTime;
    });

    // Assuming 2 hours of study per day
    const daysToComplete = Math.ceil(totalHours / 2);

    return {
      hours: Math.round(totalHours),
      days: daysToComplete,
    };
  };

  const timeToComplete = calculateEstimatedTimeToComplete();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/analytics" className="text-blue-600 hover:text-blue-800">
              <ChevronLeftIcon className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">Resource Completion Analytics</h1>
          </div>
          <p className="text-gray-500 mt-2">
            Track your progress through different types of learning resources
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as 'all' | 'articles' | 'videos' | 'courses' | 'books')}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Resources</option>
            <option value="articles">Articles</option>
            <option value="videos">Videos</option>
            <option value="courses">Courses</option>
            <option value="books">Books</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      ) : !stats ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BookOpenIcon className="w-12 h-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No resource data available</h3>
          <p className="mt-2 text-gray-500">
            Start adding learning resources to track your progress.
          </p>
          <Link
            href="/resources/new"
            className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Resources
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Total Resources</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {stats.total}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {stats.completed} ({Math.round(stats.completion_percentage)}%)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">In Progress</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">
                    {stats.total - stats.completed}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Est. Time to Complete</p>
                  <div className="flex items-center justify-center mt-1">
                    <ClockIcon className="w-5 h-5 text-purple-600 mr-1" />
                    <p className="text-xl font-bold text-purple-600">
                      {timeToComplete.days} days
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ({timeToComplete.hours} hours at 2h/day)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Completion by Resource Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar data={completionByTypeData} options={barChartOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar data={monthlyCompletionData} options={barChartOptions} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Topic and Difficulty Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Completion by Topic</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar data={completionByTopicData} options={stackedBarChartOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completion by Difficulty</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Doughnut data={completionByDifficultyData} options={doughnutChartOptions} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Completions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Completions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th className="px-6 py-3">Title</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Difficulty</th>
                      <th className="px-6 py-3">Completion Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_completions?.slice(0, 10).map((resource) => (
                      <tr
                        key={resource.id}
                        className="bg-white border-b hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 font-medium">{resource.title}</td>
                        <td className="px-6 py-4 capitalize">{resource.resource_type || '-'}</td>
                        <td className="px-6 py-4 capitalize">{resource.difficulty}</td>
                        <td className="px-6 py-4">
                          {resource.completion_date ?
                            format(parseISO(resource.completion_date), 'MMM dd, yyyy') :
                            '-'
                          }
                        </td>
                      </tr>
                    ))}

                    {(!stats.recent_completions || stats.recent_completions.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                          No recent completions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}