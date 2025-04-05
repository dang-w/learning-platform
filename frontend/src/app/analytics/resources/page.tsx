'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import resourcesApi from '@/lib/api/resources';
import { ResourceStats, DifficultyLevel } from '@/types/resource';
import { ChevronLeftIcon, BookOpenIcon, ClockIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Spinner } from '@/components/ui/feedback/spinner';
import { Alert } from '@/components/ui/feedback/alert';

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

// Define the specific resource type keys expected in ResourceStats
const resourceStatKeys: Array<keyof Omit<ResourceStats, 'total_completed' | 'total_in_progress' | 'total_resources' | 'completion_percentage' | 'by_topic' | 'by_difficulty' | 'recent_completions'>> = [
  'articles', 'videos', 'courses', 'books', 'documentation', 'tool', 'other'
];

export default function ResourceAnalyticsPage() {
  // Fetch resource statistics using the imported ResourceStats type
  const { data: stats, isLoading, error } = useQuery<ResourceStats>({
    queryKey: ['resourceStats'],
    queryFn: resourcesApi.getStatistics,
  });

  // Prepare data for the resource type chart
  const typeLabels = resourceStatKeys.map(label => label.charAt(0).toUpperCase() + label.slice(1));
  const typeData = {
    labels: typeLabels,
    datasets: [
      {
        label: 'Total Resources',
        data: resourceStatKeys.map(key => stats?.[key]?.total ?? 0),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
      {
        label: 'Completed Resources',
        data: resourceStatKeys.map(key => stats?.[key]?.completed ?? 0),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };

  // Prepare data for the difficulty chart
  const difficultyLevels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
  const difficultyData = {
    labels: difficultyLevels.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
    datasets: [
      {
        data: difficultyLevels.map(level => stats?.by_difficulty?.[level]?.total ?? 0),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)', // Added color for expert
        ],
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

  const doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  if (error) {
    return <Alert variant="error">Failed to load statistics: {error.message}</Alert>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Resource Analytics</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner />
          </div>
        ) : !stats ? (
          <Alert variant="warning">No statistics data available.</Alert>
        ) : (
          <div className="space-y-6">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                <dt className="text-sm font-medium text-gray-500 truncate flex items-center">
                  <BookOpenIcon className="h-5 w-5 mr-1 text-blue-500" />
                  Total Resources
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {stats.total_resources}
                </dd>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                <dt className="text-sm font-medium text-gray-500 truncate flex items-center">
                  <BookOpenIcon className="h-5 w-5 mr-1 text-green-500" />
                  Completed Resources
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {stats.total_completed} ({Math.round(stats.completion_percentage ?? 0)}%)
                </dd>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                <dt className="text-sm font-medium text-gray-500 truncate flex items-center">
                  <ClockIcon className="h-5 w-5 mr-1 text-yellow-500" />
                  In Progress
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {stats.total_in_progress ?? (stats.total_resources - stats.total_completed)}
                </dd>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Resources by Type</h3>
                <div className="h-80">
                  <Bar data={typeData} options={barChartOptions} />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Resources by Difficulty</h3>
                <div className="h-80 flex justify-center items-center">
                  <Doughnut data={difficultyData} options={doughnutChartOptions} />
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}