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

interface ActivityFeedProps {
  compact?: boolean;
}

export function ActivityFeed({ compact = false }: ActivityFeedProps) {
  const { data: progress = {} as LearningProgress } = useQuery({
    queryKey: ['learningProgress'],
    queryFn: progressApi.fetchLearningProgress,
  })

  const activities: Activity[] = progress.recent_activity || []

  // Display fewer activities in compact mode
  const displayActivities = compact ? activities.slice(0, 3) : activities

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{compact ? 'Recent Activity' : 'Activity Feed'}</CardTitle>
      </CardHeader>
      <CardContent>
        {displayActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recent activity found
          </div>
        ) : (
          <div className={`space-y-4 ${compact ? 'max-h-[240px]' : 'max-h-[450px]'} overflow-y-auto`}>
            {displayActivities.map((activity) => {
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}