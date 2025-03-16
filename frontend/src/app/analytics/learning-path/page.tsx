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
import { ArrowPathIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import learningPathApi from '@/lib/api/learning-path';
import { Goal } from '@/lib/api/learning-path';

// Define the missing types
interface ProgressHistoryEntry {
  date: string;
  progress: number;
}

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

export default function LearningPathAnalyticsPage() {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Fetch learning path progress
  const { data: pathProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['learningPathProgress'],
    queryFn: () => learningPathApi.getLearningPathProgress(),
  });

  // Fetch goals
  const { data: goals = [], isLoading: isLoadingGoals } = useQuery({
    queryKey: ['goals'],
    queryFn: () => learningPathApi.getGoals(),
  });

  // Fetch milestones
  const { data: milestones = [], isLoading: isLoadingMilestones } = useQuery({
    queryKey: ['milestones'],
    queryFn: () => learningPathApi.getMilestones(),
  });

  // Fetch roadmap
  const { data: roadmap, isLoading: isLoadingRoadmap } = useQuery({
    queryKey: ['roadmap'],
    queryFn: () => learningPathApi.getRoadmap(),
  });

  const isLoading = isLoadingProgress || isLoadingGoals || isLoadingMilestones || isLoadingRoadmap;

  // Process data for goal completion chart
  const goalCompletionData: ChartData<'doughnut'> = {
    labels: ['Completed', 'In Progress', 'Not Started'],
    datasets: [
      {
        data: [
          goals.filter(goal => goal.completed).length,
          goals.filter(goal => !goal.completed && ((goal as Goal & { progress?: number })?.progress ?? 0) > 0).length,
          goals.filter(goal => !goal.completed && ((goal as Goal & { progress?: number })?.progress ?? 0) === 0).length,
        ],
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

  // Process data for milestone completion chart
  const milestoneCompletionData: ChartData<'doughnut'> = {
    labels: ['Completed', 'In Progress', 'Not Started'],
    datasets: [
      {
        data: [
          milestones.filter(milestone => milestone.completed).length,
          milestones.filter(milestone => !milestone.completed && ((milestone as { progress?: number })?.progress ?? 0) > 0).length,
          milestones.filter(milestone => !milestone.completed && ((milestone as { progress?: number })?.progress ?? 0) === 0).length,
        ],
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

  // Process data for roadmap progress chart
  const roadmapProgressData: ChartData<'bar'> = {
    labels: roadmap?.phases?.map(phase => phase.title) || [],
    datasets: [
      {
        label: 'Completion Percentage',
        data: roadmap?.phases?.map(phase => {
          if (!phase.items) return 0;
          const completedItems = phase.items.filter(item => item.completed).length;
          return (completedItems / phase.items.length) * 100;
        }) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.7)', // blue
      },
    ],
  };

  // Helper function to get progress history from goal
  const getProgressHistory = (goal: Goal): ProgressHistoryEntry[] => {
    return (goal as Goal & { progress_history?: ProgressHistoryEntry[] }).progress_history || [];
  };

  // Process data for goal progress over time
  const goalProgressData: ChartData<'line'> = {
    labels: goals
      .filter(goal => getProgressHistory(goal).length > 0)
      .flatMap(goal => getProgressHistory(goal).map((entry: ProgressHistoryEntry) => format(parseISO(entry.date), 'MMM dd')))
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
    datasets: goals
      .filter(goal => selectedGoalId ? goal.id === selectedGoalId : true)
      .filter(goal => getProgressHistory(goal).length > 0)
      .slice(0, 5) // Limit to 5 goals for readability
      .map(goal => ({
        label: goal.title,
        data: getProgressHistory(goal).map((entry: ProgressHistoryEntry) => entry.progress),
        borderColor: getRandomColor(),
        backgroundColor: 'transparent',
        tension: 0.3,
      })),
  };

  // Chart options
  const doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.formattedValue}% completed`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Completion Percentage',
        },
      },
    },
  };

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
        max: 100,
        title: {
          display: true,
          text: 'Progress Percentage',
        },
      },
    },
  };

  // Helper function to generate random colors for chart
  function getRandomColor() {
    const colors = [
      'rgb(59, 130, 246)', // blue
      'rgb(139, 92, 246)', // purple
      'rgb(16, 185, 129)', // green
      'rgb(245, 158, 11)', // amber
      'rgb(239, 68, 68)', // red
      'rgb(236, 72, 153)', // pink
      'rgb(79, 70, 229)', // indigo
      'rgb(14, 165, 233)', // sky
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

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
          <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Overall Progress Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-blue-600 font-medium">Overall Progress</p>
                  <p className="text-4xl font-bold mt-2">
                    {pathProgress?.goals?.completion_percentage || 0}%
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-green-600 font-medium">Goals Completed</p>
                  <p className="text-4xl font-bold mt-2">
                    {pathProgress?.goals?.completed || 0}/{pathProgress?.goals?.total || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-amber-600 font-medium">Milestones Completed</p>
                  <p className="text-4xl font-bold mt-2">
                    {pathProgress?.milestones?.completed || 0}/{pathProgress?.milestones?.total || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-purple-600 font-medium">Roadmap Phases</p>
                  <p className="text-4xl font-bold mt-2">{roadmap?.phases.length || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Goal Completion Status</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <Doughnut data={goalCompletionData} options={doughnutChartOptions} />
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle>Milestone Completion Status</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <Doughnut data={milestoneCompletionData} options={doughnutChartOptions} />
              </CardContent>
            </Card>

            <Card className="h-full lg:col-span-2">
              <CardHeader>
                <CardTitle>Roadmap Progress by Phase</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <Bar data={roadmapProgressData} options={barChartOptions} />
              </CardContent>
            </Card>

            <Card className="h-full lg:col-span-2">
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <CardTitle>Goal Progress Over Time</CardTitle>
                <select
                  value={selectedGoalId || ''}
                  onChange={(e) => setSelectedGoalId(e.target.value || null)}
                  className="mt-2 sm:mt-0 px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Goals</option>
                  {goals
                    .filter(goal => getProgressHistory(goal).length > 0)
                    .map(goal => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                </select>
              </CardHeader>
              <CardContent className="h-80">
                {goalProgressData.datasets.length > 0 ? (
                  <Line data={goalProgressData} options={lineChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No progress history available for selected goals</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              {pathProgress?.milestones?.upcoming && pathProgress.milestones.upcoming.length > 0 ? (
                <div className="space-y-4">
                  {pathProgress.milestones.upcoming.map((achievement, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="p-2 rounded-full bg-amber-100">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-500 text-white font-bold">
                          M
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium">{achievement.title}</h3>
                        <p className="text-sm text-gray-500">
                          Milestone with target date {format(parseISO(achievement.target_date), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No upcoming milestones found.</p>
                  <p className="mt-2">Complete goals and milestones to track your progress.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}