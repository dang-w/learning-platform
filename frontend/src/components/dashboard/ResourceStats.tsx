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
import { fetchResourceStats } from '@/lib/api/resources'
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

export function ResourceStats() {
  const { data: stats = {} as ResourceStatsType } = useQuery({
    queryKey: ['resourceStats'],
    queryFn: fetchResourceStats,
  })

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
    <Card>
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