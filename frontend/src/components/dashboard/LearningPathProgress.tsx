import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/cards"
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/api/client"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface PathProgress {
  id: string;
  title: string;
  progress_percentage: number;
  completed_resources: number;
  total_resources: number;
  estimated_completion_date: string;
  next_resource: {
    id: string;
    title: string;
    type: string;
  } | null;
}

// Properly typed fetch function
async function fetchLearningPathProgress(): Promise<PathProgress[]> {
  try {
    console.log('LearningPathProgress: Fetching data');

    // Check if we have a valid token before making the request
    const { getToken } = await import('@/lib/utils/api');
    const token = getToken();

    if (!token) {
      console.warn('LearningPathProgress: No auth token available for request');
      // Try to refresh the token before proceeding
      const authStore = await import('@/lib/store/auth-store');
      const refreshSuccess = await authStore.useAuthStore.getState().refreshAuthToken();

      if (!refreshSuccess) {
        console.error('LearningPathProgress: Failed to refresh token');
        throw new Error('Authentication required');
      }

      console.log('LearningPathProgress: Token refreshed successfully');
    }

    // Use apiClient for consistency
    console.log('LearningPathProgress: Fetching from /api/learning-path/progress endpoint');
    const response = await apiClient.get<PathProgress[]>('/api/learning-path/progress');
    return response.data;
  } catch (error) {
    console.error('Error fetching learning path progress:', error);
    throw error;
  }
}

export function LearningPathProgress() {
  const { data: pathsProgress = [], isLoading } = useQuery<PathProgress[]>({
    queryKey: ['learningPathsProgress'],
    queryFn: fetchLearningPathProgress,
  })

  // Add debugging to check data
  console.log('LearningPathProgress component rendering:', {
    isLoading,
    dataReceived: !!pathsProgress,
    dataLength: Array.isArray(pathsProgress) ? pathsProgress.length : 'not an array',
    rawData: pathsProgress
  });

  // Ensure pathsProgress is always an array even if undefined or null
  const paths = Array.isArray(pathsProgress)
    ? pathsProgress
    : [];

  // Sort paths by progress percentage (descending)
  const sortedPaths = [...paths].sort((a, b) =>
    b.progress_percentage - a.progress_percentage
  )

  // Prepare data for the chart
  const chartData: ChartData<'bar'> = {
    labels: sortedPaths.map(path => path.title),
    datasets: [
      {
        label: 'Progress (%)',
        data: sortedPaths.map(path => path.progress_percentage),
        backgroundColor: sortedPaths.map(path =>
          path.progress_percentage === 100
            ? 'rgba(16, 185, 129, 0.7)' // green for completed
            : path.progress_percentage > 50
              ? 'rgba(59, 130, 246, 0.7)' // blue for good progress
              : 'rgba(245, 158, 11, 0.7)' // amber for less progress
        ),
        borderColor: sortedPaths.map(path =>
          path.progress_percentage === 100
            ? 'rgb(16, 185, 129)'
            : path.progress_percentage > 50
              ? 'rgb(59, 130, 246)'
              : 'rgb(245, 158, 11)'
        ),
        borderWidth: 1,
      },
    ],
  }

  const chartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const path = sortedPaths[context.dataIndex]
            return [
              `Progress: ${path.progress_percentage}%`,
              `Completed: ${path.completed_resources}/${path.total_resources} resources`
            ]
          }
        }
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Completion Percentage'
        }
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Path Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : paths.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No learning paths found</p>
            <Link
              href="/learning-path/create"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create a Learning Path
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="h-64">
              <Bar data={chartData} options={chartOptions} />
            </div>

            <div className="space-y-4 mt-6">
              <h4 className="text-sm font-medium text-gray-500">Next Up in Your Paths</h4>
              {sortedPaths
                .filter(path => path.progress_percentage < 100 && path.next_resource)
                .slice(0, 3)
                .map(path => (
                  <div key={path.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                    <div className="p-2 rounded-full bg-blue-100 mr-3">
                      <ClockIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {path.next_resource?.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        From: {path.title} • {path.progress_percentage}% complete
                      </p>
                    </div>
                    <Link
                      href={`/resources/${path.next_resource?.type}/${path.next_resource?.id}`}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      Start
                    </Link>
                  </div>
                ))}

              {sortedPaths.some(path => path.progress_percentage === 100) && (
                <div className="flex items-center p-3 border rounded-lg bg-green-50">
                  <div className="p-2 rounded-full bg-green-100 mr-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900">
                      {sortedPaths.filter(path => path.progress_percentage === 100).length} path(s) completed!
                    </p>
                    <p className="text-xs text-green-700">
                      Great job completing your learning goals
                    </p>
                  </div>
                </div>
              )}

              {sortedPaths.length === 0 && (
                <div className="flex items-center p-3 border rounded-lg bg-amber-50">
                  <div className="p-2 rounded-full bg-amber-100 mr-3">
                    <XCircleIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-900">
                      No active learning paths
                    </p>
                    <p className="text-xs text-amber-700">
                      Create a learning path to track your progress
                    </p>
                  </div>
                  <Link
                    href="/learning-path/create"
                    className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200"
                  >
                    Create
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}