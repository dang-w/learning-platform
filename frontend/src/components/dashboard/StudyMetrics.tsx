import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/cards'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import progressApi from '@/lib/api/progress'
import { useState } from 'react'
import { format, subDays } from 'date-fns'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

export function StudyMetrics() {
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days'>('7days')

  const { data: metricsSummary, isLoading } = useQuery({
    queryKey: ['metricsSummary', timeRange],
    queryFn: () => progressApi.getRecentMetricsSummary(
      timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90
    ),
  })

  const { data: metrics } = useQuery({
    queryKey: ['metrics', timeRange],
    queryFn: () => {
      const endDate = format(new Date(), 'yyyy-MM-dd')
      const startDate = format(
        subDays(
          new Date(),
          timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90
        ),
        'yyyy-MM-dd'
      )
      return progressApi.getMetrics(startDate, endDate)
    },
  })

  // Prepare data for study hours chart
  const studyHoursData: ChartData<'line'> = {
    labels: metrics?.map(metric => format(new Date(metric.date), 'MMM dd')) || [],
    datasets: [
      {
        label: 'Study Hours',
        data: metrics?.map(metric => metric.study_hours) || [],
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
        fill: true,
      },
    ],
  }

  // Prepare data for focus score chart
  const focusScoreData: ChartData<'line'> = {
    labels: metrics?.map(metric => format(new Date(metric.date), 'MMM dd')) || [],
    datasets: [
      {
        label: 'Focus Score',
        data: metrics?.map(metric => metric.focus_score) || [],
        borderColor: 'rgb(139, 92, 246)', // purple-500
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        tension: 0.3,
        fill: true,
      },
    ],
  }

  // Prepare topic distribution data
  const topicData = metrics?.reduce((acc: Record<string, number>, metric) => {
    const topics = metric.topics.split(',').map(t => t.trim())
    topics.forEach(topic => {
      if (topic) {
        acc[topic] = (acc[topic] || 0) + metric.study_hours
      }
    })
    return acc
  }, {})

  const topicChartData: ChartData<'bar'> = {
    labels: topicData ? Object.keys(topicData).slice(0, 5) : [],
    datasets: [
      {
        label: 'Hours Spent',
        data: topicData ? Object.values(topicData).slice(0, 5) : [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)', // blue
          'rgba(139, 92, 246, 0.7)', // purple
          'rgba(16, 185, 129, 0.7)', // green
          'rgba(245, 158, 11, 0.7)', // amber
          'rgba(239, 68, 68, 0.7)', // red
        ],
      },
    ],
  }

  const chartOptions: ChartOptions<'line'> = {
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
      },
    },
  }

  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} hours`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Hours'
        }
      },
    },
  }

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Study Metrics</CardTitle>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === '7days'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30days')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === '30days'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('90days')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === '90days'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            90 Days
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-blue-700">Total Study Hours</p>
                <p className="text-2xl font-bold text-blue-900">
                  {metricsSummary?.total_hours.toFixed(1) || 0}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <p className="text-sm text-purple-700">Average Focus</p>
                <p className="text-2xl font-bold text-purple-900">
                  {metricsSummary?.average_focus.toFixed(1) || 0}/10
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-green-700">Streak</p>
                <p className="text-2xl font-bold text-green-900">
                  {metricsSummary?.streak_days || 0} days
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Study Hours</h4>
                <div className="h-64">
                  <Line data={studyHoursData} options={chartOptions} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Focus Score</h4>
                <div className="h-64">
                  <Line data={focusScoreData} options={chartOptions} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Top Topics</h4>
              <div className="h-64">
                <Bar data={topicChartData} options={barChartOptions} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}