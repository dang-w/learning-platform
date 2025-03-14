export interface LearningProgress {
  completed: number
  in_progress: number
  not_started: number
  total_resources: number
  completion_percentage: number
  recent_completions: {
    id: string
    title: string
    completion_date: string
  }[]
  recent_activity: {
    id: string
    type: 'completion' | 'start' | 'review'
    resource_id: string
    resource_title: string
    timestamp: string
  }[]
}