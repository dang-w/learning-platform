import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/cards'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from 'chart.js'
import { resourcesApi } from '@/lib/api'
import { ResourceStats as ResourceStatsType } from '@/types/resources'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

// Helper function to adapt API response to expected component format
const adaptResourceStats = (apiStats: unknown): ResourceStatsType => {
  const stats = apiStats as Record<string, unknown>;

  // If we already have the expected format, return as is
  if (stats?.articles && stats?.videos) {
    return stats as unknown as ResourceStatsType;
  }

  // Otherwise adapt from the ResourceStatistics format to ResourceStats format
  const result: ResourceStatsType = {
    articles: {
      completed: 0,
      in_progress: 0,
      total: 0
    },
    videos: {
      completed: 0,
      in_progress: 0,
      total: 0
    },
    courses: {
      completed: 0,
      in_progress: 0,
      total: 0
    },
    books: {
      completed: 0,
      in_progress: 0,
      total: 0
    },
    total_completed: 0,
    total_in_progress: 0,
    total_resources: 0
  };

  // If we have the new API format, extract data from it
  if (stats?.by_type) {
    // Map from new format to expected format
    Object.entries(stats.by_type as Record<string, unknown>).forEach(([type, data]) => {
      if (type in result) {
        const typeKey = type as keyof Pick<ResourceStatsType, 'articles' | 'videos' | 'courses' | 'books'>;
        const typeData = data as Record<string, number>;

        result[typeKey] = {
          completed: typeData.completed || 0,
          in_progress: typeData.total - (typeData.completed || 0),
          total: typeData.total || 0
        };
      }
    });

    // Set totals
    result.total_completed = Number(stats.completed) || 0;
    result.total_in_progress = Number(stats.total || 0) - Number(stats.completed || 0);
    result.total_resources = Number(stats.total) || 0;
  }

  console.log('Adapted resource stats:', result);
  return result;
};

export function ResourceStats() {
  const { data: apiStats, isLoading } = useQuery({
    queryKey: ['resourceStats'],
    queryFn: () => {
      console.log('ResourceStats component: Fetching statistics');
      return resourcesApi.getStatistics();
    },
  });

  // Adapt the API response to the expected format
  const stats = adaptResourceStats(apiStats || {});

  console.log('ResourceStats component rendering:', {
    isLoading,
    hasData: !!stats,
    stats
  });

  const chartData: ChartData<'bar'> = {
    labels: ['Articles', 'Videos', 'Courses', 'Books'],
    datasets: [
      {
        label: 'Completed',
        data: [
          stats.articles?.completed || 0,
          stats.videos?.completed || 0,
          stats.courses?.completed || 0,
          stats.books?.completed || 0,
        ],
        backgroundColor: 'rgb(34, 197, 94)', // green-500
      },
      {
        label: 'In Progress',
        data: [
          stats.articles?.in_progress || 0,
          stats.videos?.in_progress || 0,
          stats.courses?.in_progress || 0,
          stats.books?.in_progress || 0,
        ],
        backgroundColor: 'rgb(59, 130, 246)', // blue-500
      },
    ],
  }

  return (
    <Card data-testid="resource-stats">
      <CardHeader>
        <CardTitle>Resource Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
              },
              scales: {
                x: {
                  stacked: true,
                },
                y: {
                  stacked: true,
                  beginAtZero: true,
                },
              },
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {stats.total_completed || 0}
            </p>
            <p className="text-sm text-gray-500">Total Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {stats.total_in_progress || 0}
            </p>
            <p className="text-sm text-gray-500">In Progress</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}