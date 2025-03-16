'use client';

import { useState } from 'react';
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
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';
import { ArrowPathIcon, ChevronLeftIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
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
  Tooltip,
  Legend,
  Filler
);

// Types for learning path data
interface Goal {
  id: string;
  title: string;
  description: string;
  target_date: string;
  priority: number;
  category: string;
  completed: boolean;
  completion_date: string | null;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  target_date: string;
  completed: boolean;
  completion_date: string | null;
  associated_goals: string[];
}

interface LearningPathProgress {
  goals_completed: number;
  goals_in_progress: number;
  total_goals: number;
  milestones_completed: number;
  milestones_in_progress: number;
  total_milestones: number;
  completion_percentage: number;
  milestone_completion_percentage: number;
  recent_completions: {
    id: string;
    title: string;
    type: 'goal' | 'milestone';
    completion_date: string;
  }[];
  category_distribution: Record<string, number>;
  priority_distribution: Record<string, number>;
  completion_timeline: {
    date: string;
    completed_count: number;
  }[];
}

export default function LearningPathAnalyticsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch learning path progress data
  const { data: progressData, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['learningPathProgress'],
    queryFn: async () => {
      const response = await apiClient.get<LearningPathProgress>('/api/learning-path/progress');
      return response.data;
    },
  });

  // Fetch goals
  const { data: goals = [], isLoading: isLoadingGoals } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const response = await apiClient.get<Goal[]>('/api/learning-path/goals');
      return response.data;
    },
  });

  // Fetch milestones - only loading state is used
  const { isLoading: isLoadingMilestones } = useQuery({
    queryKey: ['milestones'],
    queryFn: async () => {
      const response = await apiClient.get<Milestone[]>('/api/learning-path/milestones');
      return response.data;
    },
  });

  // Process data for category distribution chart
  const categoryDistributionData: ChartData<'doughnut'> = {
    labels: progressData?.category_distribution ? Object.keys(progressData.category_distribution) : [],
    datasets: [
      {
        data: progressData?.category_distribution ? Object.values(progressData.category_distribution) : [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(236, 72, 153, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(239, 68, 68, 0.7)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)',
          'rgb(245, 158, 11)',
          'rgb(16, 185, 129)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Process data for priority distribution chart
  const priorityDistributionData: ChartData<'bar'> = {
    labels: progressData?.priority_distribution ? Object.keys(progressData.priority_distribution) : [],
    datasets: [
      {
        label: 'Number of Goals',
        data: progressData?.priority_distribution ? Object.values(progressData.priority_distribution) : [],
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  // Process data for completion timeline chart
  const completionTimelineData: ChartData<'line'> = {
    labels: progressData?.completion_timeline?.map(item => format(parseISO(item.date), 'MMM dd')) || [],
    datasets: [
      {
        label: 'Completed Items',
        data: progressData?.completion_timeline?.map(item => item.completed_count) || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  // Chart options
  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Goals',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Priority Level',
        },
      },
    },
  };

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Completed Count',
        },
      },
    },
  };

  // Filter goals by category
  const filteredGoals = selectedCategory === 'all'
    ? goals
    : goals.filter(goal => goal.category === selectedCategory);

  // Get unique categories
  const categories = ['all', ...new Set(goals.map(goal => goal.category))];

  const isLoading = isLoadingProgress || isLoadingGoals || isLoadingMilestones;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/analytics" className="text-gray-500 hover:text-gray-700">
              <ChevronLeftIcon className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">Learning Path Analytics</h1>
          </div>
          <p className="text-gray-500 mt-2">
            Track your progress through custom learning paths and roadmaps
          </p>
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
                <CardTitle className="text-sm font-medium text-gray-500">Overall Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {progressData?.completion_percentage ? `${Math.round(progressData.completion_percentage)}%` : '0%'}
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${progressData?.completion_percentage || 0}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Goals Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {progressData?.goals_completed || 0}/{progressData?.total_goals || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {progressData?.goals_in_progress || 0} in progress
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Milestones Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {progressData?.milestones_completed || 0}/{progressData?.total_milestones || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {progressData?.milestones_in_progress || 0} in progress
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Recent Completions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {progressData?.recent_completions?.length || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  in the last 30 days
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Doughnut data={categoryDistributionData} options={doughnutOptions} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar data={priorityDistributionData} options={barOptions} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Completion Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Line data={completionTimelineData} options={lineOptions} />
              </div>
            </CardContent>
          </Card>

          {/* Goals List */}
          <Card className="mb-8">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <CardTitle>Goals</CardTitle>
              <div className="mt-2 sm:mt-0">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredGoals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Title</th>
                        <th className="text-left py-3 px-4">Category</th>
                        <th className="text-left py-3 px-4">Priority</th>
                        <th className="text-left py-3 px-4">Target Date</th>
                        <th className="text-left py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGoals.map((goal) => (
                        <tr key={goal.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{goal.title}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {goal.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <span>{goal.priority}/10</span>
                              <div className="ml-2 w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full"
                                  style={{ width: `${(goal.priority / 10) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">{format(parseISO(goal.target_date), 'MMM dd, yyyy')}</td>
                          <td className="py-3 px-4">
                            {goal.completed ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                In Progress
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ArrowTrendingUpIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p>No goals found for the selected category.</p>
                  <p className="mt-2">Try selecting a different category or create new goals.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Completions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Completions</CardTitle>
            </CardHeader>
            <CardContent>
              {progressData?.recent_completions && progressData.recent_completions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Title</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Completion Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progressData.recent_completions.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{item.title}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                item.type === 'goal'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {item.type === 'goal' ? 'Goal' : 'Milestone'}
                            </span>
                          </td>
                          <td className="py-3 px-4">{format(parseISO(item.completion_date), 'MMM dd, yyyy')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ArrowTrendingUpIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p>No recent completions found.</p>
                  <p className="mt-2">Complete goals or milestones to see them here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}