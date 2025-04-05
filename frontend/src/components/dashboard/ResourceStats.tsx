import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { useResourceStore } from '@/lib/store/resource-store'
import { ResourceStats as ResourceStatsType } from '@/types/resource'
import { Spinner } from '../ui/feedback/spinner'
import { Alert } from '../ui/feedback/alert'
import { useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/cards'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

// Define the specific resource type keys expected in ResourceStatsType
const resourceStatKeys: Array<keyof Omit<ResourceStatsType, 'total_completed' | 'total_in_progress' | 'total_resources' | 'completion_percentage' | 'by_topic' | 'by_difficulty' | 'recent_completions'>> = [
  'articles', 'videos', 'courses', 'books', 'documentation', 'tool', 'other'
];

// Helper function to safely get a number, defaulting to 0 if NaN or invalid
const safeGetNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
};

export const ResourceStats = () => {
  // Use Zustand store for statistics
  const { statistics, isLoading, error, fetchStatistics } = useResourceStore()

  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

  if (isLoading) return <Spinner />
  if (error) return <Alert variant="error">{error}</Alert>
  // Ensure statistics object exists and has the expected total properties before proceeding
  if (!statistics || typeof statistics.total_resources !== 'number' || typeof statistics.total_completed !== 'number') {
      // Check if total_in_progress exists and is a number, or fallback calculation is possible
      const inProgressValid = typeof statistics?.total_in_progress === 'number' ||
                              (typeof statistics?.total_resources === 'number' && typeof statistics?.total_completed === 'number');
      if (!inProgressValid) {
          return <Alert variant="info">Statistics data is incomplete.</Alert>;
      }
      // If only total_in_progress was initially missing but calculable, proceed carefully
      // (or potentially show an incomplete state message here too)
  }


  // Safely get aggregate statistics
  const totalResources = safeGetNumber(statistics.total_resources);
  const totalCompleted = safeGetNumber(statistics.total_completed);
  // Calculate total in progress safely, handling potential NaN from subtraction if inputs were invalid originally
  const totalInProgress = safeGetNumber(
    statistics.total_in_progress ?? (totalResources - totalCompleted)
  );


  const typeChartData = {
    labels: resourceStatKeys.map(type => type.charAt(0).toUpperCase() + type.slice(1)),
    datasets: [
      {
        label: 'Completed',
        // Safely get completed count for each type
        data: resourceStatKeys.map(type => safeGetNumber(statistics[type]?.completed)),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'In Progress',
        // Safely calculate in-progress count for each type
        data: resourceStatKeys.map(type => {
          const typeStats = statistics[type];
          const typeTotal = safeGetNumber(typeStats?.total);
          const typeCompleted = safeGetNumber(typeStats?.completed);
          // Prioritize explicit in_progress, fallback to calculation, ensure result is not NaN
          return safeGetNumber(typeStats?.in_progress ?? (typeTotal - typeCompleted));
        }),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
    ],
  }

  return (
    // Add data-testid for easier selection in tests, if not already present elsewhere
    <Card data-testid="resource-stats">
      <CardHeader>
        <CardTitle>Resources Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
          <div>
            <p className="text-sm font-medium text-gray-500">Total</p>
            {/* Display safely obtained numbers */}
            <p className="text-2xl font-bold text-gray-900">{totalResources}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{totalCompleted}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">
              {/* Display safely calculated/obtained in-progress number */}
              {totalInProgress}
            </p>
          </div>
        </div>
        {/* Ensure chart container has a test id if needed */}
        <div className="h-64" data-testid="resource-stats-chart-container">
          <Bar
            data={typeChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: {
                  stacked: true,
                },
                y: {
                  stacked: true,
                },
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}