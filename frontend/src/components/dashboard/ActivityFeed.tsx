import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/cards'
import progressApi from '@/lib/api/progress'
import { formatDistanceToNow } from 'date-fns'
import {
  CheckCircleIcon,
  PlayIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { LearningProgress } from '@/types/progress'

type ActivityType = 'completion' | 'start' | 'review';

const activityIcons = {
  completion: CheckCircleIcon,
  start: PlayIcon,
  review: ClockIcon,
}

const activityColors = {
  completion: 'text-green-600 bg-green-100',
  start: 'text-blue-600 bg-blue-100',
  review: 'text-purple-600 bg-purple-100',
}

interface Activity {
  id: string;
  type: ActivityType;
  resource_id: string;
  resource_title: string;
  timestamp: string;
}

export function ActivityFeed() {
  const { data: progress = {} as LearningProgress } = useQuery({
    queryKey: ['learningProgress'],
    queryFn: progressApi.fetchLearningProgress,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {progress.recent_activity?.map((activity: Activity) => {
            const Icon = activityIcons[activity.type]
            const colorClass = activityColors[activity.type]

            return (
              <div
                key={activity.id}
                className="flex items-start space-x-3"
              >
                <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.type === 'completion' && 'Completed'}
                    {activity.type === 'start' && 'Started'}
                    {activity.type === 'review' && 'Reviewed'}
                    {' '}
                    <span className="font-normal">
                      {activity.resource_title}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            )
          })}

          {(!progress.recent_activity || progress.recent_activity.length === 0) && (
            <p className="text-sm text-gray-500 text-center py-4">
              No recent activity
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}