import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/cards'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import { useState } from 'react'
import apiClient from '@/lib/api/client'

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface ReviewStatistics {
  total_concepts: number;
  concepts_due: number;
  concepts_reviewed_today: number;
  concepts_reviewed_week: number;
  average_confidence: number;
  confidence_trend: {
    date: string;
    average_confidence: number;
  }[];
  concept_distribution: {
    new: number;
    learning: number;
    reviewing: number;
    mastered: number;
  };
  topic_distribution: Record<string, number>;
}

export function ReviewStats() {
  const [showTopics, setShowTopics] = useState(false)

  const { data: reviewStats, isLoading, isError, error } = useQuery<ReviewStatistics>({
    queryKey: ['reviewStatistics'],
    queryFn: async () => {
      try {
        console.log('Fetching review statistics');
        const response = await apiClient.get<ReviewStatistics>('/api/reviews/statistics');
        return response.data;
      } catch (error) {
        console.error('Error fetching review stats:', error);
        throw error;
      }
    },
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
  })

  // Prepare data for confidence trend chart
  const confidenceTrendData: ChartData<'line'> = {
    labels: reviewStats?.confidence_trend?.map(item => item.date) || [],
    datasets: [
      {
        label: 'Average Confidence',
        data: reviewStats?.confidence_trend?.map(item => item.average_confidence) || [],
        borderColor: 'rgb(16, 185, 129)', // green-500
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        tension: 0.3,
        fill: true,
      },
    ],
  }

  // Prepare data for concept distribution chart
  const conceptDistributionData: ChartData<'doughnut'> = {
    labels: ['New', 'Learning', 'Reviewing', 'Mastered'],
    datasets: [
      {
        data: reviewStats?.concept_distribution ? [
          reviewStats.concept_distribution.new || 0,
          reviewStats.concept_distribution.learning || 0,
          reviewStats.concept_distribution.reviewing || 0,
          reviewStats.concept_distribution.mastered || 0,
        ] : [0, 0, 0, 0],
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)', // blue
          'rgba(245, 158, 11, 0.7)', // amber
          'rgba(139, 92, 246, 0.7)', // purple
          'rgba(16, 185, 129, 0.7)', // green
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(245, 158, 11)',
          'rgb(139, 92, 246)',
          'rgb(16, 185, 129)',
        ],
        borderWidth: 1,
      },
    ],
  }

  // Prepare data for topic distribution chart
  const topicDistributionData: ChartData<'doughnut'> = {
    labels: reviewStats?.topic_distribution ? Object.keys(reviewStats.topic_distribution) : [],
    datasets: [
      {
        data: reviewStats?.topic_distribution ? Object.values(reviewStats.topic_distribution) : [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)', // blue
          'rgba(139, 92, 246, 0.7)', // purple
          'rgba(16, 185, 129, 0.7)', // green
          'rgba(245, 158, 11, 0.7)', // amber
          'rgba(239, 68, 68, 0.7)', // red
          'rgba(236, 72, 153, 0.7)', // pink
          'rgba(79, 70, 229, 0.7)', // indigo
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(139, 92, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(236, 72, 153)',
          'rgb(79, 70, 229)',
        ],
        borderWidth: 1,
      },
    ],
  }

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
        max: 5,
        title: {
          display: true,
          text: 'Confidence Level'
        }
      },
    },
  }

  const doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Review Statistics</CardTitle>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowTopics(false)}
            className={`px-3 py-1 text-sm rounded-md ${
              !showTopics
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Status
          </button>
          <button
            onClick={() => setShowTopics(true)}
            className={`px-3 py-1 text-sm rounded-md ${
              showTopics
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Topics
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : isError ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-red-700">{error.message}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-blue-700">Total Concepts</p>
                <p className="text-2xl font-bold text-blue-900">
                  {reviewStats?.total_concepts || 0}
                </p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg text-center">
                <p className="text-sm text-amber-700">Due for Review</p>
                <p className="text-2xl font-bold text-amber-900">
                  {reviewStats?.concepts_due || 0}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-green-700">Avg. Confidence</p>
                <p className="text-2xl font-bold text-green-900">
                  {reviewStats?.average_confidence ? reviewStats.average_confidence.toFixed(1) : '0'}/5
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Confidence Trend</h4>
                <div className="h-64">
                  <Line data={confidenceTrendData} options={lineChartOptions} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">
                  {showTopics ? 'Topics Distribution' : 'Concepts by Status'}
                </h4>
                <div className="h-64">
                  {showTopics ? (
                    <Doughnut data={topicDistributionData} options={doughnutChartOptions} />
                  ) : (
                    <Doughnut data={conceptDistributionData} options={doughnutChartOptions} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}