import { Card, CardHeader, CardTitle, CardContent } from '../ui/cards'
import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
} from 'chart.js'
import { useQuery } from '@tanstack/react-query'
import progressApi from '@/lib/api/progress'
import { LearningProgress as LearningProgressType } from '@/types/progress'

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend)

export function LearningProgress() {
  const { data: progress = {} as LearningProgressType } = useQuery({
    queryKey: ['learningProgress'],
    queryFn: progressApi.fetchLearningProgress,
  })

  const chartData: ChartData<'doughnut'> = {
    labels: ['Completed', 'In Progress', 'Not Started'],
    datasets: [
      {
        data: [
          progress.completed || 0,
          progress.in_progress || 0,
          progress.not_started || 0,
        ],
        backgroundColor: [
          'rgb(34, 197, 94)', // green-500
          'rgb(59, 130, 246)', // blue-500
          'rgb(229, 231, 235)', // gray-200
        ],
        borderColor: [
          'rgb(22, 163, 74)', // green-600
          'rgb(37, 99, 235)', // blue-600
          'rgb(209, 213, 219)', // gray-300
        ],
        borderWidth: 1,
      },
    ],
  }

  const totalResources = (progress.completed || 0) +
    (progress.in_progress || 0) +
    (progress.not_started || 0)

  const completionPercentage = totalResources > 0
    ? Math.round((progress.completed || 0) / totalResources * 100)
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="w-48 h-48 relative mb-4">
            <Doughnut
              data={chartData}
              options={{
                cutout: '75%',
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold">{completionPercentage}%</p>
                <p className="text-sm text-gray-500">Complete</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full text-center">
            <div>
              <p className="text-xl font-semibold text-green-600">
                {progress.completed || 0}
              </p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-blue-600">
                {progress.in_progress || 0}
              </p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-600">
                {progress.not_started || 0}
              </p>
              <p className="text-sm text-gray-500">Not Started</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}